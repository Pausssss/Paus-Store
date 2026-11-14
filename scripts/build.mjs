import {mkdirSync,rmSync,cpSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname,posix,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
const root=dirname(dirname(fileURLToPath(import.meta.url))),out=join(root,'dist');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const name of ['assets','admin'])cpSync(join(root,name),join(out,name),{recursive:true});
for(const entry of readdirSync(root))if(entry.endsWith('.html')||['manifest.webmanifest','service-worker.js','robots.txt','sitemap.xml','_headers'].includes(entry))cpSync(join(root,entry),join(out,entry));
const walk=path=>readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(path,entry.name)):[join(path,entry.name)]);
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,12);
const allVersions=new Map(walk(join(root,'assets')).map(file=>[relative(root,file).split(sep).join('/'),hash(readFileSync(file))]).sort(([a],[b])=>a.localeCompare(b,'en')));
const assetVersions=new Map([...allVersions].filter(([name])=>/\.(?:js|css)$/.test(name)));
for(const file of walk(out).filter(file=>file.endsWith('.html'))){
 const documentPath=relative(out,file).split(sep).join('/');
 const html=readFileSync(file,'utf8').replace(/\b(src|href)="([^"?#]+\.(?:js|css))"/g,(match,attribute,url)=>{
  if(/^https?:/.test(url))return match;
  const key=posix.normalize(url.startsWith('/')?url.slice(1):posix.join(posix.dirname(documentPath),url));
  return assetVersions.has(key)?`${attribute}="${url}?v=${assetVersions.get(key)}"`:match;
 });
 writeFileSync(file,html);
}
const release=hash([...allVersions].map(([name,version])=>`${name}:${version}`).join('\n'));
const core=['/','/index.html','/offline.html','/assets/images/product-fallback.svg',...['assets/css/styles.css','assets/css/studio.css'].map(name=>`/${name}?v=${assetVersions.get(name)}`)];
const worker=readFileSync(join(out,'service-worker.js'),'utf8').replace(/const CACHE_NAME='([^']+)';/,(_,name)=>`const CACHE_NAME='${name}-${release}';`).replace(/const CORE=\[[^;]*\];/,`const CORE=${JSON.stringify(core)};`);
writeFileSync(join(out,'service-worker.js'),worker);
console.log(`Build hoàn tất: dist/ · ${assetVersions.size} tài nguyên CSS/JS có phiên bản nội dung.`);
