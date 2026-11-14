import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=dirname(dirname(fileURLToPath(import.meta.url))),errors=[];let pages=0,scripts=0,links=0;
const walk=path=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(path,e.name)):[join(path,e.name)]);
for(const file of walk(join(root,'assets')).filter(p=>p.endsWith('.js'))){try{new Script(readFileSync(file,'utf8'),{filename:file});scripts++;}catch(error){errors.push(error.message);}}
for(const name of [...readdirSync(root).filter(n=>n.endsWith('.html')),...readdirSync(join(root,'admin')).filter(n=>n.endsWith('.html')).map(n=>'admin/'+n)]){
 const html=readFileSync(join(root,name),'utf8');pages++;
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 if(ids.length!==new Set(ids).size)errors.push(`${name}: duplicate id`);
 if(!/lang="vi"/.test(html)||!/name="viewport"/.test(html)||!/<title>/.test(html))errors.push(`${name}: missing document metadata`);
 if(!/<main\b[^>]*id="(?:main|adminContent)"/.test(html))errors.push(`${name}: missing main target`);
 for(const match of html.matchAll(/\b(src|href)="([^"]+)"/g)){
  const url=match[2];if(/^(https?:|mailto:|tel:|data:)/.test(url))continue;
  if(url==='#')errors.push(`${name}: placeholder link`);
  if(url.startsWith('#')){if(!ids.includes(url.slice(1)))errors.push(`${name}: missing anchor ${url}`);continue;}
  let path=url.split(/[?#]/)[0].replace(/^\//,'')||'index.html';const target=resolve(url.startsWith('/')?root:dirname(join(root,name)),path);
  if(!existsSync(target)||!statSync(target).isFile()||statSync(target).size===0)errors.push(`${name}: missing asset ${url}`);links++;
 }
 // Every visible transactional text field needs a linked label.
 for(const match of html.matchAll(/<(input|textarea)\b([^>]*)>/g)){
  if(/type="(?:hidden|checkbox|radio|submit)"|\bhidden(?:[\s=]|$)/.test(match[2]))continue;
  const id=/\bid="([^"]+)"/.exec(match[2])?.[1];
  if(!/aria-label=/.test(match[2])&&(!id||!html.includes(`for="${id}"`)))errors.push(`${name}: field without label (${id||'no id'})`);
 }
}
for(const file of ['assets/css/styles.css','assets/css/studio.css','assets/css/admin.css']){
 const css=readFileSync(join(root,file),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,'');
 let depth=0;for(const char of css){if(char==='{')depth++;if(char==='}')depth--;if(depth<0)break;}if(depth!==0)errors.push(`${file}: unbalanced CSS blocks`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Static checks passed: ${pages} HTML pages, ${scripts} JavaScript files, ${links} local links/assets, CSS blocks and form labels.`);
