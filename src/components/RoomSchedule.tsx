import { useMemo, useState } from 'react';
import type { FloorPlan, Zone } from '../data/types';
import { formatArea, formatDims } from '../lib/format';
import { roomArea } from '../lib/areas';
import { polygonArea } from '../lib/geometry';
import type { RoomAssessment } from '../lib/vastu';
import type { Selection } from './FloorPlan';

type Key = 'name' | 'dims' | 'area' | 'zone' | 'actual' | 'status';
const ZONE_ORDER: Zone[] = ['NE', 'N', 'NW', 'E', 'C', 'W', 'SE', 'S', 'SW'];

interface Props {
  plan: FloorPlan;
  assessments: Map<string, RoomAssessment>;
  selection: Selection;
  onSelect: (s: Selection) => void;
}

export function RoomSchedule({ plan, assessments, selection, onSelect }: Props) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'zone', dir: 1 });
  const rows = useMemo(
    () =>
      plan.rooms.map((r) => {
        const a = assessments.get(r.id)!;
        const area = roomArea(plan, r);
        return { room: r, a, area };
      }),
    [plan, assessments],
  );
  const sorted = useMemo(() => {
    const val = (row: (typeof rows)[number]): string | number => {
      switch (sort.key) {
        case 'name':
          return row.room.name.toLowerCase();
        case 'dims':
          return row.room.width * 1000 + row.room.height;
        case 'area':
          return row.area.net;
        case 'zone':
          return ZONE_ORDER.indexOf(row.room.vastuZone);
        case 'actual':
          return ZONE_ORDER.indexOf(row.a.dominant);
        case 'status':
          return row.a.status === 'warn' ? 0 : row.a.status === 'ok' ? 1 : 2;
      }
    };
    return [...rows].sort((p, q) => {
      const a = val(p);
      const b = val(q);
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir;
    });
  }, [rows, sort]);

  const carpet = rows.filter((r) => !r.room.exterior).reduce((s, r) => s + r.area.net, 0);
  const builtUp = polygonArea(plan.house.footprint);

  const cols: { key: Key; label: string; className?: string }[] = [
    { key: 'name', label: 'Room' },
    { key: 'dims', label: 'Size (E–W × N–S)' },
    { key: 'area', label: 'Area', className: 'text-right' },
    { key: 'zone', label: 'Vastu zone' },
    { key: 'actual', label: 'Drawn in' },
    { key: 'status', label: 'Status' },
  ];

  const zoneCell = (z: Zone) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ background: plan.zones[z].color }} />
      {z}
    </span>
  );

  return (
    <section className="rounded-2xl border border-black/[0.07] bg-[var(--card)] shadow-sm dark:border-white/10">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
        <h2 className="text-base font-semibold">Room schedule</h2>
        <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          Carpet {formatArea(carpet)} · Built-up {formatArea(builtUp)} · Click a header to sort
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 dark:text-neutral-400">
              {cols.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                    className={`px-4 py-2 font-medium ${c.className ?? ''}`}
                  >
                    <button
                      className={`inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white ${active ? 'text-neutral-900 dark:text-white' : ''}`}
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? ((-s.dir) as 1 | -1) : 1 }))}
                    >
                      {c.label}
                      <span className="w-2 text-[10px]">{active ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ room, a, area }) => {
              const selected = selection?.type === 'room' && selection.id === room.id;
              return (
                <tr
                  key={room.id}
                  onClick={() => onSelect({ type: 'room', id: room.id })}
                  className={`cursor-pointer border-t border-black/5 dark:border-white/5 ${
                    selected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="px-4 py-2 font-medium">
                    {room.name}
                    {room.parent && <span className="ml-1 text-xs font-normal text-neutral-500">(in {plan.rooms.find((r) => r.id === room.parent)?.shortName ?? room.parent})</span>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                    {formatDims(room.width, room.height)}
                    {room.nominal && <span className="block text-xs text-neutral-500">nominal {room.nominal}</span>}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">
                    {area.net.toFixed(1)}
                    {area.net !== area.gross && <span className="block text-xs text-neutral-500">gross {area.gross.toFixed(1)}</span>}
                    {room.exterior && <span className="block text-xs text-neutral-500">within plot</span>}
                  </td>
                  <td className="px-4 py-2">{zoneCell(room.vastuZone)}</td>
                  <td className="px-4 py-2">{a.status === 'na' ? '—' : zoneCell(a.dominant)}</td>
                  <td className="px-4 py-2">
                    {a.status === 'ok' && <span className="font-semibold text-[var(--ok)]">✓ OK</span>}
                    {a.status === 'warn' && (
                      <span className="font-semibold text-[var(--warn)]" title={a.message}>
                        ⚠ Compromise
                      </span>
                    )}
                    {a.status === 'na' && <span className="text-neutral-400">n/a</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-black/5 px-4 py-2 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
        Areas in sq ft, clear internal dimensions. "Drawn in" is the zone holding most of the room's floor area on the current Vastu grid.
      </p>
    </section>
  );
}
