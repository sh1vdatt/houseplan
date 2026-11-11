import type { FloorPlan, PlotSide, Pt, Room } from '../data/types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const EPS = 1e-6;

/** Intersection of two circles; returns both points (or [] if none). */
function circleIntersect(c0: Pt, r0: number, c1: Pt, r1: number): Pt[] {
  const dx = c1[0] - c0[0];
  const dy = c1[1] - c0[1];
  const d = Math.hypot(dx, dy);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return [];
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const mx = c0[0] + (a * dx) / d;
  const my = c0[1] + (a * dy) / d;
  return [
    [mx + (h * dy) / d, my - (h * dx) / d],
    [mx - (h * dy) / d, my + (h * dx) / d],
  ];
}

/**
 * Plot corners in plot coords [NW, NE, SE, SW].
 * Assumes West boundary vertical and North boundary perpendicular to it,
 * then solves SE from the South and East lengths.
 */
export function plotCorners(plan: FloorPlan): [Pt, Pt, Pt, Pt] {
  if (plan.plot.surveyedCorners) return plan.plot.surveyedCorners;
  const { north, east, south, west } = plan.plot.sides;
  const NW: Pt = [0, 0];
  const NE: Pt = [north, 0];
  const SW: Pt = [0, west];
  const sols = circleIntersect(SW, south, NE, east);
  if (!sols.length) throw new Error('Plot side lengths do not close — check plot.sides');
  const SE = sols.reduce((best, p) => (p[0] > best[0] ? p : best));
  return [NW, NE, SE, SW];
}

export function plotEdge(plan: FloorPlan, side: PlotSide): [Pt, Pt] {
  const [NW, NE, SE, SW] = plotCorners(plan);
  switch (side) {
    case 'north':
      return [NW, NE];
    case 'east':
      return [NE, SE];
    case 'south':
      return [SW, SE];
    case 'west':
      return [NW, SW];
  }
}

export const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function pointAlong(a: Pt, b: Pt, d: number): Pt {
  const L = dist(a, b);
  return [a[0] + ((b[0] - a[0]) * d) / L, a[1] + ((b[1] - a[1]) * d) / L];
}

/** x of segment a→b at a given y (linear interpolation). */
export function xAtY(a: Pt, b: Pt, y: number): number {
  if (Math.abs(b[1] - a[1]) < EPS) return a[0];
  return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
}

/** y of segment a→b at a given x. */
export function yAtX(a: Pt, b: Pt, x: number): number {
  if (Math.abs(b[0] - a[0]) < EPS) return a[1];
  return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
}

export function polygonArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export const rectPoly = (r: Rect): Pt[] => [
  [r.x, r.y],
  [r.x + r.w, r.y],
  [r.x + r.w, r.y + r.h],
  [r.x, r.y + r.h],
];

/** Sutherland–Hodgman: clip `subject` by a CONVEX `clip` polygon. */
export function clipPolygon(subject: Pt[], clip: Pt[]): Pt[] {
  // orientation of clip polygon
  let signed = 0;
  for (let i = 0; i < clip.length; i++) {
    const [x1, y1] = clip[i];
    const [x2, y2] = clip[(i + 1) % clip.length];
    signed += x1 * y2 - x2 * y1;
  }
  const orient = signed >= 0 ? 1 : -1;
  let output = subject.slice();
  for (let i = 0; i < clip.length && output.length; i++) {
    const A = clip[i];
    const B = clip[(i + 1) % clip.length];
    const inside = (p: Pt) => orient * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= -EPS;
    const intersect = (p: Pt, q: Pt): Pt => {
      const a1 = B[1] - A[1];
      const b1 = A[0] - B[0];
      const c1 = a1 * A[0] + b1 * A[1];
      const a2 = q[1] - p[1];
      const b2 = p[0] - q[0];
      const c2 = a2 * p[0] + b2 * p[1];
      const det = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
    };
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const P = input[j];
      const Q = input[(j + 1) % input.length];
      const pin = inside(P);
      const qin = inside(Q);
      if (pin && qin) output.push(Q);
      else if (pin && !qin) output.push(intersect(P, Q));
      else if (!pin && qin) {
        output.push(intersect(P, Q));
        output.push(Q);
      }
    }
  }
  return output;
}

export function rectIntersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 - x <= EPS || y2 - y <= EPS) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}

export const roomRect = (r: Room): Rect => ({ x: r.x, y: r.y, w: r.width, h: r.height });

/** Plot polygon translated into house coordinates. */
export function plotInHouse(plan: FloorPlan): Pt[] {
  const [ox, oy] = plan.house.origin;
  return plotCorners(plan).map(([x, y]) => [x - ox, y - oy] as Pt);
}

/** Room outline in house coords; exterior rooms are clipped to the plot. */
export function roomPolygon(plan: FloorPlan, r: Room): Pt[] {
  const p = rectPoly(roomRect(r));
  return r.exterior ? clipPolygon(p, plotInHouse(plan)) : p;
}

export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  // on-edge counts as inside
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b[0] - a[0]) * (pt[1] - a[1]) - (b[1] - a[1]) * (pt[0] - a[0]);
    const within =
      pt[0] >= Math.min(a[0], b[0]) - EPS &&
      pt[0] <= Math.max(a[0], b[0]) + EPS &&
      pt[1] >= Math.min(a[1], b[1]) - EPS &&
      pt[1] <= Math.max(a[1], b[1]) + EPS;
    if (Math.abs(cross) < EPS && within) return true;
  }
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Perpendicular distance from point to the infinite line through a, b. */
export function distToLine(p: Pt, a: Pt, b: Pt): number {
  const L = dist(a, b);
  return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L;
}
