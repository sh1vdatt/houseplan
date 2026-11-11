import { useCallback, useEffect, useMemo, useState } from 'react';
import { floorplan } from './data/floorplan';
import { FloorPlan, type Layers, type Selection, type TooltipState } from './components/FloorPlan';
import { SidePanel } from './components/SidePanel';
import { RoomSchedule } from './components/RoomSchedule';
import { assessRoom, zoneGrid, type GridBasis } from './lib/vastu';
import { runChecks } from './lib/verify';
import type { Zone } from './data/types';

const LAYER_LABELS: { key: keyof Layers; label: string }[] = [
  { key: 'furniture', label: 'Furniture' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'vastu', label: 'Vastu zones' },
  { key: 'doors', label: 'Door swings' },
  { key: 'compass', label: 'Compass' },
];

const ZONE_LEGEND: Zone[] = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];

function readStore<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export default function App() {
  const plan = floorplan;
  const [layers, setLayers] = useState<Layers>(() =>
    readStore('layers', { furniture: true, dimensions: true, vastu: true, doors: true, compass: true }),
  );
  const [basis, setBasis] = useState<GridBasis>(() => readStore('basis', 'house'));
  const [selection, setSelection] = useState<Selection>(() => {
    const q = new URLSearchParams(window.location.search);
    const room = q.get('room');
    const zone = q.get('zone') as Zone | null;
    if (room && plan.rooms.some((r) => r.id === room)) return { type: 'room', id: room };
    if (zone && zone in plan.zones) return { type: 'zone', zone };
    return null;
  });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => writeStore('layers', layers), [layers]);
  useEffect(() => writeStore('basis', basis), [basis]);
  // keep the selection in the URL so a room/zone view can be shared
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('zone');
    if (selection?.type === 'room') url.searchParams.set('room', selection.id);
    if (selection?.type === 'zone') url.searchParams.set('zone', selection.zone);
    window.history.replaceState(null, '', url);
  }, [selection]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelection(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const grid = useMemo(() => zoneGrid(plan, basis), [plan, basis]);
  const assessments = useMemo(() => new Map(plan.rooms.map((r) => [r.id, assessRoom(plan, r, grid)])), [plan, grid]);
  const checks = useMemo(() => runChecks(plan), [plan]);

  const select = useCallback((s: Selection) => {
    setSelection(s);
    setTooltip(null);
    // on small screens, bring the panel into view
    if (s && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--label)]">
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-3 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{plan.meta.title}</h1>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {plan.meta.location} · Corner plot {plan.plot.sides.west}′/{plan.plot.sides.east}′ × {plan.plot.sides.south}′/
            {plan.plot.sides.north}′ ·{' '}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              G+1 — first floor to be added later
            </span>
          </p>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[var(--card)] px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/5"
          aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
        >
          {dark ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 10a3 3 0 100-6 3 3 0 000 6zm0 2a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 9a1 1 0 110 2H3a1 1 0 110-2h1zm13 0a1 1 0 110 2h-1a1 1 0 110-2h1zM5.05 5.05a1 1 0 011.414 0l.707.707A1 1 0 015.757 7.17l-.707-.707a1 1 0 010-1.414zm9.193 9.193a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM14.95 5.05a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM5.757 14.243a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
          {dark ? 'Light' : 'Dark'}
        </button>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-4 px-4 pb-10 sm:px-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Plan layers">
          {LAYER_LABELS.map(({ key, label }) => (
            <label
              key={key}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition select-none ${
                layers[key]
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-black/10 bg-[var(--card)] text-neutral-600 hover:border-black/25 dark:border-white/15 dark:text-neutral-300'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={layers[key]}
                onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))}
              />
              <span
                aria-hidden
                className={`grid h-3.5 w-3.5 place-items-center rounded-[4px] border text-[10px] leading-none ${
                  layers[key] ? 'border-current' : 'border-neutral-400'
                }`}
              >
                {layers[key] ? '✓' : ''}
              </span>
              {label}
            </label>
          ))}
          {layers.vastu && (
            <div className="ml-auto inline-flex items-center gap-2 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Grid over</span>
              <div className="inline-flex rounded-full border border-black/10 bg-[var(--card)] p-0.5 dark:border-white/15" role="radiogroup" aria-label="Vastu grid basis">
                {(['house', 'plot'] as const).map((b) => (
                  <button
                    key={b}
                    role="radio"
                    aria-checked={basis === b}
                    onClick={() => setBasis(b)}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      basis === b ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {b === 'house' ? 'House' : 'Plot'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="relative rounded-2xl border border-black/[0.07] bg-[var(--card)] p-2 shadow-sm sm:p-4 dark:border-white/10">
            <div className="absolute top-3 right-3 z-10 inline-flex items-center overflow-hidden rounded-lg border border-black/10 bg-[var(--card)] text-sm shadow-sm dark:border-white/15">
              <button className="px-2.5 py-1 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} disabled={zoom <= 1} aria-label="Zoom out">
                −
              </button>
              <button className="min-w-[3.5rem] border-x border-black/10 px-2 py-1 tabular-nums hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10" onClick={() => setZoom(1)} aria-label="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <button className="px-2.5 py-1 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} aria-label="Zoom in">
                +
              </button>
            </div>
            <div className="overflow-auto">
              <div className="mx-auto" style={{ width: `${zoom * 100}%`, maxWidth: `${780 * zoom}px` }}>
                <FloorPlan plan={plan} layers={layers} basis={basis} selection={selection} onSelect={select} onTooltip={setTooltip} />
              </div>
            </div>
            {layers.vastu && (
              <div className="mt-3 border-t border-black/5 px-2 pt-3 dark:border-white/10">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  {ZONE_LEGEND.map((z) => (
                    <button
                      key={z}
                      onClick={() => select({ type: 'zone', zone: z })}
                      className="inline-flex items-center gap-1.5 rounded px-1 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span
                        className={`h-3 w-3 rounded-sm ring-1 ring-black/20 ${z === 'C' ? 'outline-2 outline-offset-1 outline-amber-600 outline-dotted' : ''}`}
                        style={{ background: plan.zones[z].color }}
                      />
                      <span className="font-medium">{z}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">{plan.zones[z].element}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {basis === 'house'
                    ? '3×3 grid over the 26′ × 51′9″ built footprint, the usual basis for placing rooms.'
                    : '3×3 grid over the whole plot bounding box. Setbacks and the porch shift rooms toward the centre on this basis.'}{' '}
                  <span className="font-semibold text-[var(--ok)]">✓</span> compliant ·{' '}
                  <span className="font-semibold text-[var(--warn)]">!</span> compromise (hover for why).
                </p>
              </div>
            )}
          </section>

          <aside id="details" className="scroll-mt-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
            <SidePanel
              plan={plan}
              selection={selection}
              grid={grid}
              basis={basis}
              assessments={assessments}
              checks={checks}
              onSelect={select}
            />
          </aside>
        </div>

        <RoomSchedule plan={plan} assessments={assessments} selection={selection} onSelect={select} />
      </main>

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[280px] rounded-lg border border-black/10 bg-[var(--card)] px-3 py-2 text-xs shadow-lg dark:border-white/15"
          style={{
            left: Math.min(tooltip.x + 14, window.innerWidth - 296),
            top: Math.min(tooltip.y + 14, window.innerHeight - 140),
          }}
        >
          <p className="font-semibold">{tooltip.title}</p>
          <p className="mt-0.5 leading-relaxed text-neutral-600 dark:text-neutral-300">{tooltip.body}</p>
        </div>
      )}
    </div>
  );
}
