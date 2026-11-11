import type { Pt } from '../data/types';

interface DimProps {
  a: Pt;
  b: Pt;
  /** Perpendicular offset. Positive = to the left of a→b in screen space (outward for clockwise edges). */
  offset: number;
  label: string;
  /** Architectural 45° ticks in addition to arrowheads. */
  ticks?: boolean;
  strong?: boolean;
}

/** Aligned dimension line with extension lines, arrowheads and an upright label. */
export function DimLine({ a, b, offset, label, ticks, strong }: DimProps) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) return null;
  const d: Pt = [dx / L, dy / L];
  const n: Pt = [d[1], -d[0]];
  const sgn = offset === 0 ? 0 : Math.sign(offset);
  const A: Pt = [a[0] + n[0] * offset, a[1] + n[1] * offset];
  const B: Pt = [b[0] + n[0] * offset, b[1] + n[1] * offset];
  const ah = Math.min(0.42, L / 4);
  const aw = 0.14;
  const arrow = (tip: Pt, dir: 1 | -1) => {
    const bx = tip[0] + d[0] * ah * dir;
    const by = tip[1] + d[1] * ah * dir;
    return `M${tip[0]} ${tip[1]} L${bx + n[0] * aw} ${by + n[1] * aw} L${bx - n[0] * aw} ${by - n[1] * aw}Z`;
  };
  const tk = 0.32;
  const tick = (p: Pt) =>
    `M${p[0] - (d[0] + n[0]) * tk} ${p[1] - (d[1] + n[1]) * tk} L${p[0] + (d[0] + n[0]) * tk} ${p[1] + (d[1] + n[1]) * tk}`;

  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90.01 || angle < -89.99) angle += 180; // keep text upright
  // label sits on the outward side of the dimension line
  const lo = 0.5 * (sgn === 0 ? 1 : sgn);
  const M: Pt = [(A[0] + B[0]) / 2 + n[0] * lo, (A[1] + B[1]) / 2 + n[1] * lo];
  const ext = (p: Pt, P: Pt) =>
    sgn === 0 ? null : (
      <line
        className="fp-dim-line"
        x1={p[0] + n[0] * 0.25 * sgn}
        y1={p[1] + n[1] * 0.25 * sgn}
        x2={P[0] + n[0] * 0.3 * sgn}
        y2={P[1] + n[1] * 0.3 * sgn}
      />
    );
  return (
    <g pointerEvents="none">
      {ext(a, A)}
      {ext(b, B)}
      <line className="fp-dim-line" x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} />
      <path className="fp-dim-arrow" d={`${arrow(A, 1)} ${arrow(B, -1)}`} />
      {ticks && <path className="fp-dim-line" style={{ strokeWidth: 0.06 }} d={`${tick(A)} ${tick(B)}`} />}
      <text
        className={`fp-dim-text${strong ? ' strong' : ''}`}
        x={M[0]}
        y={M[1]}
        transform={`rotate(${angle} ${M[0]} ${M[1]})`}
      >
        {label}
      </text>
    </g>
  );
}

export function Compass({ x, y, r, rotation }: { x: number; y: number; r: number; rotation: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} pointerEvents="none" aria-label="Compass: north up, east right">
      <circle r={r} fill="var(--card)" stroke="var(--ink)" strokeWidth={0.06} />
      <circle r={r * 0.78} fill="none" stroke="var(--dim)" strokeWidth={0.03} />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1={0} y1={-r} x2={0} y2={-r * 0.82} stroke="var(--ink)" strokeWidth={0.06} transform={`rotate(${a})`} />
      ))}
      <path d={`M0 ${-r * 0.72} L${r * 0.2} 0 L0 ${r * 0.12} L${-r * 0.2} 0Z`} fill="var(--ink)" />
      <path d={`M0 ${r * 0.72} L${r * 0.2} 0 L0 ${-r * 0.12} L${-r * 0.2} 0Z`} fill="none" stroke="var(--ink)" strokeWidth={0.05} />
      <g style={{ fontSize: r * 0.36, fontWeight: 700 }} fill="var(--label)" textAnchor="middle" dominantBaseline="central">
        <text y={-r - r * 0.32}>N</text>
        <text x={r + r * 0.32} style={{ fontWeight: 500, fill: 'var(--sublabel)' }}>E</text>
        <text y={r + r * 0.32} style={{ fontWeight: 500, fill: 'var(--sublabel)' }}>S</text>
        <text x={-r - r * 0.32} style={{ fontWeight: 500, fill: 'var(--sublabel)' }}>W</text>
      </g>
    </g>
  );
}
