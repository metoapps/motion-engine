#!/usr/bin/env node
// This file does NOT change the approved video frames. Verifies and re-muxes sound only.
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const lock=JSON.parse(readFileSync(new URL('./V7-LOCK.json',import.meta.url)));
const args=process.argv.slice(2);
if(args.length!==6||args[0]!=='--video'||args[2]!=='--audio'||args[4]!=='--out')throw Error('Usage: node verify-v7.mjs --video APPROVED.mp4 --audio APPROVED.wav --out NEW.mp4');
const video=resolve(args[1]),audio=resolve(args[3]),out=resolve(args[5]);
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const run=(bin,a)=>{const r=spawnSync(bin,a,{encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw Error(bin+': '+(r.stderr||r.error||r.stdout));return r.stdout};
if(!existsSync(video)||!existsSync(audio))throw Error('Missing approved V7 source files');
if(sha(video)!==lock.video_sha256||sha(audio)!==lock.audio_sha256)throw Error('V7 source hash mismatch! Aborting.');
if(out===video)throw Error('Never overwrite approved source.');
mkdirSync(dirname(out),{recursive:true});
run('ffmpeg',['-v','error','-y','-i',video,'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t','15','-movflags','+faststart',out]);
const fmd5=p=>createHash('sha256').update(run('ffmpeg',['-v','error','-i',p,'-map','0:v:0','-f','framemd5','-'])).digest('hex');
if(fmd5(video)!==fmd5(out))throw Error('Video frame mismatch! Do not publish.');
run('ffmpeg',['-v','error','-xerror','-i',out,'-f','null','-']);
console.log('V7_VERIFIED: original approved V7 video frames preserved; output '+out);
