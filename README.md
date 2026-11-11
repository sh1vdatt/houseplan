# Ground Floor Plan · Vastu Viewer

An interactive floor-plan viewer for the ground floor of a G+1 house in Dafi, Varanasi. The plan is drawn as SVG from one data file. Rooms, walls, doors, windows, gates, dimensions and Vastu checks are all computed from that file.

```bash
npm install
npm run dev       # dev server → http://localhost:5173
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build
npm run verify    # print the arithmetic & Vastu checks in the terminal
```

Requires Node 20+.

**Live site:** https://sh1vdatt.github.io/houseplan/

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`. It runs `npm run verify`, so a plan whose dimensions no longer add up won't deploy. It then builds the site and publishes it to GitHub Pages. To update the live plan, edit `src/data/floorplan.ts`, commit and push.

## Features

- **Click a room** to open its side panel: exact dimensions, area, intended and actual Vastu zone, rationale, notes and a suggested furniture layout.
- **Layer toggles**: Furniture, Dimensions, Vastu zones, Door swings, Compass.
- **Vastu overlay**: a 3×3 grid laid over either the house footprint (the default) or the whole plot. Each room is tinted with the colour of the zone that holds most of its floor area. A ✓ or ⚠ badge shows whether that zone is acceptable for the room; hover the badge to see why. The Brahmasthan (centre zone) has a dotted boundary and its own tooltip.
- **Dimensions**: plot sides (63 / 68 / 31 / 30 ft), setbacks, overall house size, east setback and clear porch width.
- **Room schedule**: sortable by any column.
- **Light / dark mode**, zoom (100–300 %), and links you can share: `?room=kitchen` or `?zone=NE`.

## Editing the plan: `src/data/floorplan.ts`

This is the only file you need to edit. No component code needs to change.

**Units.** Everything is in decimal feet. Use the helper `ft(feet, inches)` for readability:

```ts
ft(12, 1.5)   // 12.125  → shown as 12'1.5"
ft(13, 9)     // 13.75   → 13'9"
```

**Coordinates.** A room's `x` and `y` are the clear interior north-west corner, measured from the house's outer NW corner. `+x` is East and `+y` is South. `width` (E–W) and `height` (N–S) are clear internal sizes. Walls are not drawn as separate objects. They are the gaps between rooms, so 9″ exterior and 4½″ interior walls come out automatically.

**Layout constants.** Positions are derived from named constants at the top of the file (`BED2_H`, `STAIR_H`, `POOJA_H` and so on). Changing one size moves everything below it in that column. For example, to make the pooja room 7′0″ deep:

```ts
const POOJA_H = ft(7);   // was ft(6, 6)
```

Living, dining and kitchen then shift south by 6″, and the east block becomes 6″ deeper.

**What else lives there:**

| Section | Purpose |
| --- | --- |
| `rooms` | Name, size, `vastuZone` (intended), `idealZones` (zones that count as compliant), rationale, notes, furniture tips and furniture symbols (room-local coordinates) |
| `doors` / `windows` | Openings in walls: position, width, hinge side, swing direction, single or double leaf |
| `partitions` | Extra walls not implied by room gaps (e.g. ensuite carved inside a bedroom) |
| `gates` | Gates on the plot boundary (distance along a side + width) |
| `plot` | Side lengths, required setbacks, edge labels, `northRotationDeg`, optional `surveyedCorners` |
| `zones` | Vastu zone names, elements, meanings, colours |
| `stackChecks` | The arithmetic checks (see below) |
| `siteNotes` | Notes shown in the overview panel |

## Arithmetic checks

`stackChecks` walks lines across the house, such as the west column north to south or a row west to east. Each check confirms two things:

1. every room starts exactly where the previous room or wall ended (within ⅛″), and
2. the total matches the overall dimension (26′0″ wide, 51′9″ deep).

The checks also cover room overlaps, rooms staying inside the footprint, plot closure and setbacks. After any edit, run `npm run verify`, or open the app's **Site overview → Arithmetic check**. The command exits non-zero if anything fails.

## Design decisions to review

- **Wall thickness.** 9″ exterior and 4½″ interior walls make the given room sizes add up to exactly 26′0″ wide: 0.75 + 12 + 0.375 + 12.125 + 0.75.
- **East block and porch.** Pooja + Living + Dining + Kitchen + walls = 38′4.5″, not 51′9″. The remaining 13′4.5″ in the south-east, plus the east setback, is used for the open car porch. Its clear width to the east boundary is about 16′10.5″ to 17′0.5″, not the nominal 17′6″.
- **Kitchen Vastu.** Because the porch takes the south-east corner, the kitchen falls mostly in the East zone. It is flagged ⚠, with the usual remedy: stove in the kitchen's own SE corner, cook facing east.
- **West column filler.** In the west column, a wash area (3′7.5″ × 6′0″) and a 7.5″ plumbing duct fill the space left after the powder room. They also give the powder room a way in.
- **Plot shape.** Four side lengths do not fix the shape of a quadrilateral, so the drawing assumes the north boundary is perpendicular to the west wall. Enter surveyed corners in `plot.surveyedCorners` once you have them.

## Project layout

```
src/data/floorplan.ts     ← all plan data (edit this)
src/data/types.ts         ← data model types
src/lib/                  geometry, Vastu zoning, checks, formatting
src/components/           FloorPlan (SVG), Furniture, Dimension, SidePanel, RoomSchedule
scripts/verify.ts         CLI for `npm run verify`
```
