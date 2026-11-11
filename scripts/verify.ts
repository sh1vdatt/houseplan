import { floorplan } from '../src/data/floorplan.ts';
import { runChecks } from '../src/lib/verify.ts';
import { assessRoom, zoneGrid } from '../src/lib/vastu.ts';
import { formatDims } from '../src/lib/format.ts';

const icon = { pass: '✓', warn: '⚠', fail: '✗' } as const;
const results = runChecks(floorplan);
let group = '';
for (const r of results) {
  if (r.group !== group) console.log(`\n── ${(group = r.group)} ──`);
  console.log(`${icon[r.level]} ${r.label}\n    ${r.detail}`);
}
console.log('\n── Vastu (house-footprint grid) ──');
const grid = zoneGrid(floorplan, 'house');
for (const room of floorplan.rooms) {
  const a = assessRoom(floorplan, room, grid);
  console.log(`${a.status === 'ok' ? '✓' : a.status === 'warn' ? '⚠' : '·'} ${room.name.padEnd(26)} ${formatDims(room.width, room.height).padEnd(18)} ${a.dominant.padEnd(3)} ${a.message}`);
}
const failed = results.filter((r) => r.level === 'fail');
console.log(`\n${failed.length ? `✗ ${failed.length} check(s) failed` : '✓ All arithmetic checks pass'}`);
process.exit(failed.length ? 1 : 0);
