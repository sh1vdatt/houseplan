/**
 * Type definitions for the floor-plan data model.
 * All linear values are DECIMAL FEET (12.125 = 12'1.5").
 *
 * Coordinate systems
 *  - Plot coords:  origin at the plot's NW corner, +x = East, +y = South.
 *  - House coords: origin at the house's outer NW corner (house.origin in plot coords).
 *  - Room-local:   origin at the room's NW interior corner (used for furniture).
 */

export type Zone = 'NW' | 'N' | 'NE' | 'W' | 'C' | 'E' | 'SW' | 'S' | 'SE';
export type Dir = 'N' | 'S' | 'E' | 'W';
export type Pt = [number, number];

export interface ZoneInfo {
  name: string; // Sanskrit name
  label: string; // English label
  element: string;
  meaning: string;
  idealFor: string;
  color: string;
}

export type FurnitureKind =
  | 'bed'
  | 'wardrobe'
  | 'sofa'
  | 'dining'
  | 'table'
  | 'sidetable'
  | 'desk'
  | 'tv'
  | 'wc'
  | 'basin'
  | 'shower'
  | 'counter'
  | 'hob'
  | 'sink'
  | 'fridge'
  | 'mandir'
  | 'cabinet'
  | 'mat'
  | 'car';

export interface FurnitureItem {
  kind: FurnitureKind;
  /** Room-local position & size, feet. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Which side is the "back": bed headboard, sofa back, WC cistern, car rear. */
  facing?: Dir;
  label?: string;
  /** dining: number of chairs */
  seats?: number;
}

export type RoomCategory =
  | 'bedroom'
  | 'bath'
  | 'living'
  | 'kitchen'
  | 'dining'
  | 'worship'
  | 'circulation'
  | 'stair'
  | 'service'
  | 'exterior';

export interface Room {
  id: string;
  name: string;
  /** Shorter label used inside the plan when space is tight. */
  shortName?: string;
  category: RoomCategory;
  /** House coords of the clear interior NW corner, feet. */
  x: number;
  y: number;
  /** Clear internal width (E–W) and height/depth (N–S), feet. */
  width: number;
  height: number;
  /** Zone this room is intended for. */
  vastuZone: Zone;
  /** Zones in which this room is considered Vastu-acceptable. */
  idealZones: Zone[];
  /** Room carved out of another room's footprint (e.g. ensuite inside bedroom). */
  parent?: string;
  /** Rooms this one is open to (no wall; drawn as dashed boundary). */
  openTo?: string[];
  /** Exterior / open-to-sky element; clipped to plot boundary. */
  exterior?: boolean;
  /** Excluded from Vastu scoring (ducts, shafts). */
  noVastu?: boolean;
  /** Nominal size as given on the brief, if different from drawn geometry. */
  nominal?: string;
  rationale: string;
  notes: string[];
  /** Explanation shown when placement is a compromise. */
  compromiseNote?: string;
  furnitureTips: string[];
  furniture: FurnitureItem[];
  /** Room-local label anchor (defaults to room centre). */
  labelAt?: [number, number];
  rotateLabel?: boolean;
}

export interface Door {
  id: string;
  label: string;
  kind: 'door' | 'main' | 'opening';
  /** 'h' = opening sits in an E–W running wall; 'v' = in a N–S running wall. */
  axis: 'h' | 'v';
  /** House coords of the opening's start (min x for 'h', min y for 'v'), at the wall's min face. */
  x: number;
  y: number;
  width: number;
  /** Wall thickness the opening cuts through. */
  thickness: number;
  /** Which end the hinge is at: 'start' = min x / min y. */
  hinge?: 'start' | 'end';
  /** Direction leaf swings: +1 = toward +y ('h') or +x ('v'); -1 the opposite. */
  swing?: 1 | -1;
  leaves?: 1 | 2;
}

export interface Window {
  id: string;
  axis: 'h' | 'v';
  x: number;
  y: number;
  length: number;
  thickness: number;
  label?: string;
}

export interface Partition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlotSide = 'north' | 'east' | 'south' | 'west';

export interface Gate {
  id: string;
  label: string;
  side: PlotSide;
  /** Distance along the side, feet, measured from its N end (E/W sides) or W end (N/S sides). */
  from: number;
  width: number;
  leaves: 1 | 2;
}

export interface StackCheck {
  label: string;
  /** 'y' sums heights N→S; 'x' sums widths W→E. */
  axis: 'x' | 'y';
  /** Room ids (contribute their width/height and must sit exactly at the running cursor) or wall thicknesses. */
  items: (string | number)[];
  expected: number;
  expectedLabel: string;
}

export interface FloorPlan {
  meta: {
    title: string;
    location: string;
    floor: string;
    futureNote: string;
  };
  plot: {
    /** Boundary lengths in feet. */
    sides: Record<PlotSide, number>;
    /** Geometric assumption used to close the irregular quadrilateral. */
    geometryAssumption: string;
    /** Optional surveyed corners (plot coords: NW, NE, SE, SW). Overrides the solver if set. */
    surveyedCorners?: [Pt, Pt, Pt, Pt];
    edgeLabels: Record<PlotSide, string>;
    edgeNotes: Record<PlotSide, string>;
    requiredSetback: Record<PlotSide, number>;
    /** Rotation of true north from "up" in degrees, clockwise. 0 = plan north is true north. */
    northRotationDeg: number;
    junction: { corner: 'SE' | 'SW' | 'NE' | 'NW'; label: string };
  };
  house: {
    /** House NW outer corner in plot coords (west setback 0, north setback = origin.y). */
    origin: Pt;
    width: number;
    depth: number;
    extWall: number;
    intWall: number;
    /** Outer outline of built footprint, house coords, clockwise. */
    footprint: Pt[];
  };
  rooms: Room[];
  partitions: Partition[];
  doors: Door[];
  windows: Window[];
  gates: Gate[];
  zones: Record<Zone, ZoneInfo>;
  stackChecks: StackCheck[];
  siteNotes: { title: string; body: string; level: 'info' | 'warn' }[];
}
