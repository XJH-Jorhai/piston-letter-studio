import {ALPHABET,normalizeConfig,getManifest} from './piston-letters.js';
import {DEFAULT_CONFIG} from './default-config.js';
import {CurveEditor} from './curve-editor.js';
import {download,exportGif,exportHtml,embedSnippet} from './export.js';
const $=id=>document.getElementById(id),animation=$('animation');
let state,curve,manifest,saveTimer,toastTimer,exporting=false,exportAbort,presetIndex=0;
try{state=normalizeConfig(JSON.parse(localStorage.getItem('piston-letter-studio:config:v1.2.0'))||DEFAULT_CONFIG);}catch{state=normalizeConfig(DEFAULT_CONFIG);}
const requestedMode=new URLSearchParams(location.search).get('mode');
if(['letters','minecraft'].includes(requestedMode))state.mode=requestedMode;
const notify=message=>{$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);};
function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('piston-letter-studio:config:v1.2.0',JSON.stringify(state));}catch{}},250);}
function sync(){
  for(const slot of ['top','body','left','right'])document.querySelector('[data-slot="'+slot+'"]').value=state.letters[slot];
  const minecraft=state.mode==='minecraft';
  for(const suffix of ['range','number'])$('stroke-'+suffix).disabled=minecraft;
  $('stroke-hint').textContent=minecraft?'原版固定 100% · 一格':'底座固定，全收回';
  document.querySelector('.letter-grid').hidden=minecraft;$('minecraft-note').hidden=!minecraft;
  $('minecraft-preset').setAttribute('aria-pressed',String(minecraft));
  document.querySelectorAll('[data-letters]').forEach(button=>button.setAttribute('aria-pressed',String(!minecraft&&button.dataset.letters===[state.letters.left,state.letters.right,state.letters.body,state.letters.top].join(''))));
  for(const n of ['period','stroke']){$(n+'-range').value=state[n];$(n+'-number').value=n==='period'?state[n].toFixed(2):state[n];}
  $('background').value=state.background;$('stage').classList.toggle('transparent',state.background==='transparent');
  $('frequency').textContent=(1/state.period).toFixed(2)+' 次 / 秒';
  $('embed-code').textContent=embedSnippet(state);
  $('play').textContent=animation.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',animation.playing?'暂停动画':'播放动画');
}
async function apply({fields=true}={}){
  try{state=normalizeConfig(state);if(fields)sync();$('render-state').textContent='更新中…';await animation.setConfig(state);$('render-state').textContent='实时预览';persist();}
  catch(error){$('render-state').textContent='加载失败';notify(error.message);}
}
for(const select of document.querySelectorAll('[data-slot]')){
  select.innerHTML=Array.from(ALPHABET,l=>'<option value="'+l+'">'+l+'</option>').join('');
  select.addEventListener('change',()=>{state.letters[select.dataset.slot]=select.value;apply();});
}
for(const n of ['period','stroke'])for(const suffix of ['range','number']){
  const input=$(n+'-'+suffix);input.addEventListener('input',()=>{if(input.value==='')return;const v=Number(input.value);if(!Number.isFinite(v))return;state[n]=Math.min(n==='period'?5:200,Math.max(n==='period'?.2:0,v));$(n+'-'+(suffix==='range'?'number':'range')).value=state[n];apply({fields:false});$('frequency').textContent=(1/state.period).toFixed(2)+' 次 / 秒';});input.addEventListener('change',sync);
}
$('background').addEventListener('change',e=>{state.background=e.target.value;apply();});
$('play').addEventListener('click',()=>{animation.playing?animation.pause():animation.play();sync();});
$('scrub').addEventListener('input',e=>{animation.pause();animation.renderAt(Number(e.target.value)/100);sync();});
animation.addEventListener('frame',e=>{const p=e.detail.phase;$('phase').textContent=Math.round(p*100)+'%';$('scrub').value=p*100;curve?.setPhase(p);});
animation.addEventListener('animation-error',e=>notify(e.detail.message));
curve=new CurveEditor($('curve-editor'),state.curve,{onChange:points=>{state.curve=points;apply({fields:false});},onScrub:p=>{animation.pause();animation.renderAt(p);sync();}});
document.querySelectorAll('[data-letters]').forEach(button=>button.addEventListener('click',()=>{const p=button.dataset.letters;state.mode='letters';delete state.assets;state.letters={left:p[0],right:p[1],body:p[2],top:p[3]};apply();}));
$('minecraft-preset').addEventListener('click',()=>{state.mode='minecraft';delete state.assets;apply();});
const presets=[
  {name:'原始非对称节奏',curve:DEFAULT_CONFIG.curve},
  {name:'平滑往返',curve:[{t:0,v:0,in:null,out:{t:.15,v:0}},{t:.5,v:1,in:{t:.35,v:1},out:{t:.65,v:1}},{t:1,v:0,in:{t:.85,v:0},out:null}]},
  {name:'快出慢回',curve:[{t:0,v:0,in:null,out:{t:.06,v:0}},{t:.28,v:1,in:{t:.20,v:1},out:{t:.50,v:1}},{t:1,v:0,in:{t:.85,v:0},out:null}]}
];
$('curve-presets').addEventListener('click',()=>{presetIndex=(presetIndex+1)%presets.length;state.curve=presets[presetIndex].curve;curve.setCurve(state.curve);apply();notify('已切换：'+presets[presetIndex].name);});
function activateTab(name){for(const n of ['studio','library','use']){$('tab-'+n).setAttribute('aria-selected',String(name===n));$('panel-'+n).hidden=name!==n;}if(name==='use')$('embed-code').textContent=embedSnippet(state);}
for(const n of ['studio','library','use'])$('tab-'+n).addEventListener('click',()=>activateTab(n));
document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=['studio','library','use'],i=tabs.findIndex(n=>$('tab-'+n).getAttribute('aria-selected')==='true');const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;activateTab(tabs[next]);$('tab-'+tabs[next]).focus();e.preventDefault();});
function renderLibrary(style='compact'){
  if(!manifest)return;
  document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===style)));
  $('letter-gallery').innerHTML=Array.from(ALPHABET,l=>{const asset=manifest.styles[style]?.[l];return asset?'<article class="glyph-card"><img loading="lazy" src="./'+asset.src+'" alt="'+style+' '+l+'" width="'+asset.width+'" height="'+asset.height+'"><div><strong>'+l+'</strong><a href="./'+asset.src+'" download="piston-'+style+'-'+l+'.png" aria-label="下载 '+l+' PNG">PNG ↓</a></div></article>':'';}).join('');
}
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>renderLibrary(b.dataset.style)));
function fileStem(){return (state.mode==='minecraft'?'minecraft-original':[state.letters.left,state.letters.right,state.letters.body,state.letters.top].join(''))+'-'+state.period.toFixed(2)+'s';}
function lockExport(busy,{cancellable=false}={}){
  exporting=busy;for(const id of ['export-html','export-gif','use-export-html','use-export-gif'])$(id).disabled=busy;
  $('cancel-export').hidden=!busy||!cancellable;$('export-progress').hidden=!busy;
}
async function htmlExport(){if(exporting)return;const name=fileStem();lockExport(true);try{$('export-progress').querySelector('span').textContent='打包素材和曲线…';const blob=await exportHtml(animation);download(blob,name+'.html');notify('已下载独立网页动画，可离线播放或通过 iframe 嵌入。');}catch(e){notify(e.message);}finally{lockExport(false);}}
async function gifExport(){if(exporting)return;const name=fileStem();lockExport(true,{cancellable:true});exportAbort=new AbortController();const progress=$('export-progress');try{const {blob}=await exportGif(animation,{size:768,signal:exportAbort.signal,onProgress:(fraction,i,n)=>{progress.querySelector('progress').value=fraction;progress.querySelector('span').textContent=i+' / '+n+' 帧';}});download(blob,name+'.gif');notify('GIF 已生成，完整保留当前字母与曲线。');}catch(e){notify(e.name==='AbortError'?'已取消导出。':e.message);}finally{lockExport(false);exportAbort=null;}}
for(const id of ['export-html','use-export-html'])$(id).addEventListener('click',htmlExport);
for(const id of ['export-gif','use-export-gif'])$(id).addEventListener('click',gifExport);
$('cancel-export').addEventListener('click',()=>exportAbort?.abort());
$('save-config').addEventListener('click',()=>download(new Blob([JSON.stringify({version:1,config:state},null,2)],{type:'application/json'}),fileStem()+'.json'));
$('load-config').addEventListener('click',()=>$('config-file').click());
$('config-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>200000)throw new Error('配置文件过大。');const value=JSON.parse(await file.text());state=normalizeConfig(value.config||value);delete state.assets;curve.setCurve(state.curve);await apply();notify('配置已导入。');}catch(e){notify('无法导入：'+e.message);}finally{e.target.value='';}});
$('copy-embed').addEventListener('click',async()=>{const code=embedSnippet(state);try{await navigator.clipboard.writeText(code);notify('嵌入代码已复制。');}catch{const input=document.createElement('textarea');input.value=code;document.body.append(input);input.select();document.execCommand('copy');input.remove();notify('嵌入代码已复制。');}});
sync();await apply();
try{manifest=await getManifest();$('asset-count').textContent=Object.values(manifest.styles).reduce((n,s)=>n+Object.keys(s).length,0);renderLibrary();}catch(e){notify(e.message);}
window.pistonStudio={animation,curve,get config(){return animation.config;},setConfig:async config=>{state=normalizeConfig(config);curve.setCurve(state.curve);await apply();},exportGif:()=>exportGif(animation),exportHtml:()=>exportHtml(animation)};
