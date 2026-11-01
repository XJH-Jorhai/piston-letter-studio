const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base=process.env.BASE_URL||'http://127.0.0.1:4174/';
const approved=JSON.parse(fs.readFileSync(path.join(root,'assets/presets/minecraft-original-0.94s.json'))).config;
(async()=>{
  const results=[];
  for(const policy of ['no-user-gesture-required','document-user-activation-required']){
    const options={headless:true,args:['--mute-audio','--enable-unsafe-swiftshader','--autoplay-policy='+policy,'--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies']};
    const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';if(process.platform==='win32'&&fs.existsSync(edge))options.executablePath=edge;
    const browser=await chromium.launch(options),page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'no-preference'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // A prior installation's cached configuration must not replace the frozen default.
    await page.addInitScript(()=>localStorage.setItem('piston-letter-studio:config',JSON.stringify({mode:'letters',period:4,letters:{top:'A'}})));
    await page.goto(base);await page.waitForFunction(()=>window.pistonStudio?.animation._renderer&&document.getElementById('music-player').readyState>=1);
    assert.deepEqual(await page.evaluate(()=>pistonStudio.config),approved);
    assert.equal(await page.evaluate(()=>pistonStudio.animation.playing),true);
    assert.equal(await page.locator('#music-player').evaluate(a=>a.autoplay),true);
    if(policy==='document-user-activation-required'){
      assert.equal(await page.locator('#music-player').evaluate(a=>a.paused),true);
      await page.locator('h1').click();
    }
    await page.waitForFunction(()=>{const a=document.getElementById('music-player');return !a.paused&&a.currentTime>.05;});
    await page.locator('#music-player').evaluate(a=>a.pause());await page.click('#tab-library');
    await page.waitForTimeout(150);assert.equal(await page.locator('#music-player').evaluate(a=>a.paused),true);
    await page.click('#tab-studio');await page.fill('#period-number','1.1');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('piston-letter-studio:config:v1.2.0')||'null')?.period===1.1);
    await page.reload();await page.waitForFunction(()=>window.pistonStudio?.animation._renderer);
    assert.equal(await page.evaluate(()=>pistonStudio.config.period),1.1);
    assert.deepEqual(await page.evaluate(()=>pistonStudio.config.curve),approved.curve);
    if(policy==='document-user-activation-required'){
      const native=await browser.newPage();
      native.on('pageerror',e=>errors.push(e.message));await native.goto(base);
      await native.waitForFunction(()=>document.getElementById('music-player').readyState>=1);
      await native.locator('#music-player').click({position:{x:20,y:22}});
      await native.waitForFunction(()=>!document.getElementById('music-player').paused);
      await native.close();
    }
    assert.deepEqual(errors,[]);await browser.close();results.push({policy,exactDefault:true,animationPlaying:true,musicPlaying:true,manualPauseRespected:true,settingsPersist:true,errors});
  }
  console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1);});
