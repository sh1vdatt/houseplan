import type { Dir, FurnitureItem } from '../data/types';

/**
 * Furniture symbols. Each "oriented" symbol is drawn canonically with its back
 * (headboard / sofa back / cistern / car rear) at the top of a W×L box, then
 * rotated into place according to `facing`.
 */
function orient(item: FurnitureItem): { transform: string; W: number; L: number } {
  const { x, y, w, h } = item;
  switch (item.facing ?? 'N') {
    case 'N':
      return { transform: `translate(${x} ${y})`, W: w, L: h };
    case 'S':
      return { transform: `translate(${x + w} ${y + h}) rotate(180)`, W: w, L: h };
    case 'E':
      return { transform: `translate(${x + w} ${y}) rotate(90)`, W: h, L: w };
    case 'W':
      return { transform: `translate(${x} ${y + h}) rotate(-90)`, W: h, L: w };
  }
}

function Bed({ W, L }: { W: number; L: number }) {
  const pw = W >= 4 ? (W - 0.9) / 2 : W - 0.6;
  return (
    <>
      <rect className="fp-furn" width={W} height={L} rx={0.12} />
      <rect className="fp-furn" width={W} height={0.35} />
      <rect className="fp-furn" x={0.3} y={0.55} width={pw} height={1.15} rx={0.25} />
      {W >= 4 && <rect className="fp-furn" x={0.6 + pw} y={0.55} width={pw} height={1.15} rx={0.25} />}
      <path className="fp-furn-line" d={`M0 ${L * 0.38} H${W} M${W} ${L * 0.38} L${W - 1.1} ${L * 0.38 + 1.1}`} />
    </>
  );
}

function Sofa({ W, L }: { W: number; L: number }) {
  const back = Math.min(0.7, L * 0.25);
  const arm = 0.55;
  const n = Math.max(1, Math.round((W - 2 * arm) / 2));
  const cw = (W - 2 * arm) / n;
  return (
    <>
      <rect className="fp-furn" width={W} height={L} rx={0.25} />
      <rect className="fp-furn" width={W} height={back} rx={0.2} />
      <rect className="fp-furn" y={back} width={arm} height={L - back} rx={0.15} />
      <rect className="fp-furn" x={W - arm} y={back} width={arm} height={L - back} rx={0.15} />
      {Array.from({ length: n - 1 }, (_, i) => (
        <line key={i} className="fp-furn-line" x1={arm + cw * (i + 1)} x2={arm + cw * (i + 1)} y1={back} y2={L} />
      ))}
    </>
  );
}

function WC({ W, L }: { W: number; L: number }) {
  const tank = L * 0.3;
  return (
    <>
      <rect className="fp-furn" x={W * 0.05} width={W * 0.9} height={tank} rx={0.08} />
      <ellipse className="fp-furn" cx={W / 2} cy={tank + (L - tank) / 2} rx={W * 0.36} ry={(L - tank) / 2 - 0.02} />
    </>
  );
}

function Car({ W, L }: { W: number; L: number }) {
  // rear at top (v=0), front at bottom (v=L)
  return (
    <>
      <rect className="fp-furn" width={W} height={L} rx={0.9} />
      <rect className="fp-furn" x={0.5} y={L * 0.16} width={W - 1} height={L * 0.55} rx={0.5} />
      <path className="fp-furn-line" d={`M0.6 ${L * 0.71} Q${W / 2} ${L * 0.77} ${W - 0.6} ${L * 0.71}`} />
      <path className="fp-furn-line" d={`M0.6 ${L * 0.2} Q${W / 2} ${L * 0.16} ${W - 0.6} ${L * 0.2}`} />
      <path className="fp-furn-line" d={`M0 ${L * 0.62} h-0.35 M${W} ${L * 0.62} h0.35`} />
    </>
  );
}

const ORIENTED = { bed: Bed, sofa: Sofa, wc: WC, car: Car } as const;

function Dining({ item }: { item: FurnitureItem }) {
  const { x, y, w, h } = item;
  const seats = item.seats ?? 4;
  const ends = seats >= 6 ? 1 : 0;
  const perSide = (seats - 2 * ends) / 2;
  const c = 1.35;
  const gap = 0.2;
  const chairs: [number, number][] = [];
  const horizontal = w >= h;
  const long = horizontal ? w : h;
  for (let i = 0; i < perSide; i++) {
    const t = (long / perSide) * (i + 0.5) - c / 2;
    if (horizontal) chairs.push([x + t, y - c - gap], [x + t, y + h + gap]);
    else chairs.push([x - c - gap, y + t], [x + w + gap, y + t]);
  }
  if (ends) {
    if (horizontal) chairs.push([x - c - gap, y + h / 2 - c / 2], [x + w + gap, y + h / 2 - c / 2]);
    else chairs.push([x + w / 2 - c / 2, y - c - gap], [x + w / 2 - c / 2, y + h + gap]);
  }
  return (
    <g>
      {chairs.map(([cx, cy], i) => (
        <rect key={i} className="fp-furn" x={cx} y={cy} width={c} height={c} rx={0.3} />
      ))}
      <rect className="fp-furn" x={x} y={y} width={w} height={h} rx={0.15} />
    </g>
  );
}

function Simple({ item }: { item: FurnitureItem }) {
  const { kind, x, y, w, h } = item;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (kind) {
    case 'wardrobe':
    case 'cabinet':
      return (
        <g>
          <rect className="fp-furn" x={x} y={y} width={w} height={h} />
          <path className="fp-furn-line" d={w < h ? `M${cx} ${y} V${y + h}` : `M${x} ${cy} H${x + w}`} />
        </g>
      );
    case 'basin':
      return (
        <g>
          <rect className="fp-furn" x={x} y={y} width={w} height={h} rx={0.08} />
          <ellipse className="fp-furn" cx={cx} cy={cy} rx={Math.min(w, 2) * 0.32} ry={h * 0.3} />
        </g>
      );
    case 'sink':
      return (
        <g>
          <rect className="fp-furn" x={x} y={y} width={w} height={h} rx={0.06} />
          <rect className="fp-furn" x={x + 0.2} y={y + 0.2} width={w - 0.4} height={h - 0.4} rx={0.25} />
          <circle className="fp-furn-line" cx={cx} cy={cy} r={0.12} />
        </g>
      );
    case 'hob': {
      const r = Math.min(w, h) * 0.17;
      return (
        <g>
          <rect className="fp-furn" x={x} y={y} width={w} height={h} rx={0.06} />
          {[
            [0.3, 0.27],
            [0.7, 0.27],
            [0.3, 0.73],
            [0.7, 0.73],
          ].map(([u, v], i) => (
            <circle key={i} className="fp-furn-line" cx={x + w * u} cy={y + h * v} r={r} />
          ))}
        </g>
      );
    }
    case 'shower':
      return (
        <g>
          <rect className="fp-furn-line" x={x} y={y} width={w} height={h} strokeDasharray="0.2 0.15" />
          <path className="fp-furn-line" d={`M${x} ${y} L${x + w} ${y + h} M${x + w} ${y} L${x} ${y + h}`} opacity={0.5} />
          <circle className="fp-furn" cx={cx} cy={cy} r={0.18} />
        </g>
      );
    case 'mat':
      return <rect className="fp-furn-line" x={x} y={y} width={w} height={h} rx={0.3} strokeDasharray="0.25 0.15" />;
    case 'mandir':
      return (
        <g>
          <rect className="fp-furn" x={x} y={y} width={w} height={h} />
          <rect className="fp-furn" x={x + 0.3} y={y + 0.5} width={w - 0.6} height={h - 1} />
          <circle className="fp-furn-line" cx={x + 0.3} cy={cy} r={0.22} />
        </g>
      );
    case 'tv':
      return <rect className="fp-furn" x={x} y={y} width={w} height={h} style={{ fill: 'var(--furn)' }} />;
    case 'counter':
      return <rect className="fp-furn" x={x} y={y} width={w} height={h} style={{ fill: 'var(--floor-service)' }} />;
    default:
      return <rect className="fp-furn" x={x} y={y} width={w} height={h} rx={kind === 'table' ? 0.2 : 0.06} />;
  }
}

export function FurnitureSymbol({ item }: { item: FurnitureItem }) {
  let shape;
  if (item.kind in ORIENTED) {
    const Comp = ORIENTED[item.kind as keyof typeof ORIENTED];
    const { transform, W, L } = orient(item);
    shape = (
      <g transform={transform}>
        <Comp W={W} L={L} />
      </g>
    );
  } else if (item.kind === 'dining') {
    shape = <Dining item={item} />;
  } else {
    shape = <Simple item={item} />;
  }
  const showLabel = item.label && item.kind !== 'tv';
  // Bed labels go below the pillows; others centred.
  const labelPos = labelAnchor(item);
  return (
    <g pointerEvents="none">
      {shape}
      {showLabel && (
        <text className="fp-furn-text" x={labelPos[0]} y={labelPos[1]}>
          {item.label}
        </text>
      )}
    </g>
  );
}

function labelAnchor(item: FurnitureItem): [number, number] {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;
  if (item.kind !== 'bed') return [cx, cy];
  const off: Record<Dir, [number, number]> = {
    N: [0, item.h * 0.15],
    S: [0, -item.h * 0.15],
    E: [-item.w * 0.15, 0],
    W: [item.w * 0.15, 0],
  };
  const [dx, dy] = off[item.facing ?? 'N'];
  return [cx + dx, cy + dy];
}
