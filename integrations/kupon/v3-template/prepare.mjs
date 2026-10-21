#!/usr/bin/env node
import {copyFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const own=dirname(fileURLToPath(import.meta.url));
function parse(argv){const out={};for(let i=0;i<argv.length;i++){let k=argv[i];if(!['--winner','--loser','--winner-name','--loser-name','--out','--audio'].includes(k))throw Error('Unknown argument '+k);if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Missing value for '+k);out[k]=argv[++i]}return out}
try{
const a=parse(process.argv.slice(2));
for(const x of ['--winner','--loser','--winner-name','--loser-name','--out','--audio'])if(!a[x])throw Error('Required: '+x);
const winner=resolve(a['--winner']),loser=resolve(a['--loser']),out=resolve(a['--out']);
if(winner===loser)throw Error('Winner and loser files must differ');
const lock=JSON.parse(readFileSync(join(own,'V7-LOCK.json'),'utf8'));
const musicHash=createHash('sha256').update(readFileSync(resolve(a['--audio']))).digest('hex');
if(musicHash!==lock.audio_sha256)throw Error('Wrong V7 music: hash mismatch');
for(const p of [winner,loser,...(a['--audio']?[resolve(a['--audio'])]:[])])if(!existsSync(p))throw Error('File missing: '+p);
if(existsSync(out))throw Error('Output folder exists; no overwrite: '+out);
for(const x of ['--winner-name','--loser-name'])if(a[x].trim().length<1||a[x].length>30)throw Error('Invalid name '+x);
if(a['--winner-name'].toLocaleLowerCase('tr-TR')===a['--loser-name'].toLocaleLowerCase('tr-TR'))throw Error('Same participant cannot win and lose');
mkdirSync(join(out,'assets'),{recursive:true});
copyFileSync(join(own,'index.html'),join(out,'index.html'));
copyFileSync(join(own,'scene.js'),join(out,'scene.js'));
copyFileSync(winner,join(out,'assets','winner.png'));copyFileSync(loser,join(out,'assets','loser.png'));
copyFileSync(resolve(a['--audio']),join(out,'assets','clean-effects.wav'));
const config={winner:{slug:a['--winner-name'].toLocaleLowerCase('tr-TR'),name:a['--winner-name']},loser:{slug:a['--loser-name'].toLocaleLowerCase('tr-TR'),name:a['--loser-name']},audio:true};
writeFileSync(join(out,'config.js'),'window.KUPON_CONFIG = '+JSON.stringify(config)+';\n');
console.log('SCENE_READY',join(out,'index.html'));
console.log('Render: node bin/motion-engine.mjs render '+JSON.stringify(join(out,'index.html'))+' --out '+JSON.stringify(join(out,'film.mp4')));
}catch(e){console.error('PREPARE_ERROR:',e.message);process.exitCode=1}
