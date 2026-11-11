/**
 * ════════════════════════════════════════════════════════════════════
 *  SINGLE SOURCE OF TRUTH — Ground floor, G+1 residence, Dafi, Varanasi
 * ════════════════════════════════════════════════════════════════════
 *
 *  Every number the app draws comes from this file. Units: decimal feet.
 *  Use ft(feet, inches) for readability: ft(12, 1.5) === 12.125 → 12'1.5".
 *
 *  Room x/y are the clear INTERIOR north-west corner in HOUSE coordinates
 *  (origin = outer NW corner of the house, +x East, +y South). Widths and
 *  heights are CLEAR internal dimensions; walls are the gaps between rooms.
 *
 *  Positions are derived from the layout constants below, so changing one
 *  room size ripples through its column automatically. After editing, run
 *  `npm run verify` (or look at "Arithmetic check" in the app) — every
 *  column/row stack must still add up to the overall footprint.
 */
import type { FloorPlan, Room, Zone, ZoneInfo } from './types';

/** feet + inches → decimal feet */
export const ft = (feet: number, inches = 0) => feet + inches / 12;

// ─── Wall thicknesses ────────────────────────────────────────────────
const EXT = ft(0, 9); // 9" external / load-bearing walls
const INT = ft(0, 4.5); // 4½" internal partitions

// ─── Overall footprint (authoritative) ───────────────────────────────
const HOUSE_W = ft(26); // E–W, outer face to outer face
const HOUSE_D = ft(51, 9); // N–S, outer face to outer face (west column)
const NORTH_SETBACK = ft(4, 6); // khet side; west setback is 0 (party wall)

// ─── Column widths (clear) ───────────────────────────────────────────
const W_COL = ft(12); // west block: bedrooms, stair, lobby
const E_COL = ft(12, 1.5); // east block: pooja, living, dining, kitchen
const X_W = EXT; // west column interior starts
const X_E = EXT + W_COL + INT; // east column interior starts (13'1.5")

// ─── West column, north → south ──────────────────────────────────────
const BED2_H = ft(13, 9);
const STAIR_W = ft(8);
const STAIR_H = ft(10);
const LOBBY_W = W_COL - STAIR_W - INT; // 3'7.5"
const POWDER_W = ft(4);
const POWDER_H = ft(5);
const MBATH_W = ft(8);
const MBATH_H = ft(5);
const MASTER_H = ft(14);

const Y_BED2 = EXT;
const Y_MID = Y_BED2 + BED2_H + INT; // stair + lobby start
const Y_POWDER = Y_MID + STAIR_H + INT;
const Y_MASTER = HOUSE_D - EXT - MASTER_H; // master anchored to south wall
const Y_MBATH = Y_MASTER - INT - MBATH_H;
const SERVICE_BAND = Y_MBATH - INT - Y_POWDER; // powder + duct band (6'0")
const DUCT_H = SERVICE_BAND - POWDER_H - INT; // leftover becomes plumbing duct
const X_WASH = X_W + POWDER_W + INT;
const X_LOBBY = X_W + STAIR_W + INT;
const LOBBY_H = Y_MBATH + MBATH_H - Y_MID; // runs from Bed2 wall to Master wall

// ─── East column, north → south (living/dining/kitchen are open-plan) ─
const POOJA_H = ft(6, 6);
const LIVING_H = ft(8, 10.5);
const DINING_H = ft(10, 1.5);
const KITCHEN_H = ft(11);

const Y_POOJA = EXT;
const Y_LIVING = Y_POOJA + POOJA_H + INT;
const Y_DINING = Y_LIVING + LIVING_H; // open — no wall
const Y_KITCHEN = Y_DINING + DINING_H; // open — no wall
const EAST_D = Y_KITCHEN + KITCHEN_H + EXT; // east block outer depth (38'4.5")

// ─── SE notch → car porch ────────────────────────────────────────────
const NOTCH_X = EXT + W_COL + EXT; // master's east wall becomes external (9")
const PORCH_W = ft(17, 6); // nominal; clipped to the east boundary
const PORCH_H = ft(21);

// ─── Vastu zones ─────────────────────────────────────────────────────
const zones: Record<Zone, ZoneInfo> = {
  NE: {
    name: 'Ishanya',
    label: 'North-East',
    element: 'Water / light',
    meaning: 'Most sacred corner; morning light and positive energy enter here.',
    idealFor: 'Pooja, meditation, water storage, open/light space',
    color: '#8ec5f0',
  },
  E: {
    name: 'Purva',
    label: 'East',
    element: 'Sun',
    meaning: 'Sun, health and vitality.',
    idealFor: 'Main entrance, living and family areas',
    color: '#f3e08a',
  },
  SE: {
    name: 'Agneya',
    label: 'South-East',
    element: 'Fire',
    meaning: 'Agni (fire) corner.',
    idealFor: 'Kitchen, electrical panels, inverter',
    color: '#f2a65a',
  },
  S: {
    name: 'Dakshin',
    label: 'South',
    element: 'Strength',
    meaning: 'Strength, stability and fame.',
    idealFor: 'Bedrooms, staircase, heavy storage',
    color: '#d97a6c',
  },
  SW: {
    name: 'Nairutya',
    label: 'South-West',
    element: 'Earth',
    meaning: 'Earth — stability; should be the heaviest, highest part.',
    idealFor: 'Master bedroom (head of household), heavy construction, overhead tank',
    color: '#b8894a',
  },
  W: {
    name: 'Paschim',
    label: 'West',
    element: 'Gains',
    meaning: 'Gains and savings.',
    idealFor: "Dining, children's room, staircase, toilets",
    color: '#8fa6bf',
  },
  NW: {
    name: 'Vayavya',
    label: 'North-West',
    element: 'Air',
    meaning: 'Air — movement and change.',
    idealFor: 'Guest bedroom, storage, toilets, vehicles',
    color: '#b5dea0',
  },
  N: {
    name: 'Uttar',
    label: 'North',
    element: 'Wealth',
    meaning: 'Kubera — wealth and opportunity.',
    idealFor: 'Living, cash/locker, open space',
    color: '#6cc0ad',
  },
  C: {
    name: 'Brahmasthan',
    label: 'Centre',
    element: 'Space (Akasha)',
    meaning:
      'The energetic centre of the house. Keep it open and uncluttered — minimal construction, no heavy load, no toilet, stair or pillar.',
    idealFor: 'Open circulation, courtyard, skylight',
    color: '#ede6d6',
  },
};

// ─── Rooms ───────────────────────────────────────────────────────────
const rooms: Room[] = [
  {
    id: 'bed2',
    name: 'Bedroom 2',
    category: 'bedroom',
    x: X_W,
    y: Y_BED2,
    width: W_COL,
    height: BED2_H,
    vastuZone: 'NW',
    idealZones: ['NW', 'W', 'S'],
    rationale:
      'North-West (Vayavya, air) suits a guest or children’s bedroom — occupants of an air-zone room tend not to overstay, which is why it is the classic guest-room corner.',
    notes: [
      'Overall 12\'0" × 13\'9" including the attached Bath 2 carved into its NW corner.',
      'West wall is the shared party wall — no windows on that side; daylight from the north window.',
    ],
    furnitureTips: [
      'Queen bed (5\'×6\'8") with headboard on the south wall — sleeping with head to the south is the preferred Vastu orientation.',
      'Wardrobe on the east wall, clear of the bath door.',
      'Study desk below the wardrobe on the east wall, lit by the north window.',
    ],
    furniture: [
      { kind: 'bed', x: 1, y: ft(7, 1), w: 5, h: ft(6, 8), facing: 'S', label: 'Queen' },
      { kind: 'sidetable', x: 6.1, y: 12.25, w: 1.4, h: 1.4 },
      { kind: 'wardrobe', x: 10, y: 0.4, w: 2, h: 6, label: 'WD' },
      { kind: 'desk', x: 10, y: 7.2, w: 2, h: 3.2, label: 'Desk' },
    ],
    labelAt: [8.0, 8.3],
  },
  {
    id: 'bath2',
    name: 'Bath 2 (ensuite)',
    shortName: 'Bath 2',
    category: 'bath',
    parent: 'bed2',
    x: X_W,
    y: Y_BED2,
    width: ft(7),
    height: ft(5),
    vastuZone: 'NW',
    idealZones: ['NW', 'W', 'S'],
    rationale:
      'Toilets are acceptable in the North-West (and West/South). Placed in the NW corner of Bedroom 2 so the plumbing stays on the north/west edge and away from the NE.',
    notes: [
      'Carved out of Bedroom 2’s NW corner with 4½" partitions.',
      'North ventilator for light and exhaust.',
    ],
    furnitureTips: [
      'WC on the west wall (seat facing north–south axis per Vastu).',
      'Basin on the north wall; shower zone to the south.',
    ],
    furniture: [
      { kind: 'wc', x: 0, y: 0.4, w: 2.2, h: 1.5, facing: 'W' },
      { kind: 'basin', x: 4.4, y: 0, w: 2, h: 1.4 },
      { kind: 'shower', x: 0, y: 2.4, w: 2.8, h: 2.6 },
    ],
    labelAt: [3.4, 1.9],
  },
  {
    id: 'stair',
    name: 'Staircase',
    category: 'stair',
    x: X_W,
    y: Y_MID,
    width: STAIR_W,
    height: STAIR_H,
    vastuZone: 'W',
    idealZones: ['S', 'W', 'SW', 'NW', 'SE'],
    rationale:
      'Staircases are best in the South, West or South-West — heavy, load-bearing elements belong on the heavier side. Never in the NE or the Brahmasthan.',
    notes: [
      'Fully internal dog-leg stair, no external access. Turns clockwise (east flight up northwards, landing, west flight).',
      'Will carry up to the first floor (G+1) — keep the stair core position fixed when designing the upper floor.',
    ],
    furnitureTips: [
      'Under-flight space can take shallow shoe storage.',
      'Stair light on a two-way switch (lobby + landing).',
    ],
    furniture: [],
  },
  {
    id: 'lobby',
    name: 'Lobby / Passage',
    shortName: 'Lobby',
    category: 'circulation',
    x: X_LOBBY,
    y: Y_MID,
    width: LOBBY_W,
    height: LOBBY_H,
    vastuZone: 'C',
    idealZones: ['C', 'N', 'E', 'W', 'NW'],
    rationale:
      'An open passage through the centre keeps the Brahmasthan free of rooms and heavy construction — the ideal use of the central zone.',
    notes: [
      `Clear width ${'3\'7.5"'} (brief says ~3'7"). Connects Bedroom 2, the stair, the powder room / wash area and the master bedroom.`,
      'Opens east through a 7\'0" wide archway into the dining room.',
    ],
    furnitureTips: ['Keep clear — no furniture. A recessed niche or wall art only.'],
    furniture: [],
    rotateLabel: true,
  },
  {
    id: 'powder',
    name: 'Powder Room (guest WC)',
    shortName: 'Powder',
    category: 'bath',
    x: X_W,
    y: Y_POWDER,
    width: POWDER_W,
    height: POWDER_H,
    vastuZone: 'W',
    idealZones: ['NW', 'W', 'S'],
    rationale:
      'Guest WC in the West zone — an acceptable toilet location. Not attached to any bedroom; reached through the wash area off the lobby.',
    notes: [
      'No exterior wall (west is the party wall) — mechanical exhaust into the adjoining duct is required.',
    ],
    furnitureTips: ['Wall-hung WC on the south wall; compact corner basin.'],
    furniture: [
      { kind: 'wc', x: 0.9, y: 2.8, w: 1.5, h: 2.2, facing: 'S' },
      { kind: 'basin', x: 0, y: 0, w: 1.4, h: 1.2 },
    ],
    labelAt: [2.65, 1.5],
  },
  {
    id: 'wash',
    name: 'Wash Area',
    shortName: 'Wash',
    category: 'service',
    x: X_WASH,
    y: Y_POWDER,
    width: LOBBY_W,
    height: SERVICE_BAND,
    vastuZone: 'W',
    idealZones: ['W', 'NW', 'N', 'E'],
    rationale:
      'Hand-wash vestibule in the West zone serving the dining room and powder room — the space left between the stair and master bath after the powder room is placed.',
    notes: [
      'Not in the original brief: it is the leftover 3\'7.5" × 6\'0" between powder room and lobby, made into the powder-room vestibule so the powder room has access.',
    ],
    furnitureTips: ['Counter-top wash basin with mirror on the south wall.'],
    furniture: [{ kind: 'counter', x: 0.2, y: 4.5, w: 3.2, h: 1.5, label: 'Basin' }],
    labelAt: [1.9, 3.7],
  },
  {
    id: 'duct',
    name: 'Plumbing Duct',
    shortName: '',
    category: 'service',
    x: X_W,
    y: Y_POWDER + POWDER_H + INT,
    width: POWDER_W,
    height: DUCT_H,
    vastuZone: 'W',
    idealZones: ['W'],
    noVastu: true,
    rationale: 'Vertical service shaft for the powder room and master bath exhaust and soil stacks.',
    notes: ['Residual strip that makes the west column add up exactly to 51\'9".'],
    furnitureTips: [],
    furniture: [],
  },
  {
    id: 'mbath',
    name: 'Master Bath (ensuite)',
    shortName: 'M. Bath',
    category: 'bath',
    x: X_W,
    y: Y_MBATH,
    width: MBATH_W,
    height: MBATH_H,
    vastuZone: 'W',
    idealZones: ['W', 'NW', 'S'],
    rationale:
      'Ensuite placed on the north side of the master bedroom, in the West zone, so the SW corner itself stays solid (toilets in the exact SW corner are avoided).',
    notes: [
      'No exterior wall — exhaust through the duct on its north side.',
      'Sits on the W / SW boundary; keep the WC in the northern part of the bath.',
    ],
    furnitureTips: ['Vanity in the NW, WC against the north (duct) wall, walk-in shower on the east.'],
    furniture: [
      { kind: 'basin', x: 0, y: 0, w: 2.5, h: 1.6, label: 'Vanity' },
      { kind: 'wc', x: 3.5, y: 0, w: 1.5, h: 2.2, facing: 'N' },
      { kind: 'shower', x: 5.4, y: 0, w: 2.6, h: 5 },
    ],
    labelAt: [4.4, 3.6],
  },
  {
    id: 'master',
    name: 'Master Bedroom',
    category: 'bedroom',
    x: X_W,
    y: Y_MASTER,
    width: W_COL,
    height: MASTER_H,
    vastuZone: 'SW',
    idealZones: ['SW', 'S', 'W'],
    rationale:
      'South-West (Nairutya, earth) gives stability and is the prescribed bedroom for the head of the household. Also the heaviest corner of the structure.',
    notes: [
      'East wall is now an external 9" wall facing the car porch.',
      'Windows: south (5\'0") and east onto the porch (4\'0").',
    ],
    furnitureTips: [
      'King bed (6\'×6\'8") with headboard on the south wall — head to the south.',
      'Heavy wardrobe on the west wall (SW should carry the most weight).',
      'Dresser / study table on the east wall under the window.',
    ],
    furniture: [
      { kind: 'bed', x: 3.5, y: ft(7, 4), w: 6, h: ft(6, 8), facing: 'S', label: 'King' },
      { kind: 'sidetable', x: 2, y: 12.5, w: 1.5, h: 1.5 },
      { kind: 'sidetable', x: 9.5, y: 12.5, w: 1.5, h: 1.5 },
      { kind: 'wardrobe', x: 0, y: 1, w: 2, h: 6, label: 'WD' },
      { kind: 'desk', x: 10.5, y: 4, w: 1.5, h: 3.5, label: 'Dresser' },
    ],
    labelAt: [5.5, 4.0],
  },
  {
    id: 'pooja',
    name: 'Pooja Room',
    shortName: 'Pooja',
    category: 'worship',
    x: X_E,
    y: Y_POOJA,
    width: E_COL,
    height: POOJA_H,
    vastuZone: 'NE',
    idealZones: ['NE', 'N', 'E'],
    rationale:
      'North-East (Ishanya, water/light) is the ideal place for worship — it receives the first morning light. The room spans the full width of the NE block and is standalone, not inside or against a bedroom.',
    notes: ['Windows on the north and east walls.', 'Double-leaf door from the living room.'],
    furnitureTips: [
      'Mandir on the east wall so you face east while praying.',
      'Keep idols off the floor and away from the walls by a few inches.',
      'Low storage for puja items on the west wall; floor mat in the centre.',
    ],
    furniture: [
      { kind: 'mandir', x: 10.125, y: 1, w: 2, h: 4.5, label: 'Mandir' },
      { kind: 'mat', x: 6.4, y: 1.5, w: 3, h: 3 },
      { kind: 'cabinet', x: 0, y: 0.5, w: 1.5, h: 4, label: 'Store' },
    ],
    labelAt: [3.5, 1.8],
  },
  {
    id: 'living',
    name: 'Living Room',
    shortName: 'Living',
    category: 'living',
    x: X_E,
    y: Y_LIVING,
    width: E_COL,
    height: LIVING_H,
    vastuZone: 'NE',
    idealZones: ['N', 'NE', 'E', 'NW'],
    openTo: ['dining'],
    rationale:
      'Living rooms are favoured in the North, North-East or East — light, active zones. The main entrance on its east wall faces the sunrise.',
    notes: [
      'Main entrance door (3\'6") on the east wall, reached from the east pedestrian gate.',
      'Open to the dining room to the south.',
    ],
    furnitureTips: [
      'Sofa against the west wall, facing east.',
      'Keep the NE part of the room light — no heavy furniture there.',
      'TV unit wall-mounted on the north wall.',
    ],
    furniture: [
      { kind: 'sofa', x: 0.1, y: 1, w: 3, h: 7, facing: 'W', label: 'Sofa' },
      { kind: 'table', x: 4, y: 3, w: 2, h: 3, label: '' },
      { kind: 'tv', x: 8.7, y: 0, w: 3, h: 0.6, label: 'TV' },
    ],
    labelAt: [8.9, 6.6],
  },
  {
    id: 'dining',
    name: 'Dining Room',
    shortName: 'Dining',
    category: 'dining',
    x: X_E,
    y: Y_DINING,
    width: E_COL,
    height: DINING_H,
    vastuZone: 'E',
    idealZones: ['W', 'E', 'N'],
    openTo: ['living', 'kitchen'],
    rationale:
      'Dining is acceptable in the East or West; East lets the family face east while eating. Open to both the living room and the kitchen.',
    notes: ['7\'0" archway west to the lobby.', 'East window (5\'0").'],
    furnitureTips: ['6-seater table (6\'×3\') centred, long axis E–W.', 'Head of the table facing east.'],
    furniture: [{ kind: 'dining', x: 3.06, y: 3.56, w: 6, h: 3, seats: 6 }],
    labelAt: [6.06, 9.1],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    category: 'kitchen',
    x: X_E,
    y: Y_KITCHEN,
    width: E_COL,
    height: KITCHEN_H,
    vastuZone: 'SE',
    idealZones: ['SE', 'NW'],
    openTo: ['dining'],
    rationale:
      'South-East (Agneya, fire) is the prescribed kitchen zone. This is the south-eastern-most room of the house; the cooking range sits in the kitchen’s own SE corner with the cook facing east.',
    compromiseNote:
      'Because the car porch takes the SE corner of the 26\' × 51\'9" footprint, most of the kitchen falls in the East zone and only its southern edge reaches SE. Standard remedy: stove in the kitchen’s own SE corner, cook facing east (as drawn).',
    notes: [
      'Island / open counter on the north side facing the dining room.',
      'Windows on the east wall (over the sink) and the south wall (onto the porch).',
    ],
    furnitureTips: [
      'Hob on the east counter near the SE corner — cook faces east.',
      'Sink on the east counter under the window, away from the hob (fire and water apart).',
      'Fridge in the SW corner of the kitchen.',
      'Island counter 7\'×2\'6" facing the dining room.',
    ],
    furniture: [
      { kind: 'counter', x: 2, y: 1.5, w: 7, h: 2.5, label: 'Island' },
      { kind: 'counter', x: 10.125, y: 0.8, w: 2, h: 10.2, label: '' },
      { kind: 'counter', x: 2.6, y: 9, w: 7.525, h: 2, label: '' },
      { kind: 'sink', x: 10.3, y: 2.4, w: 1.6, h: 2.2 },
      { kind: 'hob', x: 10.3, y: 6.3, w: 1.7, h: 2.4 },
      { kind: 'fridge', x: 0, y: 8.5, w: 2.5, h: 2.5, label: 'Fridge' },
    ],
    labelAt: [5.5, 6.4],
  },
  {
    id: 'porch',
    name: 'Car Porch (open to sky)',
    shortName: 'Car Porch',
    category: 'exterior',
    exterior: true,
    x: NOTCH_X,
    y: EAST_D,
    width: PORCH_W,
    height: PORCH_H,
    vastuZone: 'SE',
    idealZones: ['SE', 'NW', 'E', 'N'],
    nominal: '17\'6" × 21\'0"',
    rationale:
      'Vehicle parking in the South-East is acceptable in Vastu. The open porch sits in the SE notch left by the shorter east block and is reached through the east-road vehicle gate.',
    notes: [
      'Not enclosed — open driveway, no roof drawn.',
      'Clear E–W width is limited by the east boundary — see the arithmetic check.',
      'A south gate is avoided because of the nearby road junction.',
    ],
    furnitureTips: [
      'SUV (~15\'6" × 6\'3") parks E–W, driving straight in from the east gate.',
      'Slope paving 1:60 towards the north-east for drainage.',
    ],
    furniture: [{ kind: 'car', x: 0.75, y: 6, w: 15.5, h: 6.3, facing: 'E', label: 'SUV' }],
    labelAt: [8.5, 2.6],
  },
];

// ─── Data object ─────────────────────────────────────────────────────
export const floorplan: FloorPlan = {
  meta: {
    title: 'Ground Floor Plan',
    location: 'Dafi, Varanasi',
    floor: 'Ground floor (G of G+1)',
    futureNote: 'First floor to be added later — stair core, wet areas and load-bearing walls should stack.',
  },

  plot: {
    sides: { west: 63, east: 68, south: 31, north: 30 },
    geometryAssumption:
      'The brief gives only four side lengths, which does not fix the shape. The drawing assumes the North boundary is perpendicular to the West (party) wall; the South and East boundaries are then solved from their lengths. Replace with surveyed corners when available.',
    edgeLabels: {
      north: 'Open agricultural field (khet)',
      east: 'Road (kaccha)',
      south: 'Road (kaccha)',
      west: 'Neighbour — shared party wall',
    },
    edgeNotes: {
      north: 'Field edge — setback required',
      east: 'Road — setback ~4\' required',
      south: 'Road — setback required',
      west: 'Zero setback (shared wall)',
    },
    requiredSetback: { north: 4, east: 4, south: 4, west: 0 },
    northRotationDeg: 0,
    junction: { corner: 'SE', label: 'Road junction' },
  },

  house: {
    origin: [0, NORTH_SETBACK],
    width: HOUSE_W,
    depth: HOUSE_D,
    extWall: EXT,
    intWall: INT,
    footprint: [
      [0, 0],
      [HOUSE_W, 0],
      [HOUSE_W, EAST_D],
      [NOTCH_X, EAST_D],
      [NOTCH_X, HOUSE_D],
      [0, HOUSE_D],
    ],
  },

  rooms,

  /** Extra internal walls not implied by room gaps (e.g. carved ensuite). */
  partitions: [
    { x: X_W + ft(7), y: Y_BED2, w: INT, h: ft(5) + INT }, // Bath 2 east partition
    { x: X_W, y: Y_BED2 + ft(5), w: ft(7) + INT, h: INT }, // Bath 2 south partition
  ],

  doors: [
    { id: 'd-main', label: 'Main entrance', kind: 'main', axis: 'v', x: HOUSE_W - EXT, y: Y_LIVING + ft(0, 10.5), width: ft(3, 6), thickness: EXT, hinge: 'end', swing: -1 },
    { id: 'd-pooja', label: 'Pooja door (double leaf)', kind: 'door', axis: 'h', x: X_E + ft(4, 4.5), y: Y_POOJA + POOJA_H, width: ft(3, 6), thickness: INT, hinge: 'start', swing: -1, leaves: 2 },
    { id: 'd-bed2', label: 'Bedroom 2 door', kind: 'door', axis: 'h', x: X_LOBBY + 0.25, y: Y_BED2 + BED2_H, width: 3, thickness: INT, hinge: 'end', swing: -1 },
    { id: 'd-bath2', label: 'Bath 2 door', kind: 'door', axis: 'v', x: X_W + ft(7), y: Y_BED2 + 2, width: 2.5, thickness: INT, hinge: 'start', swing: -1 },
    { id: 'o-stair', label: 'Stair opening', kind: 'opening', axis: 'v', x: X_W + STAIR_W, y: Y_MID + STAIR_H - 4, width: 4, thickness: INT },
    { id: 'o-dining', label: 'Archway to dining', kind: 'opening', axis: 'v', x: X_E - INT, y: Y_MID + ft(3, 1.5), width: 7, thickness: INT },
    { id: 'o-wash', label: 'Wash area opening', kind: 'opening', axis: 'v', x: X_W + STAIR_W, y: Y_POWDER + 0.5, width: 5, thickness: INT },
    { id: 'd-powder', label: 'Powder room door', kind: 'door', axis: 'v', x: X_W + POWDER_W, y: Y_POWDER + 0.75, width: 2.5, thickness: INT, hinge: 'start', swing: 1 },
    { id: 'd-mbath', label: 'Master bath door', kind: 'door', axis: 'h', x: X_W + 0.75, y: Y_MASTER - INT, width: 2.5, thickness: INT, hinge: 'start', swing: -1 },
    { id: 'd-master', label: 'Master bedroom door', kind: 'door', axis: 'h', x: X_LOBBY + 0.25, y: Y_MASTER - INT, width: 3, thickness: INT, hinge: 'end', swing: 1 },
  ],

  windows: [
    { id: 'w-bed2-n', axis: 'h', x: 8.5, y: 0, length: 3.5, thickness: EXT },
    { id: 'w-bath2-n', axis: 'h', x: 3, y: 0, length: 2, thickness: EXT, label: 'Vent' },
    { id: 'w-pooja-n', axis: 'h', x: 16.5, y: 0, length: 5, thickness: EXT },
    { id: 'w-pooja-e', axis: 'v', x: HOUSE_W - EXT, y: 2, length: 4, thickness: EXT },
    { id: 'w-living-e', axis: 'v', x: HOUSE_W - EXT, y: 12.75, length: 3, thickness: EXT },
    { id: 'w-dining-e', axis: 'v', x: HOUSE_W - EXT, y: 18.5, length: 5, thickness: EXT },
    { id: 'w-kitchen-e', axis: 'v', x: HOUSE_W - EXT, y: 28.5, length: 4, thickness: EXT },
    { id: 'w-kitchen-s', axis: 'h', x: 20, y: EAST_D - EXT, length: 4, thickness: EXT },
    { id: 'w-master-s', axis: 'h', x: 3.5, y: HOUSE_D - EXT, length: 5, thickness: EXT },
    { id: 'w-master-e', axis: 'v', x: NOTCH_X - EXT, y: Y_MASTER + 4, length: 4, thickness: EXT },
  ],

  gates: [
    { id: 'g-ped', label: 'Pedestrian gate', side: 'east', from: 13, width: 3.5, leaves: 1 },
    { id: 'g-veh', label: 'Vehicle gate (12\')', side: 'east', from: 46, width: 12, leaves: 2 },
  ],

  zones,

  /**
   * Arithmetic checks. Each list walks a line across the house; room ids must
   * sit exactly where the previous item ended, and the total must match.
   */
  stackChecks: [
    { label: 'West column N→S (Bed 2 · stair · powder · duct · M.bath · Master)', axis: 'y', items: [EXT, 'bed2', INT, 'stair', INT, 'powder', INT, 'duct', INT, 'mbath', INT, 'master', EXT], expected: HOUSE_D, expectedLabel: 'house depth' },
    { label: 'West column N→S via lobby (Bed 2 · lobby · Master)', axis: 'y', items: [EXT, 'bed2', INT, 'lobby', INT, 'master', EXT], expected: HOUSE_D, expectedLabel: 'house depth' },
    { label: 'Wash-area line N→S (Bed 2 · stair · wash · M.bath · Master)', axis: 'y', items: [EXT, 'bed2', INT, 'stair', INT, 'wash', INT, 'mbath', INT, 'master', EXT], expected: HOUSE_D, expectedLabel: 'house depth' },
    { label: 'East column N→S (Pooja · Living · Dining · Kitchen)', axis: 'y', items: [EXT, 'pooja', INT, 'living', 'dining', 'kitchen', EXT], expected: EAST_D, expectedLabel: 'east block depth' },
    { label: 'SE notch: east block + porch length', axis: 'y', items: [EAST_D, 'porch'], expected: EAST_D + PORCH_H, expectedLabel: 'porch end' },
    { label: 'Row W→E through Bedroom 2 & Pooja', axis: 'x', items: [EXT, 'bed2', INT, 'pooja', EXT], expected: HOUSE_W, expectedLabel: 'house width' },
    { label: 'Row W→E through stair, lobby & dining', axis: 'x', items: [EXT, 'stair', INT, 'lobby', INT, 'dining', EXT], expected: HOUSE_W, expectedLabel: 'house width' },
    { label: 'Row W→E through powder, wash, lobby & kitchen', axis: 'x', items: [EXT, 'powder', INT, 'wash', INT, 'lobby', INT, 'kitchen', EXT], expected: HOUSE_W, expectedLabel: 'house width' },
    { label: 'Row W→E through M.bath, lobby & kitchen', axis: 'x', items: [EXT, 'mbath', INT, 'lobby', INT, 'kitchen', EXT], expected: HOUSE_W, expectedLabel: 'house width' },
    { label: 'Row W→E through Master to porch edge', axis: 'x', items: [EXT, 'master', EXT, 'porch'], expected: NOTCH_X + PORCH_W, expectedLabel: 'porch east edge (nominal)' },
  ],

  siteNotes: [
    {
      title: 'Plot shape is an assumption',
      level: 'warn',
      body: 'Four side lengths alone do not fix an irregular quadrilateral. North is drawn perpendicular to the west wall; confirm against the survey/registry map and set plot.surveyedCorners.',
    },
    {
      title: 'East block is shorter than the house',
      level: 'info',
      body: 'Pooja + Living + Dining + Kitchen + walls = 38\'4.5", not 51\'9". The 13\'4.5" SE notch, plus the east setback, is where the open car porch goes.',
    },
    {
      title: 'SE corner cut',
      level: 'warn',
      body: 'Because of the porch notch, the built footprint has no SE corner, which traditional Vastu treats as a defect. Common remedies are a pergola or slab over the porch to "complete" the corner, or a boundary wall that squares it.',
    },
    {
      title: 'Internal wet rooms need mechanical ventilation',
      level: 'warn',
      body: 'The powder room and master bath have no exterior wall (west is the party wall). Vent both through the plumbing duct with exhaust fans.',
    },
    {
      title: 'No openings on the west wall',
      level: 'info',
      body: 'The west wall is a shared party wall with zero setback, so it has no windows or doors.',
    },
    {
      title: 'G+1 ready',
      level: 'info',
      body: 'Keep the stair core, wet areas (Bath 2 / M.bath / Powder / Kitchen) and 9" walls stacked when the first floor is designed.',
    },
  ],
};

export default floorplan;
