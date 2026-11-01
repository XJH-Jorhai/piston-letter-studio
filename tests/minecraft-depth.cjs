const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4174/';
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader'],executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
  const pages=[],errors=[],phases=[0,.2,.3,.4,.44,.45,.46,.47,.5,.55,.67,.75,.9,.98];
  for(const cpu of [false,true]){
    const page=await browser.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
    if(cpu)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
    const url=new URL(base);url.searchParams.set('mode','minecraft');await page.goto(url.href);
    await page.waitForFunction(()=>window.pistonStudio?.animation._renderer?.type==='minecraft');
    await page.evaluate(()=>pistonStudio.animation.pause());
    assert.equal(await page.evaluate(()=>pistonStudio.animation._renderer.backend),cpu?'cpu':'webgl2');
  }
  let baseline;
  for(const phase of phases){
    const samples=[];
    for(const page of pages){
      samples.push(await page.evaluate(p=>{
        const canvas=pistonStudio.animation.captureFrame(p,{size:768,background:'transparent'}),ctx=canvas.getContext('2d'),values=[];
        // Every interior point on the fixed pumpkin front is physically above all iron.
        for(let j=0;j<16;j++)for(let i=0;i<16;i++){
          const u=(i+.5)/16,v=(j+.5)/16,x=Math.floor(320+130*u),y=Math.floor(98+28*u+145*v);
          values.push(...ctx.getImageData(x,y,1,1).data);
        }
        return values;
      },phase));
    }
    baseline??=samples[0];
    assert.deepEqual(samples[0],baseline,'Pumpkin front occluded at phase '+phase);
    assert.deepEqual(samples[1],baseline,'CPU depth differs at phase '+phase);
  }
  const out=path.resolve(__dirname,'../.test-results');fs.mkdirSync(out,{recursive:true});
  for(let i=0;i<pages.length;i++){
    await pages[i].evaluate(()=>pistonStudio.animation.renderAt(.46));
    await pages[i].locator('#animation').screenshot({path:path.join(out,'minecraft-depth-'+(i?'cpu':'gpu')+'-46.png')});
  }
  assert.deepEqual(errors,[]);await browser.close();console.log(JSON.stringify({depthBackends:2,phases:phases.length,pumpkinPixelsPerPhase:256,errors}));
})().catch(e=>{console.error(e);process.exit(1);});
