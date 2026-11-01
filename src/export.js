import {PistonLetters,makeGifSchedule} from './piston-letters.js';
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportGif(component,{size=768,onProgress=()=>{},signal}={}){
  const config=component.config,offscreen=new PistonLetters();await offscreen.setConfig(config);
  const worker=new Worker(new URL('./gif-worker.js',import.meta.url),{type:'module'});
  let rejectPending;
  const wait=()=>new Promise((resolve,reject)=>{rejectPending=reject;worker.onmessage=e=>{if(e.data.type==='error')reject(new Error(e.data.message));else resolve(e.data);};worker.onerror=e=>reject(new Error(e.message||'GIF 编码失败。'));});
  const abort=()=>rejectPending?.(new DOMException('已取消导出。','AbortError'));signal?.addEventListener('abort',abort,{once:true});
  try{
    let pending=wait();worker.postMessage({type:'init',width:size,height:size,transparent:config.background==='transparent'});await pending;
    const schedule=makeGifSchedule(config.period);
    for(let i=0;i<schedule.length;i++){
      if(signal?.aborted)throw new DOMException('已取消导出。','AbortError');
      const {phase,delay}=schedule[i],canvas=offscreen.captureFrame(phase,{size}),rgba=canvas.getContext('2d').getImageData(0,0,size,size).data;
      pending=wait();worker.postMessage({type:'frame',rgba:rgba.buffer,delay},[rgba.buffer]);await pending;onProgress((i+1)/schedule.length,i+1,schedule.length);
    }
    pending=wait();worker.postMessage({type:'finish'});const {buffer}=await pending;
    return {blob:new Blob([buffer],{type:'image/gif'}),frames:schedule.length,duration:Math.round(config.period*1000)};
  }finally{worker.terminate();offscreen.dispose();signal?.removeEventListener('abort',abort);}
}
export async function exportHtml(component){
  const config=await component.embeddedConfig();
  const response=await fetch(new URL('./piston-letters.js',import.meta.url));if(!response.ok)throw new Error('组件源码读取失败。');
  const source=(await response.text()).replace(/^export\s+/gm,'').replace(/<\/script/gi,'<\\/script');
  const data=JSON.stringify(config).replace(/</g,'\\u003c');
  return new Blob(['<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>字母活塞动画</title><style>html,body{margin:0;min-height:100%;background:'+config.background+'}piston-letters{width:min(100%,768px);margin:auto}</style><script type="application/json" id="piston-config">'+data+'</script><piston-letters config-id="piston-config"></piston-letters><script type="module">'+source+'</script></html>'],{type:'text/html;charset=utf-8'});
}
export function embedSnippet(config,base=new URL('../',import.meta.url).href){
  const clean={...config};delete clean.assets;
  return '<script type="module" src="'+new URL('src/piston-letters.js',base).href+'"></script>\n<piston-letters style="width:360px;max-width:100%"\n  config=\''+JSON.stringify(clean).replace(/&/g,'&amp;').replace(/'/g,'&#39;')+'\'>\n</piston-letters>';
}
