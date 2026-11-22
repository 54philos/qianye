const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),app=path.join(root,'app');
const allowedConfig=new Set(['addons.xml','window.xml','menus.xml','finder-top-favorites.xml']);
const failures=[];let count=0;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,e.name),rel=path.relative(root,p).replaceAll('\\','/');
 if(e.isSymbolicLink()){failures.push('Unexpected symlink: '+rel);continue;}
 if(e.isDirectory()){if(rel==='app/cache')failures.push('Runtime cache present');scan(p);continue;}
 count++;
 if(rel.startsWith('app/config/')&&!allowedConfig.has(e.name))failures.push('Runtime/personal configuration: '+rel);
 if(/\.(?:js|cs|xml|html|css|txt|md)$/i.test(e.name)){
  const text=fs.readFileSync(p,'utf8');
  if(/C:\\Users\\Administrator|E:\\te260920|D:\\1-|2026-11-14|店铺内容|长款护膝/.test(text))failures.push('Personal path: '+rel);
  if(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(text))failures.push('Possible credential: '+rel);
 }
}}
scan(app);
for(const file of ['TE64.exe','lib/te64.dll','lib/tewv64.dll','LICENSE-Tablacus.txt','addons/finderstyle/startup.js','addons/finderstyle/brand.js','addons/finderstyle/ThumbProbe.cs'])if(!fs.existsSync(path.join(app,file)))failures.push('Missing required file: '+file);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(JSON.stringify({files:count,privateDataCheck:'passed',configTemplates:[...allowedConfig]}));
