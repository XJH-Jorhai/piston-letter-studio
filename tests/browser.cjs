const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.test-results'),base=process.env.BASE_URL||'http://127.0.0.1:4174/';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const options={headless:true,args:['--enable-unsafe-swiftshader']},edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';if(process.platform==='win32'&&fs.existsSync(edge))options.executablePath=edge;
 const browser=await chromium.launch(options),page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(!r.url().startsWith('blob:'))errors.push(r.failure().errorText+': '+r.url());});
 await page.goto(base);await page.waitForFunction(()=>window.pistonStudio?.animation._renderer);await page.evaluate(()=>pistonStudio.animation.pause());
 const initial=await page.evaluate(()=>pistonStudio.config);assert.equal(initial.period,.67);assert.equal(initial.stroke,160);
 await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});
 for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
   await page.evaluate(async l=>{const cfg=pistonStudio.config;cfg.letters={top:l,body:l,left:l,right:l};await pistonStudio.setConfig(cfg);pistonStudio.animation.renderAt(.55);},letter);
 }
 await page.selectOption('[data-slot=top]','C');await page.selectOption('[data-slot=body]','M');await page.selectOption('[data-slot=left]','G');await page.selectOption('[data-slot=right]','T');
 await page.evaluate(()=>pistonStudio.animation.ready);
 let config=await page.evaluate(()=>pistonStudio.config);assert.deepEqual(config.letters,{top:'C',body:'M',left:'G',right:'T'});
 await page.selectOption('[data-field=node]','3');let grip=page.locator('#curve-editor [data-node="3"][data-kind="out"]'),box=await grip.boundingBox();
 const old=await page.evaluate(()=>pistonStudio.curve.points[3].out.v);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+12,{steps:4});await page.mouse.up();
 assert.ok((await page.evaluate(()=>pistonStudio.curve.points[3].out.v))<old-.02);
 await page.evaluate(async c=>pistonStudio.setConfig(c),initial);
 await page.selectOption('#background','transparent');await page.evaluate(()=>pistonStudio.animation.ready);
 const gifDownload=page.waitForEvent('download');await page.click('#export-gif');const gif=await gifDownload;await gif.saveAs(path.join(out,'current.gif'));
 assert.equal(fs.readFileSync(path.join(out,'current.gif')).subarray(0,6).toString(),'GIF89a');await page.waitForFunction(()=>!document.getElementById('export-gif').disabled);
 const htmlDownload=page.waitForEvent('download');await page.click('#export-html');const html=await htmlDownload;const htmlPath=path.join(out,'standalone.html');await html.saveAs(htmlPath);
 const offline=await browser.newContext({offline:true}),embed=await offline.newPage();embed.on('pageerror',e=>errors.push('export: '+e.message));await embed.goto('file:///'+htmlPath.replace(/\\/g,'/'));await embed.waitForFunction(()=>document.querySelector('piston-letters')?._renderer);
 assert.deepEqual(await embed.evaluate(()=>document.querySelector('piston-letters').config.letters),initial.letters);await embed.screenshot({path:path.join(out,'standalone-offline.png')});await offline.close();
 const multi=await page.evaluate(async()=>{const two=document.createElement('piston-letters');two.style.width='160px';two.config={letters:{left:'A',top:'Z'}};document.body.append(two);await two.ready;two.setAttribute('paused','');if(two.playing)throw Error('paused attribute ineffective');two.removeAttribute('paused');if(!two.playing)throw Error('removing paused attribute must resume');two.pause();two.renderAt(.5);const okay=two.config.letters.left==='A'&&two.config.letters.top==='Z'&&pistonStudio.config.letters.left==='G';two.dispose();two.remove();return okay;});assert.equal(multi,true);
 await page.click('#tab-library');for(const style of ['compact','tall','pumpkin']){await page.click('[data-style="'+style+'"]');assert.equal(await page.locator('.glyph-card').count(),26);await page.locator('.glyph-card').last().scrollIntoViewIfNeeded();await page.evaluate(()=>Promise.all([...document.querySelectorAll('.glyph-card img')].map(i=>i.decode())));}
 await page.screenshot({path:path.join(out,'library.png'),fullPage:true});await page.click('#tab-use');assert.ok((await page.locator('#embed-code').textContent()).includes('<piston-letters'));await page.screenshot({path:path.join(out,'embed-docs.png'),fullPage:true});
 await page.click('#tab-studio');await page.selectOption('#background','#fffbf2');await page.setViewportSize({width:390,height:1100});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,'studio-mobile.png'),fullPage:true});
 await page.setViewportSize({width:320,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);const result={base,all78GlyphsRendered:true,curveProxyDrag:true,gifDownload:true,offlineHtml:true,multipleInstances:true,library26PerStyle:true,mobile320:true,browserErrors:errors};fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
