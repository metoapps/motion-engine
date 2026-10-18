import { readdir,readFile,stat } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const ignore=new Set(['node_modules','output','.git','.impeccable']);
const bad=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){
 if(ignore.has(e.name))continue;const p=resolve(dir,e.name);
 if(e.isDirectory()){await walk(p);continue;}
 if(e.name==='.env'||/\.(state|quote)\.json$/.test(e.name))bad.push('Private runtime file: '+p);
 if(!['.md','.mjs','.js','.html','.css','.json','.yml','.example'].includes(extname(p))&&e.name!=='.env.example')continue;
 if(p===import.meta.filename)continue;const s=await readFile(p,'utf8');
 if(/(?:rw_live_|aip_live_)[A-Za-z0-9_-]{12,}/.test(s))bad.push('Credential pattern: '+p);
 if(/\/Users\/|\/private\/tmp\//.test(s))bad.push('Machine-specific path: '+p);
 if(/\b(?:TODO|FIXME)\b/.test(s))bad.push('Unfinished marker: '+p);
 if(extname(p)==='.md')for(const m of s.matchAll(/\]\(([^)]+)\)/g)){
  const link=m[1].split('#')[0];if(!link||/^(https?:|mailto:)/.test(link))continue;
  try{await stat(resolve(dir,decodeURIComponent(link)));}catch{bad.push('Broken link in '+p+': '+link);}
 }
}}
await walk(root);if(bad.length){console.error(bad.join('\n'));process.exitCode=1;}else console.log('Release files, local documentation links and credential/path checks passed.');
