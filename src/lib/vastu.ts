import type { FloorPlan, Room, Zone } from '../data/types';
import { clipPolygon, plotInHouse, polygonArea, rectPoly, roomPolygon, type Rect } from './geometry';

export type GridBasis = 'house' | 'plot';

export interface ZoneCell extends Rect {
  zone: Zone;
}

const ORDER: Zone[][] = [
  ['NW', 'N', 'NE'],
  ['W', 'C', 'E'],
  ['SW', 'S', 'SE'],
];

/** Bounding box (house coords) the 3×3 grid is laid over. */
export function gridBounds(plan: FloorPlan, basis: GridBasis): Rect {
  if (basis === 'house') return { x: 0, y: 0, w: plan.house.width, h: plan.house.depth };
  const pts = plotInHouse(plan);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function zoneGrid(plan: FloorPlan, basis: GridBasis): ZoneCell[] {
  const b = gridBounds(plan, basis);
  const cw = b.w / 3;
  const ch = b.h / 3;
  const cells: ZoneCell[] = [];
  ORDER.forEach((row, r) =>
    row.forEach((zone, c) => cells.push({ zone, x: b.x + c * cw, y: b.y + r * ch, w: cw, h: ch })),
  );
  return cells;
}

export type VastuStatus = 'ok' | 'warn' | 'na';

export interface RoomAssessment {
  status: VastuStatus;
  /** Zone holding the largest share of the room's floor area. */
  dominant: Zone;
  /** Share of area per zone, descending (fractions 0–1). */
  shares: { zone: Zone; share: number }[];
  message: string;
}

export function assessRoom(plan: FloorPlan, room: Room, grid: ZoneCell[]): RoomAssessment {
  const poly = roomPolygon(plan, room);
  const total = polygonArea(poly) || 1;
  const shares = grid
    .map((cell) => ({ zone: cell.zone, share: polygonArea(clipPolygon(poly, rectPoly(cell))) / total }))
    .filter((s) => s.share > 0.005)
    .sort((a, b) => b.share - a.share);
  const dominant = shares[0]?.zone ?? room.vastuZone;
  const pct = (z: Zone) => Math.round((shares.find((s) => s.zone === z)?.share ?? 0) * 100);

  if (room.noVastu) return { status: 'na', dominant, shares, message: 'Service space — not scored.' };

  const zoneName = (z: Zone) => plan.zones[z].label;
  if (room.idealZones.includes(dominant)) {
    const declaredNote =
      dominant !== room.vastuZone
        ? ` Intended for ${zoneName(room.vastuZone)}; ${zoneName(dominant)} is also acceptable.`
        : '';
    return {
      status: 'ok',
      dominant,
      shares,
      message: `Compliant — ${pct(dominant)}% in ${zoneName(dominant)}.${declaredNote}`,
    };
  }
  const touchesIdeal = shares.filter((s) => room.idealZones.includes(s.zone));
  const auto =
    `Mostly in ${zoneName(dominant)} (${pct(dominant)}%); ideal is ${room.idealZones.map(zoneName).join(' / ')}` +
    (touchesIdeal.length ? ` — ${touchesIdeal.map((s) => `${Math.round(s.share * 100)}% ${s.zone}`).join(', ')}.` : '.');
  return { status: 'warn', dominant, shares, message: room.compromiseNote ? `${auto} ${room.compromiseNote}` : auto };
}

/** Rooms that intrude into the Brahmasthan (centre cell), excluding open circulation. */
export function brahmasthanUse(plan: FloorPlan, grid: ZoneCell[]) {
  const c = grid.find((g) => g.zone === 'C')!;
  return plan.rooms
    .filter((r) => !r.parent)
    .map((r) => ({ room: r, area: polygonArea(clipPolygon(roomPolygon(plan, r), rectPoly(c))) }))
    .filter((x) => x.area > 1)
    .sort((a, b) => b.area - a.area);
}
