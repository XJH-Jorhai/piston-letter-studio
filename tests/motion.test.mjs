import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {normalizeConfig,normalizeCurve,DEFAULT_CURVE,DEFAULT_CONFIG,sampleCurve,makeLayout,frameState,makeGifSchedule,ALPHABET,minecraftParts,MINECRAFT_TEXTURES} from '../src/piston-letters.js';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json')));
test('Minecraft has original 16px textures, a three-block T, and fixed piston housings',()=>{
  for(const name of Object.values(MINECRAFT_TEXTURES)){
    const png=fs.readFileSync(path.join(root,'assets/minecraft/'+name+'.png'));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),16);assert.equal(png.readUInt32BE(20),16);
  }
  const config=normalizeConfig({mode:'minecraft',stroke:100});
  assert.equal(JSON.parse(JSON.stringify(config)).mode,'minecraft');
  for(const stroke of [undefined,0,65,160,200])assert.equal(normalizeConfig({mode:'minecraft',stroke}).stroke,100);
  assert.equal(normalizeConfig({mode:'letters',stroke:160}).stroke,160);
  const rest=minecraftParts(frameState(config,0,{bases:{}}));
  for(const phase of [0,.5,.75]){
    const f=frameState(config,phase,{bases:{}}),parts=minecraftParts(f);
    assert.deepEqual(parts.filter(p=>p.id.endsWith('-base')),rest.filter(p=>p.id.endsWith('-base')));
    assert.deepEqual(parts.find(p=>p.id==='pumpkin'),rest.find(p=>p.id==='pumpkin'));
    assert.equal(parts.filter(p=>p.material==='iron').length,4);
    assert.equal(Math.max(...parts.map(p=>p.y+p.h)),3);
    for(const n of ['G','M','T']){
      const rod=parts.find(p=>p.id===n+'-rod'),head=parts.find(p=>p.id===n+'-head'),block=parts.find(p=>p.id===n+'-iron');
      if(f.ext[n]===0)assert.equal(rod,undefined);else{assert.equal(rod.d,f.ext[n]);assert.equal(rod.z+rod.d,head.z);}
      assert.equal(head.z+head.d,block.z);
    }
  }
});
test('all three asset styles contain exactly A–Z with usable PNGs',()=>{
  for(const style of ['compact','tall','pumpkin']){
    assert.equal(Object.keys(manifest.styles[style]).sort().join(''),ALPHABET);
    for(const letter of ALPHABET){
      const m=manifest.styles[style][letter],png=fs.readFileSync(path.join(root,m.src));
      assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),m.width);assert.equal(png.readUInt32BE(20),m.height);assert.equal(png[25],6,'PNG must retain alpha');
      assert.ok(m.attachment.every(Number.isFinite));assert.ok(m.attachment[0]>=0&&m.attachment[0]<m.width);assert.ok(m.attachment[1]>=0&&m.attachment[1]<m.height);
    }
  }
  assert.ok(fs.existsSync(path.join(root,manifest.variants.leftD.src)));
});
test('default authored curve is bounded, closed, and keeps unequal stroke timing',()=>{
  const p=normalizeCurve(DEFAULT_CURVE);assert.equal(sampleCurve(p,0),0);assert.equal(sampleCurve(p,1),0);assert.ok(sampleCurve(p,.2)<1e-8);assert.ok(Math.abs(sampleCurve(p,.75)-1)<1e-8);
  for(let i=0;i<=1000;i++)assert.ok(sampleCurve(p,i/1000)>=0&&sampleCurve(p,i/1000)<=1);
  assert.ok(Math.abs(sampleCurve(p,.4)+sampleCurve(p,.9)-1)>.01);
});
test('bad curves and nonletters are rejected, while config roundtrips',()=>{
  assert.throws(()=>normalizeConfig({letters:{top:'<script>'}}));assert.throws(()=>normalizeCurve([{t:0,v:0},{t:0,v:1},{t:1,v:0}]));
  assert.throws(()=>normalizeCurve([{t:0,v:NaN},{t:1,v:0}]));
  assert.deepEqual(normalizeConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG))),normalizeConfig(DEFAULT_CONFIG));
  assert.equal(normalizeConfig({period:-2,stroke:900}).period,.2);assert.equal(normalizeConfig({stroke:900}).stroke,200);
});
test('piston sockets are fixed and rod length is zero at retraction for all glyphs',()=>{
  for(const letter of ALPHABET){
    const metadata={top:manifest.styles.pumpkin[letter],body:manifest.styles.tall[letter],left:manifest.styles.compact[letter],right:manifest.styles.compact[letter],piston:manifest.piston};
    const c=normalizeConfig({letters:{top:letter,body:letter,left:letter,right:letter}}),layout=makeLayout(metadata,c.letters),base=JSON.stringify(layout.bases);
    for(const phase of [0,.2,.5,.7,.99]){
      const f=frameState(c,phase,layout);assert.equal(f.ext.G,f.ext.T);assert.ok(Math.abs(f.ext.G+f.ext.M-c.stroke/100)<1e-10);assert.equal(JSON.stringify(f.bases),base);
      for(const n of ['M','G','T']){
        const end=f.positions[n].map((v,i)=>v+layout.attach[n][i]),socket=layout.bases[n].map((v,i)=>v+layout.socket[i]);
        assert.ok(Math.abs(Math.hypot(end[0]-socket[0],end[1]-socket[1])-Math.hypot(60,38)*f.ext[n])<1e-8);
      }
    }
    assert.equal(frameState(c,0,layout).ext.G,0);
  }
});
test('GIF frame schedule preserves the exact centisecond cycle without tiny delays',()=>{
  for(const period of [.2,.43,.67,.7,1.92,5]){
    const frames=makeGifSchedule(period);assert.equal(frames.reduce((n,f)=>n+f.delay,0),Math.round(period*1000));assert.ok(frames.every(f=>f.delay>=20&&f.delay%10===0));assert.equal(frames[0].phase,0);assert.ok(frames.at(-1).phase<1);
  }
});
