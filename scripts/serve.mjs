import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),port=Number(process.env.PORT||4173);
const types={'.mp3':'audio/mpeg','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const target=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(target,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    const headers={'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*','Accept-Ranges':'bytes'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      const invalid=()=>res.writeHead(416,{...headers,'Content-Range':'bytes */'+stat.size}).end();
      if(!match||(!match[1]&&!match[2])){invalid();return;}
      if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
      else{const count=Number(match[2]);if(count<=0){invalid();return;}start=Math.max(0,stat.size-count);}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){invalid();return;}
      status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||!stat.size){res.end();return;}
    const stream=fs.createReadStream(target,{start,end});
    stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  });
});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
