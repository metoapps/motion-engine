import { cp, mkdir, writeFile, stat, access } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { root, json, saveJSON } from './util.mjs';
const formats = { landscape: [1280, 720], portrait: [720, 1280], square: [1080, 1080] };
export async function createDemo({ out, preset = 'launch', format = 'landscape', assets }) {
  if (!['launch','product','story'].includes(preset)) throw new Error('Preset must be launch, product or story.');
  if (!formats[format]) throw new Error('Format must be landscape, portrait or square.');
  const dir=resolve(out);
  try { await access(dir); throw new Error('Output folder already exists. Render its index.html or choose a new --out folder.'); }
  catch(e){ if(e.code!=='ENOENT')throw e; }
  const media={};
  // Resolve and validate all inputs before creating anything.
  const supplied=assets?await json(assets):{};
  for(const [kind,path] of Object.entries(supplied)){
    if(!['image','video','audio'].includes(kind)||typeof path!=='string')throw new Error('Assets manifest supports image, video and audio local file paths.');
    const source=resolve(dirname(resolve(assets)),path);
    if(!(await stat(source)).isFile())throw new Error('Asset is not a file: '+source);
    const ext=extname(source).toLowerCase();
    const allowed={image:['.png','.jpg','.jpeg','.webp'],video:['.mp4','.webm'],audio:['.wav','.mp3','.ogg','.m4a']};
    if(!allowed[kind].includes(ext))throw new Error('Unsupported '+kind+' extension: '+ext);
    media[kind]={source,dest:`assets/media/${kind}${ext}`};
  }
  await mkdir(dir,{recursive:true});
  await cp(resolve(root,'templates/demo'),dir,{recursive:true});
  await cp(resolve(root,'assets'),resolve(dir,'assets'),{recursive:true});
  await mkdir(resolve(dir,'engine'),{recursive:true});
  await cp(resolve(root,'engine/runtime.js'),resolve(dir,'engine/runtime.js'));
  for(const entry of Object.values(media)){await mkdir(resolve(dir,'assets/media'),{recursive:true});await cp(entry.source,resolve(dir,entry.dest));}
  const [width,height]=formats[format];
  const config={preset,format,width,height,duration:12,fps:30,media:Object.fromEntries(Object.entries(media).map(([k,v])=>[k,'./'+v.dest]))};
  await writeFile(resolve(dir,'config.js'),`window.MOTION_CONFIG = ${JSON.stringify(config,null,2)};\n`);
  await saveJSON(resolve(dir,'project.json'),config);
  return resolve(dir,'index.html');
}
