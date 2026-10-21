import assert from 'node:assert/strict';
import {PLAYERS,combinations,decide,plan} from './combinations.mjs';
const all=combinations();
assert.equal(all.length,20);
assert.equal(new Set(all.map(p=>p.winner+'-'+p.loser)).size,20);
for(const p of PLAYERS){assert.equal(all.filter(x=>x.winner===p).length,4);assert.equal(all.filter(x=>x.loser===p).length,4)}
assert.deepEqual(decide([['fero',22]],[['latte',3]]),{winner:'fero',loser:'latte'});
assert.equal(decide([['fero',22],['meto',22]],[['latte',3]]),null);
assert.equal(decide([['fero',22]],[['fero',3]]),null);
assert.equal(decide([['fero',22]],[['unknown',3]]),null);
assert.throws(()=>plan('fero','latte',{}),/ASSET_MISSING/);
console.log('COMBINATIONS_PASS 20 unique pairs; missing art/music fails closed');
