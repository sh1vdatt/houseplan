import { useMemo, type MouseEvent, type ReactNode } from 'react';
import type { Door, FloorPlan as Plan, Pt, Room, Window, Zone } from '../data/types';
import { formatDims, formatFeet } from '../lib/format';
import { plotCorners, plotEdge, plotInHouse, pointAlong, roomPolygon, xAtY } from '../lib/geometry';
import { assessRoom, zoneGrid, type GridBasis } from '../lib/vastu';
import { Compass, DimLine } from './Dimension';
import { FurnitureSymbol } from './Furniture';

export interface Layers {
  furniture: boolean;
  dimensions: boolean;
  vastu: boolean;
  doors: boolean;
  compass: boolean;
}

export type Selection = { type: 'room'; id: string } | { type: 'zone'; zone: Zone } | null;

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  body: string;
}

interface Props {
  plan: Plan;
  layers: Layers;
  basis: GridBasis;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onTooltip: (t: TooltipState | null) => void;
}

const pts = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');
const floorVar = (r: Room) => `var(--floor-${r.category})`;

/** Segments of a room's outline, flagged "open" where it abuts a room in `openTo`. */
function outlineSegments(room: Room, byId: Map<string, Room>) {
  const { x, y, width: w, height: h } = room;
  const edges = [
    { axis: 'h' as const, c: y, a: x, b: x + w },
    { axis: 'h' as const, c: y + h, a: x, b: x + w },
    { axis: 'v' as const, c: x, a: y, b: y + h },
    { axis: 'v' as const, c: x + w, a: y, b: y + h },
  ];
  const segs: { x1: number; y1: number; x2: number; y2: number; open: boolean }[] = [];
  for (const e of edges) {
    const opens: [number, number][] = [];
    for (const id of room.openTo ?? []) {
      const o = byId.get(id);
      if (!o) continue;
      const oc = e.axis === 'h' ? [o.y, o.y + o.height] : [o.x, o.x + o.width];
      if (!oc.some((v) => Math.abs(v - e.c) < 1e-6)) continue;
      const lo = Math.max(e.a, e.axis === 'h' ? o.x : o.y);
      const hi = Math.min(e.b, e.axis === 'h' ? o.x + o.width : o.y + o.height);
      if (hi - lo > 1e-6) opens.push([lo, hi]);
    }
    opens.sort((p, q) => p[0] - q[0]);
    let cur = e.a;
    const push = (s: number, t: number, open: boolean) => {
      if (t - s < 1e-6) return;
      segs.push(e.axis === 'h' ? { x1: s, y1: e.c, x2: t, y2: e.c, open } : { x1: e.c, y1: s, x2: e.c, y2: t, open });
    };
    for (const [lo, hi] of opens) {
      push(cur, lo, false);
      push(lo, hi, true);
      cur = hi;
    }
    push(cur, e.b, false);
  }
  return segs;
}

function roomAt(rooms: Room[], p: Pt): Room | undefined {
  // children (carved rooms) win over parents
  const hits = rooms.filter((r) => p[0] >= r.x && p[0] <= r.x + r.width && p[1] >= r.y && p[1] <= r.y + r.height);
  return hits.find((r) => r.parent) ?? hits[0];
}

function DoorSymbol({ door, rooms, showSwing }: { door: Door; rooms: Room[]; showSwing: boolean }) {
  const { x, y, width: w, thickness: t, axis } = door;
  const s = door.swing ?? 1;
  const e = 0.04; // cover room outline strokes
  const probe: Pt = axis === 'h' ? [x + w / 2, s > 0 ? y + t + 0.2 : y - 0.2] : [s > 0 ? x + t + 0.2 : x - 0.2, y + w / 2];
  const gapFill = (roomAt(rooms, probe) && floorVar(roomAt(rooms, probe)!)) || 'var(--card)';
  const gap =
    axis === 'h' ? (
      <rect className="fp-gap" x={x} y={y - e} width={w} height={t + 2 * e} fill={gapFill} />
    ) : (
      <rect className="fp-gap" x={x - e} y={y} width={t + 2 * e} height={w} fill={gapFill} />
    );
  const jambs =
    axis === 'h'
      ? `M${x} ${y} V${y + t} M${x + w} ${y} V${y + t}`
      : `M${x} ${y} H${x + t} M${x} ${y + w} H${x + t}`;

  const leaves: ReactNode[] = [];
  if (door.kind !== 'opening' && showSwing) {
    const n = door.leaves ?? 1;
    const lw = w / n;
    const hinges: { pos: number; other: number }[] =
      n === 2
        ? [
            { pos: 0, other: lw },
            { pos: w, other: w - lw },
          ]
        : door.hinge === 'end'
          ? [{ pos: w, other: 0 }]
          : [{ pos: 0, other: w }];
    hinges.forEach(({ pos, other }, i) => {
      let H: Pt, C: Pt, O: Pt;
      if (axis === 'h') {
        const fy = s > 0 ? y + t : y;
        H = [x + pos, fy];
        C = [x + other, fy];
        O = [x + pos, fy + s * lw];
      } else {
        const fx = s > 0 ? x + t : x;
        H = [fx, y + pos];
        C = [fx, y + other];
        O = [fx + s * lw, y + pos];
      }
      const cross = (O[0] - H[0]) * (C[1] - H[1]) - (O[1] - H[1]) * (C[0] - H[0]);
      leaves.push(
        <g key={i}>
          <line className="fp-leaf" x1={H[0]} y1={H[1]} x2={O[0]} y2={O[1]} />
          <path className="fp-arc" d={`M${O[0]} ${O[1]} A${lw} ${lw} 0 0 ${cross > 0 ? 1 : 0} ${C[0]} ${C[1]}`} />
        </g>,
      );
    });
  }

  let entry: ReactNode = null;
  if (door.kind === 'main') {
    // arrow outside, pointing in
    const out = -(door.swing ?? 1);
    const c: Pt = axis === 'h' ? [x + w / 2, out > 0 ? y + t + 1.6 : y - 1.6] : [out > 0 ? x + t + 1.6 : x - 1.6, y + w / 2];
    const dir: Pt = axis === 'h' ? [0, -out] : [-out, 0];
    const p: Pt = [-dir[1], dir[0]];
    const tip: Pt = [c[0] + dir[0] * 0.6, c[1] + dir[1] * 0.6];
    const b1: Pt = [c[0] - dir[0] * 0.3 + p[0] * 0.45, c[1] - dir[1] * 0.3 + p[1] * 0.45];
    const b2: Pt = [c[0] - dir[0] * 0.3 - p[0] * 0.45, c[1] - dir[1] * 0.3 - p[1] * 0.45];
    entry = (
      <g pointerEvents="none">
        <path d={`M${tip[0]} ${tip[1]} L${b1[0]} ${b1[1]} L${b2[0]} ${b2[1]}Z`} fill="var(--accent)" />
        <text
          className="fp-sublabel"
          style={{ fontSize: 0.5, fontWeight: 700, fill: 'var(--accent)', letterSpacing: 0.05 }}
          x={c[0] - dir[0] * 1.05}
          y={c[1] - dir[1] * 1.05}
          transform={axis === 'v' ? `rotate(90 ${c[0] - dir[0] * 1.05} ${c[1] - dir[1] * 1.05})` : undefined}
        >
          ENTRY
        </text>
      </g>
    );
  }
  return (
    <g pointerEvents="none">
      {gap}
      <path className="fp-outline" d={jambs} />
      {leaves}
      {entry}
    </g>
  );
}

function WindowSymbol({ win }: { win: Window }) {
  const { x, y, length: l, thickness: t } = win;
  if (win.axis === 'h')
    return (
      <g pointerEvents="none">
        <rect className="fp-window" x={x} y={y} width={l} height={t} />
        <path className="fp-window-line" d={`M${x} ${y + t * 0.4} H${x + l} M${x} ${y + t * 0.6} H${x + l}`} />
      </g>
    );
  return (
    <g pointerEvents="none">
      <rect className="fp-window" x={x} y={y} width={t} height={l} />
      <path className="fp-window-line" d={`M${x + t * 0.4} ${y} V${y + l} M${x + t * 0.6} ${y} V${y + l}`} />
    </g>
  );
}

/** Dog-leg stair: east flight up (northwards), landing at the north, west flight continues to first floor. */
function StairSymbol({ room }: { room: Room }) {
  const { x, y, width: w, height: h } = room;
  const landing = 3.75;
  const half = w / 2;
  const treads = 8;
  const run = (h - landing) / treads;
  const lines: string[] = [];
  for (let i = 0; i <= treads; i++) {
    const ty = y + landing + i * run;
    lines.push(`M${x} ${ty} H${x + half - 0.08} M${x + half + 0.08} ${ty} H${x + w}`);
  }
  const ax = x + half + half / 2;
  const wx = x + half / 2;
  const turnY = y + 2.9;
  const breakY = y + landing + run * 3.4;
  return (
    <g pointerEvents="none">
      <path className="fp-stair-line" d={lines.join(' ')} />
      <rect x={x + half - 0.08} y={y + landing} width={0.16} height={h - landing} fill="var(--ink)" />
      {/* break line on the up flight */}
      <path className="fp-stair-line" style={{ strokeWidth: 0.05 }} d={`M${x + half} ${breakY + 0.9} L${x + w} ${breakY - 0.9}`} />
      {/* arrow: solid below cut plane, dashed above */}
      <circle cx={ax} cy={y + h - 0.95} r={0.14} fill="var(--ink)" />
      <path className="fp-stair-arrow" d={`M${ax} ${y + h - 0.95} V${breakY}`} />
      <path
        className="fp-stair-arrow"
        strokeDasharray="0.3 0.2"
        d={`M${ax} ${breakY} V${turnY} H${wx} V${y + h - 1.0}`}
      />
      <path d={`M${wx} ${y + h - 0.7} l-0.25 -0.5 h0.5z`} fill="var(--ink)" />
      <text className="fp-label" style={{ fontSize: 0.6 }} x={ax} y={y + h - 0.42}>
        UP
      </text>
      <text className="fp-sublabel" style={{ fontSize: 0.42 }} x={wx} y={y + h - 0.3}>
        to 1st floor
      </text>
    </g>
  );
}

function RoomLabel({ room, showDims }: { room: Room; showDims: boolean }) {
  const name = room.shortName ?? room.name;
  if (!name) return null;
  const [lx, ly] = room.labelAt ?? [room.width / 2, room.height / 2];
  const cx = room.x + lx;
  const cy = room.y + ly;
  const avail = room.rotateLabel ? room.height : room.width;
  const maxFs = room.category === 'bath' || room.category === 'service' ? 0.62 : 0.85;
  const fs = Math.max(0.42, Math.min(maxFs, (avail - 0.5) / (name.length * 0.58)));
  const dims = room.exterior && room.nominal ? `${room.nominal} nominal` : formatDims(room.width, room.height);
  const dfs = Math.max(0.36, Math.min(0.6, fs * 0.76, avail / (dims.length * 0.52)));
  return (
    <g transform={room.rotateLabel ? `rotate(-90 ${cx} ${cy})` : undefined} pointerEvents="none">
      <text className="fp-label" x={cx} y={showDims ? cy - dfs * 0.62 : cy} style={{ fontSize: fs }}>
        {name}
      </text>
      {showDims && (
        <text className="fp-sublabel" x={cx} y={cy + fs * 0.62} style={{ fontSize: dfs }}>
          {dims}
        </text>
      )}
      {room.exterior && (
        <text className="fp-sublabel" x={cx} y={cy + fs * 0.62 + (showDims ? dfs * 1.25 : 0)} style={{ fontSize: dfs * 0.95, fontStyle: 'italic' }}>
          open to sky · not enclosed
        </text>
      )}
    </g>
  );
}

export function FloorPlan({ plan, layers, basis, selection, onSelect, onTooltip }: Props) {
  const corners = useMemo(() => plotCorners(plan), [plan]);
  const plotHouse = useMemo(() => plotInHouse(plan), [plan]);
  const grid = useMemo(() => zoneGrid(plan, basis), [plan, basis]);
  const assessments = useMemo(
    () => new Map(plan.rooms.map((r) => [r.id, assessRoom(plan, r, grid)])),
    [plan, grid],
  );
  const byId = useMemo(() => new Map(plan.rooms.map((r) => [r.id, r])), [plan]);
  const [ox, oy] = plan.house.origin;
  const [NW, NE, SE, SW] = corners;
  const interior = plan.rooms.filter((r) => !r.exterior);
  const ordered = [...interior].sort((a, b) => Number(!!a.parent) - Number(!!b.parent));
  const exterior = plan.rooms.filter((r) => r.exterior);
  const selectedRoom = selection?.type === 'room' ? byId.get(selection.id) : undefined;

  const tip = (e: MouseEvent, title: string, body: string) => onTooltip({ x: e.clientX, y: e.clientY, title, body });
  const hideTip = () => onTooltip(null);

  // view box: plot bbox + margins for dimensions & labels
  const maxX = Math.max(...corners.map((c) => c[0]));
  const maxY = Math.max(...corners.map((c) => c[1]));
  const vb = { x: -13, y: -12, w: maxX + 27, h: maxY + 24 };

  const roomGroup = (room: Room, shape: ReactNode) => (
    <g
      key={room.id}
      className="fp-room"
      role="button"
      tabIndex={0}
      aria-label={`${room.name}, ${formatDims(room.width, room.height)}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ type: 'room', id: room.id });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect({ type: 'room', id: room.id });
        }
      }}
    >
      {shape}
    </g>
  );

  const edgeMid = (a: Pt, b: Pt, off: number): { p: Pt; angle: number } => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const n: Pt = [dy / L, -dx / L];
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle > 90.01 || angle < -89.99) angle += 180;
    return { p: [(a[0] + b[0]) / 2 + n[0] * off, (a[1] + b[1]) / 2 + n[1] * off], angle };
  };

  const [eNE, eSE] = plotEdge(plan, 'east');
  const houseTop = oy;
  const houseBottom = oy + plan.house.depth;

  return (
    <svg
      className="fp h-auto w-full select-none"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role="img"
      aria-label="Interactive ground floor plan"
      onClick={() => onSelect(null)}
    >
      <defs>
        <clipPath id="plot-clip-house">
          <polygon points={pts(plotHouse)} />
        </clipPath>
        <pattern id="pavers" width={1.5} height={1.5} patternUnits="userSpaceOnUse">
          <rect width={1.5} height={1.5} fill="var(--floor-exterior)" />
          <path d="M0 0 H1.5 M0 0 V1.5" stroke="var(--site-line)" strokeWidth={0.025} opacity={0.6} />
        </pattern>
      </defs>

      {/* ── Site ─────────────────────────────────────────── */}
      <polygon className="fp-site" points={pts(corners)} />
      <line x1={NW[0]} y1={NW[1]} x2={SW[0]} y2={SW[1]} stroke="var(--ink)" strokeWidth={0.22} />
      {(['north', 'east', 'south', 'west'] as const).map((side) => {
        const [a, b] = side === 'south' ? [SE, SW] : side === 'west' ? [SW, NW] : plotEdge(plan, side);
        const { p, angle } = edgeMid(a, b, side === 'west' ? 11 : side === 'north' ? 9.6 : 9);
        return (
          <g key={side} pointerEvents="none">
            <text className="fp-edge-label" x={p[0]} y={p[1]} transform={`rotate(${angle} ${p[0]} ${p[1]})`}>
              {plan.plot.edgeLabels[side]}
            </text>
          </g>
        );
      })}
      {/* road junction marker */}
      <g pointerEvents="none" transform={`translate(${SE[0] + 3.2} ${SE[1] + 3.4})`}>
        <path d="M-1 0 H1 M0 -1 V1" stroke="var(--sublabel)" strokeWidth={0.12} />
        <text className="fp-edge-label" style={{ fontSize: 0.6 }} x={0} y={1.7}>
          {plan.plot.junction.label}
        </text>
      </g>

      {/* ── House (house coordinates) ───────────────────── */}
      <g transform={`translate(${ox} ${oy})`}>
        {/* Vastu zone fills underneath */}
        {layers.vastu && (
          <g clipPath="url(#plot-clip-house)" pointerEvents="none">
            {grid.map((c) => (
              <rect
                key={c.zone}
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                fill={plan.zones[c.zone].color}
                style={{ opacity: 'var(--zone-opacity)' }}
              />
            ))}
          </g>
        )}

        {/* Porch / exterior */}
        {exterior.map((r) =>
          roomGroup(
            r,
            <>
              <polygon points={pts(roomPolygon(plan, r))} fill="url(#pavers)" />
              {layers.vastu && (
                <polygon
                  points={pts(roomPolygon(plan, r))}
                  fill={plan.zones[assessments.get(r.id)!.dominant].color}
                  style={{ opacity: 'var(--tint-opacity)' }}
                />
              )}
              <polygon className="fp-hover" points={pts(roomPolygon(plan, r))} />
              <polygon points={pts(roomPolygon(plan, r))} fill="none" stroke="var(--ink)" strokeWidth={0.05} strokeDasharray="0.45 0.3" />
            </>,
          ),
        )}

        {/* Walls = footprint, rooms punch the floor out */}
        <polygon className="fp-wall" points={pts(plan.house.footprint)} />
        {ordered.map((r) =>
          roomGroup(
            r,
            <>
              <rect x={r.x} y={r.y} width={r.width} height={r.height} fill={floorVar(r)} />
              {layers.vastu && !r.noVastu && (
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill={plan.zones[assessments.get(r.id)!.dominant].color}
                  style={{ opacity: 'var(--tint-opacity)' }}
                />
              )}
              <rect className="fp-hover" x={r.x} y={r.y} width={r.width} height={r.height} />
            </>,
          ),
        )}
        {plan.partitions.map((p, i) => (
          <rect key={i} className="fp-wall" x={p.x} y={p.y} width={p.w} height={p.h} pointerEvents="none" />
        ))}
        {layers.vastu && (
          <g clipPath="url(#plot-clip-house)" pointerEvents="none">
            {grid
              .filter((c) => c.zone !== 'C')
              .map((c) => (
                <g key={c.zone}>
                  <text
                    x={c.x + c.w / 2}
                    y={c.y + c.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 3.4, fontWeight: 800, fill: 'var(--ink)', opacity: 0.09, letterSpacing: 0.1 }}
                  >
                    {c.zone}
                  </text>
                  <text
                    x={c.x + c.w / 2}
                    y={c.y + c.h / 2 + 2.3}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 0.75, fontWeight: 700, fill: 'var(--ink)', opacity: 0.16, textTransform: 'uppercase', letterSpacing: 0.08 }}
                  >
                    {plan.zones[c.zone].element}
                  </text>
                </g>
              ))}
          </g>
        )}
        <g pointerEvents="none">
          {interior.flatMap((r) =>
            outlineSegments(r, byId).map((s, i) => (
              <line key={`${r.id}-${i}`} className={s.open ? 'fp-open-edge' : 'fp-outline'} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            )),
          )}
          <polygon points={pts(plan.house.footprint)} fill="none" stroke="var(--ink)" strokeWidth={0.07} />
        </g>

        {plan.windows.map((w) => (
          <WindowSymbol key={w.id} win={w} />
        ))}
        {plan.doors.map((d) => (
          <DoorSymbol key={d.id} door={d} rooms={interior} showSwing={layers.doors} />
        ))}
        {interior
          .filter((r) => r.category === 'stair')
          .map((r) => (
            <StairSymbol key={r.id} room={r} />
          ))}

        {layers.furniture &&
          plan.rooms.map((r) => (
            <g key={r.id} transform={`translate(${r.x} ${r.y})`}>
              {r.furniture.map((f, i) => (
                <FurnitureSymbol key={i} item={f} />
              ))}
            </g>
          ))}

        {plan.rooms.map((r) => (
          <RoomLabel key={r.id} room={r} showDims={layers.dimensions} />
        ))}

        {/* Vastu grid lines, zone chips, Brahmasthan */}
        {layers.vastu && (
          <g>
            <g clipPath="url(#plot-clip-house)">
              {grid.map((c) => (
                <rect key={c.zone} className="fp-grid-line" x={c.x} y={c.y} width={c.w} height={c.h} />
              ))}
            </g>
            {grid
              .filter((c) => c.zone === 'C')
              .map((c) => (
                <rect
                  key="brahma"
                  className="fp-brahma"
                  x={c.x + 0.15}
                  y={c.y + 0.15}
                  width={c.w - 0.3}
                  height={c.h - 0.3}
                  pointerEvents="none"
                />
              ))}
            {grid
              .filter((c) => c.zone === 'C')
              .map((c) => {
                const z = plan.zones.C;
                const text = 'Brahmasthan ⓘ';
                const w = text.length * 0.33 + 0.6;
                const show = (e: MouseEvent) => tip(e, `Brahmasthan — keep open`, z.meaning);
                const pick = (e: MouseEvent) => {
                  e.stopPropagation();
                  onSelect({ type: 'zone', zone: 'C' });
                };
                return (
                  <g key="c-chip">
                    {/* wide invisible stroke so the dotted boundary itself is hoverable */}
                    <rect
                      x={c.x + 0.15}
                      y={c.y + 0.15}
                      width={c.w - 0.3}
                      height={c.h - 0.3}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={0.6}
                      pointerEvents="stroke"
                      style={{ cursor: 'help' }}
                      onMouseMove={show}
                      onMouseLeave={hideTip}
                      onClick={pick}
                    />
                    <g className="fp-chip" transform={`translate(${c.x + c.w / 2 - w / 2} ${c.y + 0.4})`} onMouseMove={show} onMouseLeave={hideTip} onClick={pick}>
                      <rect width={w} height={0.9} rx={0.45} />
                      <circle cx={0.45} cy={0.45} r={0.22} fill={z.color} stroke="#b45309" strokeWidth={0.05} strokeDasharray="0.05 0.08" />
                      <text x={0.82} y={0.47}>
                        {text}
                      </text>
                    </g>
                  </g>
                );
              })}
          </g>
        )}

        {/* Vastu badges */}
        {layers.vastu &&
          plan.rooms
            .filter((r) => !r.noVastu)
            .map((r) => {
              const a = assessments.get(r.id)!;
              const bx = r.exterior ? r.x + 0.8 : r.x + r.width - 0.6;
              const by = r.exterior ? r.y + 0.8 : r.y + 0.6;
              const ok = a.status === 'ok';
              return (
                <g
                  key={r.id}
                  className="fp-badge"
                  transform={`translate(${bx} ${by})`}
                  onMouseMove={(e) => tip(e, `${ok ? '✓' : '⚠'} ${r.name}`, a.message)}
                  onMouseLeave={hideTip}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ type: 'room', id: r.id });
                  }}
                >
                  <circle r={0.42} fill={ok ? 'var(--ok)' : 'var(--warn)'} stroke="var(--card)" strokeWidth={0.08} />
                  <text
                    x={0}
                    y={0.02}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 0.52, fontWeight: 800, fill: '#fff' }}
                  >
                    {ok ? '✓' : '!'}
                  </text>
                </g>
              );
            })}

        {/* Selection */}
        {selectedRoom && (
          <polygon
            points={pts(roomPolygon(plan, selectedRoom))}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={0.16}
            pointerEvents="none"
          />
        )}
        {selection?.type === 'zone' &&
          grid
            .filter((c) => c.zone === selection.zone)
            .map((c) => (
              <rect key="zsel" x={c.x} y={c.y} width={c.w} height={c.h} fill="none" stroke="var(--accent)" strokeWidth={0.16} pointerEvents="none" />
            ))}
      </g>

      {/* ── Gates on boundary ───────────────────────────── */}
      {plan.gates.map((g) => {
        const [a, b] = plotEdge(plan, g.side);
        const p1 = pointAlong(a, b, g.from);
        const p2 = pointAlong(a, b, g.from + g.width);
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const d: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
        // outward normal (plot is NW,NE,SE,SW clockwise); edges from plotEdge for S/W run W→E / N→S
        const flip = g.side === 'south' || g.side === 'west' ? -1 : 1;
        const inward: Pt = [-d[1] * flip, d[0] * flip];
        const lw = g.width / g.leaves;
        const hinges: [Pt, Pt][] = g.leaves === 2 ? [[p1, pointAlong(a, b, g.from + lw)], [p2, pointAlong(a, b, g.from + lw)]] : [[p1, p2]];
        const { p, angle } = edgeMid(p1, p2, 1.5 * flip);
        return (
          <g key={g.id} pointerEvents="none">
            <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="var(--site)" strokeWidth={0.3} />
            {hinges.map(([h, c], i) => {
              const o: Pt = [h[0] + inward[0] * lw, h[1] + inward[1] * lw];
              const cross = (o[0] - h[0]) * (c[1] - h[1]) - (o[1] - h[1]) * (c[0] - h[0]);
              return (
                <g key={i}>
                  {layers.doors && (
                    <>
                      <line className="fp-gate" x1={h[0]} y1={h[1]} x2={o[0]} y2={o[1]} />
                      <path className="fp-arc" d={`M${o[0]} ${o[1]} A${lw} ${lw} 0 0 ${cross > 0 ? 1 : 0} ${c[0]} ${c[1]}`} />
                    </>
                  )}
                </g>
              );
            })}
            <rect x={p1[0] - 0.2} y={p1[1] - 0.2} width={0.4} height={0.4} fill="var(--ink)" />
            <rect x={p2[0] - 0.2} y={p2[1] - 0.2} width={0.4} height={0.4} fill="var(--ink)" />
            <text
              className="fp-sublabel"
              style={{ fontSize: 0.55, fontWeight: 600, fill: 'var(--accent)' }}
              x={p[0]}
              y={p[1]}
              transform={`rotate(${angle} ${p[0]} ${p[1]})`}
            >
              {g.label}
            </text>
          </g>
        );
      })}

      {/* ── Dimensions ──────────────────────────────────── */}
      {layers.dimensions && (
        <g>
          {/* plot boundary */}
          <DimLine a={NW} b={NE} offset={6} label={`${formatFeet(plan.plot.sides.north)} North`} ticks strong />
          <DimLine a={NE} b={SE} offset={5.5} label={`${formatFeet(plan.plot.sides.east)} East`} ticks strong />
          <DimLine a={SE} b={SW} offset={5.5} label={`${formatFeet(plan.plot.sides.south)} South`} ticks strong />
          <DimLine a={SW} b={NW} offset={7.5} label={`${formatFeet(plan.plot.sides.west)} West (party wall)`} ticks strong />
          {/* west chain: setback | house | setback */}
          <DimLine a={[ox, houseTop]} b={[ox, 0]} offset={3.5} label={formatFeet(houseTop)} />
          <DimLine a={[ox, houseBottom]} b={[ox, houseTop]} offset={3.5} label={`${formatFeet(plan.house.depth)} house`} strong />
          <DimLine a={[ox, SW[1]]} b={[ox, houseBottom]} offset={3.5} label={formatFeet(SW[1] - houseBottom)} />
          {/* north chain inside setback: house width | east setback */}
          <DimLine a={[ox, houseTop]} b={[ox + plan.house.width, houseTop]} offset={2.1} label={`${formatFeet(plan.house.width)} house`} strong />
          <DimLine
            a={[ox + plan.house.width, houseTop]}
            b={[xAtY(eNE, eSE, houseTop), houseTop]}
            offset={2.1}
            label={formatFeet(xAtY(eNE, eSE, houseTop) - ox - plan.house.width)}
          />
          {/* east setback at living-room level */}
          {(() => {
            const yy = oy + 22;
            const xb = xAtY(eNE, eSE, yy);
            return <DimLine a={[ox + plan.house.width, yy]} b={[xb, yy]} offset={0} label={`${formatFeet(xb - ox - plan.house.width)} setback`} />;
          })()}
          {/* porch clear width at its south end */}
          {exterior.map((r) => {
            const yy = oy + r.y + r.height;
            const xb = xAtY(eNE, eSE, yy);
            return <DimLine key={r.id} a={[ox + r.x, yy]} b={[xb, yy]} offset={0} label={`${formatFeet(xb - ox - r.x)} clear`} />;
          })}
          {/* scale bar */}
          <g transform={`translate(${vb.x + 1.2} ${vb.y + vb.h - 1.6})`} pointerEvents="none">
            {[0, 1].map((i) => (
              <rect key={i} x={i * 5} y={0} width={5} height={0.35} fill={i ? 'var(--card)' : 'var(--ink)'} stroke="var(--ink)" strokeWidth={0.04} />
            ))}
            {[0, 5, 10].map((v) => (
              <text key={v} className="fp-dim-text" x={v} y={-0.55} style={{ fontSize: 0.55 }}>
                {v}
              </text>
            ))}
            <text className="fp-dim-text" x={11.6} y={0.18} style={{ fontSize: 0.55 }}>
              ft
            </text>
          </g>
        </g>
      )}

      {layers.compass && (
        <Compass x={vb.x + 4.4} y={vb.y + 4.6} r={2.5} rotation={plan.plot.northRotationDeg} />
      )}
    </svg>
  );
}
