#!/usr/bin/env node
// Single guarded entry point: render first, verify music second; never publish unverified MP4.
import {spawnSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {existsSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {verify} from './check-audio.mjs';
const own=dirname(fileURLToPath(import.meta.url));
function fail(s){throw Error(s)}
try{
 const argv=process.argv.slice(2);
 if(argv.length!==6||argv[0]!=='--engine'||argv[2]!=='--scene'||argv[4]!=='--audio')fail('Usage: node render-and-check.mjs --engine /path/to/motion-engine --scene /path/to/prepared-scene --audio approved-V7.wav');
 const engine=resolve(argv[1]),scene=resolve(argv[3]),music=resolve(argv[5]);
 const cli=join(engine,'bin','motion-engine.mjs'),index=join(scene,'index.html');
 if(!existsSync(cli)||!existsSync(index)||!existsSync(music))fail('Missing engine, scene or approved audio');
 const pending=join(scene,'film-unverified.mp4'),approved=join(scene,'film-verified.mp4');
 if(existsSync(pending)||existsSync(approved))fail('Output already exists; refusing overwrite');
 const result=spawnSync(process.execPath,[cli,'render',index,'--out',pending],{cwd:engine,stdio:'inherit'});
 if(result.status!==0)fail('Motion Engine render failed; cannot publish');
 const report=verify(pending,music);
 renameSync(pending,approved);
 console.log('CEREMONY_RENDER_PASS',approved,JSON.stringify(report));
}catch(e){console.error('CEREMONY_RENDER_FAIL:',e.message);process.exitCode=1}
