import type { FloorPlan, PlotSide, Pt } from '../data/types';
import { formatFeet, formatArea } from './format';
import {
  dist,
  distToLine,
  plotCorners,
  plotEdge,
  pointInPolygon,
  polygonArea,
  rectIntersect,
  roomPolygon,
  roomRect,
  xAtY,
} from './geometry';

export type CheckLevel = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  group: 'Stacks' | 'Geometry' | 'Setbacks' | 'Porch';
  label: string;
  level: CheckLevel;
  detail: string;
}

const TOL = 1 / 96; // ⅛"

export function runChecks(plan: FloorPlan): CheckResult[] {
  const out: CheckResult[] = [];
  const byId = new Map(plan.rooms.map((r) => [r.id, r]));

  // 1. Stack sums — also verifies each room starts exactly where the previous item ended.
  for (const s of plan.stackChecks) {
    let cursor = 0;
    const problems: string[] = [];
    const parts: string[] = [];
    for (const item of s.items) {
      if (typeof item === 'number') {
        cursor += item;
        parts.push(formatFeet(item));
        continue;
      }
      const r = byId.get(item);
      if (!r) {
        problems.push(`unknown room "${item}"`);
        continue;
      }
      const start = s.axis === 'y' ? r.y : r.x;
      if (Math.abs(start - cursor) > TOL)
        problems.push(`${r.name} starts at ${formatFeet(start)}, expected ${formatFeet(cursor)}`);
      const size = s.axis === 'y' ? r.height : r.width;
      if (size < 0) problems.push(`${r.name} has negative size`);
      cursor = start + size;
      parts.push(`${r.shortName || r.name} ${formatFeet(size)}`);
    }
    const ok = Math.abs(cursor - s.expected) <= TOL && problems.length === 0;
    out.push({
      group: 'Stacks',
      label: s.label,
      level: ok ? 'pass' : 'fail',
      detail:
        `${parts.join(' + ')} = ${formatFeet(cursor)} (${s.expectedLabel} ${formatFeet(s.expected)})` +
        (problems.length ? ` — ${problems.join('; ')}` : ''),
    });
  }

  // 2. Overlaps between interior rooms (carved children excepted).
  const interior = plan.rooms.filter((r) => !r.exterior);
  const overlaps: string[] = [];
  for (let i = 0; i < interior.length; i++)
    for (let j = i + 1; j < interior.length; j++) {
      const a = interior[i];
      const b = interior[j];
      if (a.parent === b.id || b.parent === a.id) continue;
      const hit = rectIntersect(roomRect(a), roomRect(b));
      if (hit) overlaps.push(`${a.name} ∩ ${b.name} (${formatArea(hit.w * hit.h)})`);
    }
  out.push({
    group: 'Geometry',
    label: 'No overlapping rooms',
    level: overlaps.length ? 'fail' : 'pass',
    detail: overlaps.length ? overlaps.join('; ') : `${interior.length} interior rooms, none overlap.`,
  });

  // 3. Every interior room inside the footprint.
  const outside = interior.filter((r) => {
    const [a, b, c, d] = roomPolygon(plan, r);
    return ![a, b, c, d].every((p) => pointInPolygon(p, plan.house.footprint));
  });
  out.push({
    group: 'Geometry',
    label: 'Rooms inside footprint',
    level: outside.length ? 'fail' : 'pass',
    detail: outside.length ? outside.map((r) => r.name).join(', ') : 'All rooms within the 26\'0" × 51\'9" outline.',
  });

  // 4. Footprint bounding box matches stated overall size.
  const xs = plan.house.footprint.map((p) => p[0]);
  const ys = plan.house.footprint.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  out.push({
    group: 'Geometry',
    label: 'Footprint = 26\'0" × 51\'9"',
    level: Math.abs(bw - plan.house.width) < TOL && Math.abs(bh - plan.house.depth) < TOL ? 'pass' : 'fail',
    detail: `Outline measures ${formatFeet(bw)} × ${formatFeet(bh)}; built-up area ${formatArea(polygonArea(plan.house.footprint))}.`,
  });

  // 5. Plot closes with the given side lengths.
  const corners = plotCorners(plan);
  const sides: PlotSide[] = ['north', 'east', 'south', 'west'];
  const mism = sides.filter((s) => {
    const [a, b] = plotEdge(plan, s);
    return Math.abs(dist(a, b) - plan.plot.sides[s]) > 0.01;
  });
  const plotArea = polygonArea(corners);
  out.push({
    group: 'Geometry',
    label: 'Plot closes with 30 / 68 / 31 / 63',
    level: mism.length ? 'fail' : 'pass',
    detail: mism.length
      ? `Side mismatch: ${mism.join(', ')}`
      : `Plot area ${formatArea(plotArea)}; ground coverage ${((polygonArea(plan.house.footprint) / plotArea) * 100).toFixed(1)}%.`,
  });

  // 6. Setbacks (min distance from built footprint to each boundary line).
  const [ox, oy] = plan.house.origin;
  const fp: Pt[] = plan.house.footprint.map(([x, y]) => [x + ox, y + oy]);
  for (const s of sides) {
    const [a, b] = plotEdge(plan, s);
    const d = Math.min(...fp.map((p) => distToLine(p, a, b)));
    const req = plan.plot.requiredSetback[s];
    const level: CheckLevel = d + TOL < req ? 'fail' : 'pass';
    out.push({
      group: 'Setbacks',
      label: `${s[0].toUpperCase()}${s.slice(1)} setback`,
      level,
      detail: `${formatFeet(d)} min (required ≥ ${formatFeet(req)}) — ${plan.plot.edgeNotes[s]}.`,
    });
  }

  // 7. Porch clear width at its north and south ends.
  const porch = plan.rooms.find((r) => r.category === 'exterior');
  if (porch) {
    const [ne, se] = plotEdge(plan, 'east');
    const top = xAtY(ne, se, porch.y + oy) - (porch.x + ox);
    const bot = xAtY(ne, se, porch.y + porch.height + oy) - (porch.x + ox);
    out.push({
      group: 'Porch',
      label: 'Car porch clear width',
      level: Math.min(top, bot) + TOL < porch.width ? 'warn' : 'pass',
      detail: `E–W clear ${formatFeet(top)} (north end) to ${formatFeet(bot)} (south end) vs nominal ${formatFeet(porch.width)}; length ${formatFeet(porch.height)}. Area ${formatArea(polygonArea(roomPolygon(plan, porch)))}. Fine for an SUV (~6'3" wide).`,
    });
  }
  return out;
}
