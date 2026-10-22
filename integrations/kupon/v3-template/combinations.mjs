#!/usr/bin/env node
/**
 * Kupon ceremony planner — deterministic and independent from scoring.
 * Generate a scene only if exactly one champion and one loser exist.
 * No invented player art or music: every asset must exist in the registry.
 */
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const own=dirname(fileURLToPath(import.meta.url));
export const PLAYERS=Object.freeze(['meto','lort','fero','latte','josh']);
export function combinations(){
 return PLAYERS.flatMap(winner=>PLAYERS.filter(loser=>loser!==winner).map(loser=>({winner,loser})));
}
export function decide(champ,last){
 if(!Array.isArray(champ)||!Array.isArray(last)||champ.length!==1||last.length!==1)return null;
 const winner=String(Array.isArray(champ[0])?champ[0][0]:champ[0]).toLowerCase();
 const loser=String(Array.isArray(last[0])?last[0][0]:last[0]).toLowerCase();
 if(!PLAYERS.includes(winner)||!PLAYERS.includes(loser)||winner===loser)return null;
 return {winner,loser};
}
export function plan(winner,loser,registry){
 const pair=decide([winner],[loser]);
 if(!pair)throw Error('Invalid or tied award');
 const win=registry?.players?.[winner]?.champion,lose=registry?.players?.[loser]?.loser;
 const victory=registry?.music?.victory,defeat=registry?.music?.defeat;
 for(const [label,entry] of Object.entries({champion:win,loser:lose,victory,defeat})){
  if(typeof entry!=='string'||!entry.trim())throw Error('ASSET_MISSING: '+label+' for '+winner+'-'+loser);
  if(!existsSync(resolve(entry)))throw Error('ASSET_NOT_FOUND: '+label+' '+entry);
 }
 return {winner,loser,winnerPoster:resolve(win),loserPoster:resolve(lose),victoryMusic:resolve(victory),defeatMusic:resolve(defeat)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args[0]==='--matrix'){console.log(JSON.stringify(combinations(),null,2));process.exit(0)}
  if(args.length!==4||args[0]!=='--registry')throw Error('Usage: node combinations.mjs --matrix OR --registry registry.json WINNER LOSER');
  const registryPath=resolve(args[1]);const registry=JSON.parse(readFileSync(registryPath,'utf8'));
  // Registry paths are resolved relative to its own folder.
  const rel=x=>typeof x==='string'?resolve(dirname(registryPath),x):x;
  const mapped={players:Object.fromEntries(Object.entries(registry.players||{}).map(([slug,roles])=>[slug,{champion:rel(roles.champion),loser:rel(roles.loser)}])),music:{victory:rel(registry.music?.victory),defeat:rel(registry.music?.defeat)}};
  console.log(JSON.stringify(plan(args[2],args[3],mapped),null,2));
 }catch(e){console.error('CEREMONY_PLAN_FAIL:',e.message);process.exitCode=1}
}
