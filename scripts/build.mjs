import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=path.join(root,'dist');
await fs.mkdir(out,{recursive:true});
for(const name of ['index.html','README.md','.nojekyll'])await fs.copyFile(path.join(root,name),path.join(out,name));
for(const name of ['src','vendor','assets'])await fs.cp(path.join(root,name),path.join(out,name),{recursive:true,filter:s=>!/\.(tgz|map)$/.test(s)});
console.log('Static site built in '+out);
