import type { FloorPlan, Room } from '../data/types';
import { polygonArea, roomPolygon } from './geometry';

/** Gross area = clear rect (clipped to plot for exterior); net subtracts carved children incl. their partitions. */
export function roomArea(plan: FloorPlan, room: Room) {
  const gross = polygonArea(roomPolygon(plan, room));
  const t = plan.house.intWall;
  const carved = plan.rooms
    .filter((r) => r.parent === room.id)
    .reduce((s, c) => s + (c.width + t) * (c.height + t), 0);
  return { gross, net: gross - carved };
}
