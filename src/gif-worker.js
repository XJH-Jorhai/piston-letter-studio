import {GIFEncoder,quantize,applyPalette} from '../vendor/gifenc.js';
let gif,palette,width,height,transparent,count;
self.onmessage=({data})=>{
  try{
    if(data.type==='init'){({width,height,transparent}=data);gif=GIFEncoder();palette=null;count=0;self.postMessage({type:'ready'});}
    if(data.type==='frame'){
      const rgba=new Uint8Array(data.rgba),format=transparent?'rgba4444':'rgb565';
      if(!palette)palette=quantize(rgba,256,transparent?{format,oneBitAlpha:true}:{format});
      const index=applyPalette(rgba,palette,format),transparentIndex=transparent?palette.findIndex(p=>p[3]===0):-1;
      gif.writeFrame(index,width,height,{...(count===0?{palette}:{}),delay:data.delay,repeat:0,dispose:2,transparent:transparentIndex>=0,transparentIndex:Math.max(0,transparentIndex)});count++;self.postMessage({type:'frame',count});
    }
    if(data.type==='finish'){gif.finish();const bytes=gif.bytes();const output=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);self.postMessage({type:'done',buffer:output},[output]);}
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
