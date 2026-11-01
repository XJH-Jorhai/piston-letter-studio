import {normalizeCurve,sampleCurve,curveSegment,solveCurveTime} from './piston-letters.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const copy=p=>JSON.parse(JSON.stringify(p));
export class CurveEditor{
  constructor(root,points,{onChange=()=>{},onScrub=()=>{}}={}){
    this.root=root;this.points=normalizeCurve(points);this.onChange=onChange;this.onScrub=onScrub;this.selected=Math.min(2,this.points.length-1);this.target='anchor';this.phase=0;this.drag=null;
    this.g={w:400,h:250,l:45,r:18,t:20,b:38};
    root.classList.add('curve-editor');
    root.innerHTML='<svg role="img" aria-label="一个完整周期的行程曲线。方点为关键帧，圆点为可独立拖动的手柄。"></svg><p class="curve-help">拖方点改时机，拖圆点改缓动；双击空白处加点。</p><p class="curve-help proxy-note" hidden>短手柄已外移，虚线指向实际位置。</p><div class="curve-fields"><label>关键帧<select data-field="node" aria-label="选择关键帧"></select></label><label>编辑对象<select data-field="target"><option value="anchor">关键帧</option><option value="in">左手柄</option><option value="out">右手柄</option></select></label><label>周期时间 (%)<input data-field="time" type="number" min="0" max="100" step=".1"></label><label>行程 (%)<input data-field="value" type="number" min="0" max="100" step=".1"></label></div><div class="curve-actions"><button type="button" data-action="add">加点</button><button type="button" data-action="expand">展开手柄</button><button type="button" data-action="flat">水平切线</button><button type="button" data-action="delete">删除点</button></div>';
    this.svg=root.querySelector('svg');this.field=n=>root.querySelector('[data-field="'+n+'"]');
    this.field('node').addEventListener('change',e=>{this.selected=Number(e.target.value);this.target='anchor';this.sync();this.draw();});
    this.field('target').addEventListener('change',e=>{this.target=e.target.value;this.sync();this.draw();});
    for(const [field,key] of [['time','t'],['value','v']]){
      this.field(field).addEventListener('input',e=>{if(e.target.value==='')return;const value=Number(e.target.value)/100;if(!Number.isFinite(value))return;const p=this.target==='anchor'?this.points[this.selected]:this.points[this.selected][this.target];this.move(this.selected,this.target,key==='t'?value:p.t,key==='v'?value:p.v);});
      this.field(field).addEventListener('change',()=>this.sync());
    }
    root.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;if(action==='add')this.insert(this.phase);if(action==='delete')this.remove();if(action==='expand')this.expand();if(action==='flat')this.flat();});
    this.svg.addEventListener('pointerdown',e=>{
      const node=e.target.closest('[data-node]');
      if(node){this.selected=Number(node.dataset.node);this.target=node.dataset.kind;const p=this.target==='anchor'?this.points[this.selected]:this.points[this.selected][this.target];this.drag={i:this.selected,kind:this.target,x:e.clientX,y:e.clientY,t:p.t,v:p.v};this.sync();this.draw();}
      else{this.drag={scrub:true};this.phase=this.coordinates(e).t;this.onScrub(this.phase);this.setPhase(this.phase);}
      this.svg.setPointerCapture(e.pointerId);e.preventDefault();
    });
    this.svg.addEventListener('pointermove',e=>{if(!this.drag)return;if(this.drag.scrub){this.phase=this.coordinates(e).t;this.onScrub(this.phase);this.setPhase(this.phase);}else{const d=this.drag,t=d.t+(e.clientX-d.x)/(this.g.w-this.g.l-this.g.r),v=d.v-(e.clientY-d.y)/(this.g.h-this.g.t-this.g.b);this.move(d.i,d.kind,t,v);this.sync();}});
    const end=()=>{this.drag=null;};this.svg.addEventListener('pointerup',end);this.svg.addEventListener('pointercancel',end);
    this.svg.addEventListener('dblclick',e=>{if(e.target.closest('[data-node]'))return;const p=this.coordinates(e);this.insert(p.t,p.v);});
    this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(this.svg);this.sync();this.draw();
  }
  setCurve(points){this.points=normalizeCurve(points);this.selected=Math.min(this.selected,this.points.length-1);this.target='anchor';this.sync();this.draw();}
  changed(){this.points=normalizeCurve(this.points);this.draw();this.onChange(copy(this.points));}
  move(i,kind,t,v){
    const p=this.points[i];
    if(kind==='anchor'){
      if(!i||i===this.points.length-1)return;
      const gap=Math.min(.015,(this.points[i+1].t-this.points[i-1].t)/2),nt=clamp(t,this.points[i-1].t+gap,this.points[i+1].t-gap),nv=clamp(v),dt=nt-p.t,dv=nv-p.v;
      p.t=nt;p.v=nv;for(const k of ['in','out'])if(p[k]){p[k].t+=dt;p[k].v=clamp(p[k].v+dv);}
    }else if(p[kind]){
      p[kind].t=clamp(t,kind==='in'?this.points[i-1].out.t:p.t,kind==='in'?p.t:this.points[i+1].in.t);p[kind].v=clamp(v);
    }
    this.selected=i;this.target=kind;this.changed();
  }
  insert(t,value){
    if(this.points.length>=24||t<.02||t>.98||this.points.some(p=>Math.abs(p.t-t)<.02))return false;
    const i=curveSegment(this.points,t),a=this.points[i],b=this.points[i+1],u=solveCurveTime(this.points,i,t),mix=(a,b)=>({t:a.t+(b.t-a.t)*u,v:a.v+(b.v-a.v)*u});
    const ab=mix(a,a.out),bc=mix(a.out,b.in),cd=mix(b.in,b),abc=mix(ab,bc),bcd=mix(bc,cd),mid=mix(abc,bcd);
    a.out=ab;b.in=cd;const p={t:mid.t,v:mid.v,in:abc,out:bcd};
    if(Number.isFinite(value)){const dv=clamp(value)-p.v;p.v+=dv;p.in.v=clamp(p.in.v+dv);p.out.v=clamp(p.out.v+dv);}
    this.points.splice(i+1,0,p);this.selected=i+1;this.target='anchor';this.changed();this.sync();return true;
  }
  remove(){if(!this.selected||this.selected===this.points.length-1)return;this.points.splice(this.selected,1);this.selected=Math.min(this.selected,this.points.length-2);this.target='anchor';this.changed();this.sync();}
  flat(){const p=this.points[this.selected];for(const k of ['in','out'])if(p[k])p[k].v=p.v;this.changed();this.sync();}
  expand(){const i=this.selected,p=this.points[i];if(p.in)p.in={t:p.t-(p.t-this.points[i-1].t)*.25,v:p.v};if(p.out)p.out={t:p.t+(this.points[i+1].t-p.t)*.25,v:p.v};this.changed();this.sync();}
  sync(){
    const p=this.points[this.selected];if(this.target!=='anchor'&&!p[this.target])this.target='anchor';
    this.field('node').innerHTML=this.points.map((_,i)=>'<option value="'+i+'">关键帧 '+(i+1)+'</option>').join('');this.field('node').value=this.selected;this.field('target').value=this.target;
    for(const k of ['in','out'])this.field('target').querySelector('[value="'+k+'"]').disabled=!p[k];
    const item=this.target==='anchor'?p:p[this.target];this.field('time').value=(item.t*100).toFixed(1);this.field('value').value=(item.v*100).toFixed(1);
    const locked=this.target==='anchor'&&(!this.selected||this.selected===this.points.length-1);this.field('time').disabled=locked;this.field('value').disabled=locked;
    this.root.querySelector('[data-action=delete]').disabled=!this.selected||this.selected===this.points.length-1;this.root.querySelector('[data-action=add]').disabled=this.points.length>=24;
  }
  x(t){return this.g.l+t*(this.g.w-this.g.l-this.g.r);}
  y(v){return this.g.h-this.g.b-v*(this.g.h-this.g.t-this.g.b);}
  coordinates(e){const r=this.svg.getBoundingClientRect();return {t:clamp((e.clientX-r.left-this.g.l)/(this.g.w-this.g.l-this.g.r)),v:clamp((this.g.h-this.g.b-e.clientY+r.top)/(this.g.h-this.g.t-this.g.b))};}
  displayHandle(p,h,kind,other){
    const ax=this.x(p.t),ay=this.y(p.v),rx=this.x(h.t),ry=this.y(h.v),dx=rx-ax,dy=ry-ay,d=Math.hypot(dx,dy);let x=rx,y=ry;
    if(d<44){x=d>.001?ax+dx*44/d:ax+(kind==='in'?-44:44);y=d>.001?ay+dy*44/d:ay;}
    const blocked=()=>x<10||x>this.g.w-10||y<12||y>this.g.h-this.g.b+12||this.points.some(p=>Math.hypot(x-this.x(p.t),y-this.y(p.v))<40)||(other&&Math.hypot(x-other.x,y-other.y)<36);
    if(blocked()){x=clamp(ax+(kind==='in'?-20:20),this.g.l+8,this.g.w-this.g.r-8);y=ay+(p.v>.5?48:-48);if(blocked())y=ay+(p.v>.5?78:-78);}
    return {x,y,rx,ry,proxy:Math.hypot(x-rx,y-ry)>1};
  }
  draw(){
    if(!this.svg.clientWidth)return;this.g.w=this.svg.clientWidth;this.g.h=parseFloat(getComputedStyle(this.svg).height)||250;const g=this.g,x=t=>this.x(t),y=v=>this.y(v);
    this.svg.setAttribute('viewBox','0 0 '+g.w+' '+g.h);
    let html='<title>可编辑的完整周期行程曲线</title>',ticks=g.w<390?[0,.5,1]:[0,1/3,2/3,1];
    for(const t of ticks)html+='<line class="curve-grid" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+y(0)+'" y2="'+y(1)+'"/><text class="curve-axis" x="'+x(t)+'" y="'+(y(0)+17)+'" text-anchor="middle">'+Math.round(t*100)+'</text>';
    for(const v of [0,.5,1])html+='<line class="curve-grid" x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text class="curve-axis" x="'+(g.l-8)+'" y="'+(y(v)+3)+'" text-anchor="end">'+Math.round(v*100)+'</text>';
    html+='<text class="curve-axis" x="0" y="11">行程 %</text><text class="curve-axis" text-anchor="middle" x="'+((x(0)+x(1))/2)+'" y="'+(g.h-2)+'">周期时间 %</text>';
    let d='M '+x(this.points[0].t)+' '+y(this.points[0].v);
    for(let i=0;i<this.points.length-1;i++){const a=this.points[i],b=this.points[i+1];d+=' C '+x(a.out.t)+' '+y(a.out.v)+' '+x(b.in.t)+' '+y(b.in.v)+' '+x(b.t)+' '+y(b.v);}
    html+='<path class="curve-path" d="'+d+'"/>';
    let handles='',other=null,proxy=false;const p=this.points[this.selected];
    for(const kind of ['in','out'])if(p[kind]){const h=this.displayHandle(p,p[kind],kind,other);other=h;proxy||=h.proxy;
      html+='<line class="curve-tangent" x1="'+x(p.t)+'" y1="'+y(p.v)+'" x2="'+h.rx+'" y2="'+h.ry+'" pointer-events="none"/>';
      if(h.proxy)handles+='<line class="curve-proxy" x1="'+h.rx+'" y1="'+h.ry+'" x2="'+h.x+'" y2="'+h.y+'"/>';
      handles+='<circle class="curve-handle '+(this.target===kind?'curve-selected':'')+'" cx="'+h.x+'" cy="'+h.y+'" r="5.5" pointer-events="none"/><circle class="curve-hit" data-node="'+this.selected+'" data-kind="'+kind+'" cx="'+h.x+'" cy="'+h.y+'" r="16" fill="transparent"/>';
    }
    for(let i=0;i<this.points.length;i++){const p=this.points[i];html+='<rect class="curve-anchor '+(i===this.selected&&this.target==='anchor'?'curve-selected':'')+'" x="'+(x(p.t)-3.5)+'" y="'+(y(p.v)-3.5)+'" width="7" height="7"/><rect class="curve-hit" data-node="'+i+'" data-kind="anchor" x="'+(x(p.t)-16)+'" y="'+(y(p.v)-16)+'" width="32" height="32" fill="transparent"/>';}
    html+=handles+'<line class="curve-head-line" data-playhead y1="'+y(1)+'" y2="'+y(0)+'"/><circle class="curve-head-dot" data-playdot r="4"/>';
    this.svg.innerHTML=html;this.root.querySelector('.proxy-note').hidden=!proxy;this.setPhase(this.phase);
  }
  setPhase(phase){this.phase=clamp(phase);const line=this.svg.querySelector('[data-playhead]'),dot=this.svg.querySelector('[data-playdot]');if(line){line.setAttribute('x1',this.x(this.phase));line.setAttribute('x2',this.x(this.phase));}if(dot){dot.setAttribute('cx',this.x(this.phase));dot.setAttribute('cy',this.y(sampleCurve(this.points,this.phase)));}}
}
