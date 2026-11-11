import type { FloorPlan, Room, Zone } from '../data/types';
import { formatArea, formatDims, formatFeet } from '../lib/format';
import { brahmasthanUse, type RoomAssessment, type ZoneCell, type GridBasis } from '../lib/vastu';
import type { CheckResult } from '../lib/verify';
import type { Selection } from './FloorPlan';
import { roomArea } from '../lib/areas';

interface Props {
  plan: FloorPlan;
  selection: Selection;
  grid: ZoneCell[];
  basis: GridBasis;
  assessments: Map<string, RoomAssessment>;
  checks: CheckResult[];
  onSelect: (s: Selection) => void;
}

const levelIcon = { pass: '✓', warn: '⚠', fail: '✗' } as const;
const levelColor = { pass: 'text-[var(--ok)]', warn: 'text-[var(--warn)]', fail: 'text-red-600 dark:text-red-400' } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-black/5 py-4 first:border-t-0 first:pt-0 dark:border-white/10">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{title}</h3>
      {children}
    </section>
  );
}

function ZoneChip({ plan, zone }: { plan: FloorPlan; zone: Zone }) {
  const z = plan.zones[zone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2 py-0.5 text-xs font-medium dark:border-white/15">
      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ background: z.color }} />
      {zone} · {z.label}
    </span>
  );
}

function StatusLine({ a }: { a: RoomAssessment }) {
  if (a.status === 'na') return <p className="text-sm text-neutral-500">{a.message}</p>;
  const ok = a.status === 'ok';
  return (
    <div
      className={`flex gap-2 rounded-lg p-3 text-sm ${
        ok ? 'bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
      }`}
    >
      <span className="mt-px font-bold">{ok ? '✓' : '⚠'}</span>
      <span>{a.message}</span>
    </div>
  );
}

function ShareBar({ plan, a }: { plan: FloorPlan; a: RoomAssessment }) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10">
        {a.shares.map((s) => (
          <div key={s.zone} style={{ width: `${s.share * 100}%`, background: plan.zones[s.zone].color }} title={`${s.zone} ${Math.round(s.share * 100)}%`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
        {a.shares.map((s) => (
          <span key={s.zone} className="tabular-nums">
            {s.zone} {Math.round(s.share * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function RoomDetail({ plan, room, a, onSelect }: { plan: FloorPlan; room: Room; a: RoomAssessment; onSelect: Props['onSelect'] }) {
  const area = roomArea(plan, room);
  const parent = room.parent ? plan.rooms.find((r) => r.id === room.parent) : undefined;
  const children = plan.rooms.filter((r) => r.parent === room.id);
  return (
    <>
      <Section title="Dimensions">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500 dark:text-neutral-400">Clear size (E–W × N–S)</dt>
          <dd className="font-semibold tabular-nums">{formatDims(room.width, room.height)}</dd>
          <dt className="text-neutral-500 dark:text-neutral-400">{children.length ? 'Area (net / gross)' : 'Area'}</dt>
          <dd className="font-semibold tabular-nums">
            {children.length ? `${formatArea(area.net)} / ${area.gross.toFixed(1)}` : formatArea(area.net)}
          </dd>
          {room.nominal && (
            <>
              <dt className="text-neutral-500 dark:text-neutral-400">Nominal (brief)</dt>
              <dd className="tabular-nums">{room.nominal}</dd>
            </>
          )}
          <dt className="text-neutral-500 dark:text-neutral-400">Position (from house NW)</dt>
          <dd className="tabular-nums">
            {formatFeet(room.x)} E, {formatFeet(room.y)} S
          </dd>
        </dl>
        {(parent || children.length > 0) && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {parent ? (
              <>
                Carved inside{' '}
                <button className="text-[var(--accent)] underline-offset-2 hover:underline" onClick={() => onSelect({ type: 'room', id: parent.id })}>
                  {parent.name}
                </button>
              </>
            ) : (
              <>Includes {children.map((c) => c.name).join(', ')} in its footprint.</>
            )}
          </p>
        )}
      </Section>

      <Section title="Vastu">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">Intended</span>
          <ZoneChip plan={plan} zone={room.vastuZone} />
          <span className="text-neutral-500 dark:text-neutral-400">Actual</span>
          <ZoneChip plan={plan} zone={a.dominant} />
        </div>
        {a.status !== 'na' && (
          <div className="mb-3">
            <ShareBar plan={plan} a={a} />
          </div>
        )}
        <StatusLine a={a} />
        <p className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{room.rationale}</p>
      </Section>

      {room.notes.length > 0 && (
        <Section title="Notes">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-neutral-700 dark:text-neutral-300">
            {room.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Section>
      )}

      {room.furnitureTips.length > 0 && (
        <Section title="Suggested furniture layout">
          <ul className="space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
            {room.furnitureTips.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-neutral-400">▸</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Turn on the Furniture layer to see this drawn to scale.</p>
        </Section>
      )}
    </>
  );
}

function ZoneDetail({ plan, zone, grid, assessments, basis, onSelect }: { plan: FloorPlan; zone: Zone; grid: ZoneCell[]; assessments: Map<string, RoomAssessment>; basis: GridBasis; onSelect: Props['onSelect'] }) {
  const z = plan.zones[zone];
  const cell = grid.find((c) => c.zone === zone)!;
  const rooms = plan.rooms.filter((r) => assessments.get(r.id)?.dominant === zone && !r.noVastu);
  const brahma = zone === 'C' ? brahmasthanUse(plan, grid) : [];
  return (
    <>
      <Section title="Zone">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-black/15" style={{ background: z.color }} />
          <div>
            <p className="font-semibold">
              {z.label} <span className="font-normal text-neutral-500">· {z.name}</span>
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Element: {z.element}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{z.meaning}</p>
        <p className="mt-2 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">Ideal for: </span>
          {z.idealFor}
        </p>
        <p className="mt-2 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          Cell size {formatDims(cell.w, cell.h)} ({basis === 'house' ? 'house footprint' : 'plot'} grid)
        </p>
      </Section>
      <Section title={zone === 'C' ? 'What occupies the Brahmasthan' : 'Rooms mainly in this zone'}>
        {zone === 'C' ? (
          <ul className="space-y-1 text-sm">
            {brahma.map(({ room, area }) => (
              <li key={room.id} className="flex justify-between gap-2">
                <button className="text-left text-[var(--accent)] hover:underline" onClick={() => onSelect({ type: 'room', id: room.id })}>
                  {room.name}
                </button>
                <span className="text-neutral-500 tabular-nums">{area.toFixed(1)} sq ft</span>
              </li>
            ))}
            <li className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Circulation (lobby) and open-plan living areas are acceptable here. Avoid adding pillars, toilets, a stair or heavy storage in this cell.
            </li>
          </ul>
        ) : rooms.length ? (
          <ul className="space-y-1 text-sm">
            {rooms.map((r) => (
              <li key={r.id}>
                <button className="text-[var(--accent)] hover:underline" onClick={() => onSelect({ type: 'room', id: r.id })}>
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No room is mainly in this zone (open land, setback or walls).</p>
        )}
      </Section>
    </>
  );
}

function Overview({ plan, checks, assessments }: { plan: FloorPlan; checks: CheckResult[]; assessments: Map<string, RoomAssessment> }) {
  const groups = ['Stacks', 'Geometry', 'Setbacks', 'Porch'] as const;
  const scored = [...assessments.values()].filter((a) => a.status !== 'na');
  const ok = scored.filter((a) => a.status === 'ok').length;
  const failed = checks.filter((c) => c.level === 'fail').length;
  return (
    <>
      <Section title="How to use">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Click a room for its dimensions, Vastu reasoning and furniture plan. Click a zone chip, such as <em>NE · Water</em>, for zone details. Use the layer toggles above the plan to show or hide detail.
        </p>
      </Section>
      <Section title="Summary">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/5">
            <p className="text-lg font-semibold tabular-nums">{ok}/{scored.length}</p>
            <p className="text-[11px] text-neutral-500">Vastu ✓</p>
          </div>
          <div className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/5">
            <p className={`text-lg font-semibold tabular-nums ${failed ? 'text-red-600' : ''}`}>{checks.length - failed}/{checks.length}</p>
            <p className="text-[11px] text-neutral-500">Checks pass</p>
          </div>
          <div className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/5">
            <p className="text-lg font-semibold tabular-nums">{formatFeet(plan.house.width)}</p>
            <p className="text-[11px] text-neutral-500">× {formatFeet(plan.house.depth)}</p>
          </div>
        </div>
      </Section>
      <Section title="Arithmetic check">
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-1 text-xs font-medium text-neutral-500">{g}</p>
              <ul className="space-y-1">
                {checks
                  .filter((c) => c.group === g)
                  .map((c, i) => (
                    <li key={i}>
                      <details className="group text-sm">
                        <summary className="flex cursor-pointer list-none gap-2 rounded px-1 py-0.5 hover:bg-black/[0.03] dark:hover:bg-white/5">
                          <span className={`font-bold ${levelColor[c.level]}`}>{levelIcon[c.level]}</span>
                          <span className="flex-1">{c.label}</span>
                          <span className="text-neutral-400 transition group-open:rotate-90">›</span>
                        </summary>
                        <p className="mt-1 mb-2 ml-6 text-xs leading-relaxed text-neutral-600 tabular-nums dark:text-neutral-400">{c.detail}</p>
                      </details>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Site notes">
        <ul className="space-y-3">
          {plan.siteNotes.map((n, i) => (
            <li key={i} className="text-sm">
              <p className="font-medium">
                <span className={n.level === 'warn' ? 'text-[var(--warn)]' : 'text-neutral-400'}>{n.level === 'warn' ? '⚠' : 'ⓘ'}</span> {n.title}
              </p>
              <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{n.body}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

export function SidePanel(props: Props) {
  const { plan, selection, assessments, onSelect } = props;
  const room = selection?.type === 'room' ? plan.rooms.find((r) => r.id === selection.id) : undefined;
  const zone = selection?.type === 'zone' ? selection.zone : undefined;
  const title = room ? room.name : zone ? `${plan.zones[zone].label} zone` : 'Site overview';
  const subtitle = room
    ? `${room.category[0].toUpperCase()}${room.category.slice(1)} · ${formatDims(room.width, room.height)}`
    : zone
      ? plan.zones[zone].name
      : `${plan.meta.location} · ${plan.meta.floor}`;
  return (
    <div key={room?.id ?? zone ?? 'overview'} className="panel-anim rounded-2xl border border-black/[0.07] bg-[var(--card)] shadow-sm dark:border-white/10">
      <header className="flex items-start justify-between gap-3 border-b border-black/5 p-4 dark:border-white/10">
        <div>
          <h2 className="text-lg leading-tight font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-neutral-500 tabular-nums dark:text-neutral-400">{subtitle}</p>
        </div>
        {selection && (
          <button
            onClick={() => onSelect(null)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close details"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>
      <div className="p-4">
        {room ? (
          <RoomDetail plan={plan} room={room} a={assessments.get(room.id)!} onSelect={onSelect} />
        ) : zone ? (
          <ZoneDetail plan={plan} zone={zone} grid={props.grid} assessments={assessments} basis={props.basis} onSelect={onSelect} />
        ) : (
          <Overview plan={plan} checks={props.checks} assessments={assessments} />
        )}
      </div>
    </div>
  );
}
