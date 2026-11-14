import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {dirname,join,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(dirname(fileURLToPath(import.meta.url))),'dist');
const port=Number(process.env.PORT)||3000;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.woff2':'font/woff2'};
createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
  try{
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path.includes('\0')||path.split('/').some(s=>s.startsWith('.')))throw new Error('invalid path');
    let target=resolve(root,'.'+path);if(target!==root&&!target.startsWith(root+'/'))throw new Error('invalid path');
    let info=await stat(target).catch(()=>null);if(info?.isDirectory()){target=join(target,'index.html');info=await stat(target).catch(()=>null);}
    if(!info&&!extname(target)){target+='.html';info=await stat(target).catch(()=>null);}
    if(!info?.isFile()){res.writeHead(404,{...headers,'Content-Type':mime['.html']});res.end(await readFile(join(root,'404.html')));return;}
    res.writeHead(200,{...headers,'Content-Type':mime[extname(target)]||'application/octet-stream'});res.end(await readFile(target));
  }catch{res.writeHead(400,headers);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`PAUS: http://localhost:${port} — dùng Ctrl+C để dừng.`));
