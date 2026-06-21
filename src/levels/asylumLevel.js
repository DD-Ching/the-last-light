/*
 * asylumLevel.js — Level 2: "St. Mary Asylum".
 *
 * A second reference-style level. Where the house is a tidy 3x2 grid, the
 * asylum is built around ONE long horizontal corridor that runs the full width
 * of the map, with treatment wards along the top and patient cells along the
 * bottom — every room opens onto the corridor.
 *
 * Layout (corridor is the open band in the middle; doorways are gaps):
 *    [ Reception ] [  Treatment  ] [   Surgery   ]   <- top wards
 *    [============ C O R R I D O R ===============]   <- long central hall
 *    [ Cell 1 ] [ Cell 2 ] [ Cell 3 ] [ Cell 4 ]     <- patient cells (Exit by Cell 4)
 */

LEVELS.register(defineLevel({
  id: 'asylum',
  name: 'St. Mary Asylum',
  world: { width: 1760, height: 1040 },

  // Walls: a long corridor (middle band) with wards above and cells below.
  // The vertical dividers are GAPPED across the corridor band (y 380..660) so
  // the hall stays open end-to-end; the horizontal dividers are gapped to make
  // a doorway from each room into the corridor.
  layout: LevelBuilder.roomGrid({
    world: { width: 1760, height: 1040 }, wall: 24,
    vDividers: [
      // Top-row ward dividers — solid ONLY above the corridor (open across the
      // corridor AND below it, so they don't split the bottom cells).
      { x: 610,  gaps: [[380, 1016]] },
      { x: 1170, gaps: [[380, 1016]] },
      // Bottom-row cell dividers — solid ONLY below the corridor (open above it
      // and across it, so they don't split the top wards).
      { x: 470,  gaps: [[24, 660]] },
      { x: 910,  gaps: [[24, 660]] },
      { x: 1310, gaps: [[24, 660]] },
    ],
    hDividers: [
      // Corridor ceiling: one doorway into each of the 3 top wards.
      { y: 380, gaps: [[260, 410], [820, 970], [1380, 1530]] },
      // Corridor floor: one doorway into each of the 4 bottom cells.
      { y: 660, gaps: [[210, 340], [610, 740], [1040, 1170], [1480, 1610]] },
    ],
  }),

  // Furniture = solid cover, kept clear of doorways, keys, hiding spots, spawns.
  furniture: [
    { x: 150,  y: 150,  w: 110, h: 40 },  // reception desk
    { x: 800,  y: 150,  w: 80,  h: 90 },  // treatment cabinet
    { x: 1380, y: 160,  w: 130, h: 80 },  // surgery table
    { x: 760,  y: 470,  w: 90,  h: 70 },  // corridor gurney
    { x: 1000, y: 480,  w: 70,  h: 70 },  // corridor crate
    { x: 250,  y: 820,  w: 100, h: 60 },  // cell 1 cot frame
    { x: 1080, y: 830,  w: 80,  h: 80 },  // cell 3 chair
  ],

  roomLabels: [
    { x: 290,  y: 200,  text: 'RECEPTION' },
    { x: 880,  y: 200,  text: 'TREATMENT' },
    { x: 1450, y: 200,  text: 'SURGERY' },
    { x: 880,  y: 520,  text: 'CORRIDOR' },
    { x: 240,  y: 840,  text: 'CELL 1' },
    { x: 680,  y: 840,  text: 'CELL 2' },
    { x: 1100, y: 840,  text: 'CELL 3' },
    { x: 1520, y: 840,  text: 'CELL 4' },
  ],

  playerStart: { x: 140, y: 300 },   // Reception (top-left ward)
  ghostStart:  { x: 1000, y: 760 },  // Cell 3 (bottom row, far side)

  exit: {
    panel: { x: 1660, y: 825, w: 76, h: 110 },
    zone:  { x: 1698, y: 880, r: 46 },  // hugs right wall in Cell 4
  },

  keys: [
    { x: 1600, y: 300 },  // Surgery (top-right ward)
    { x: 690,  y: 870 },  // Cell 2 (bottom row)
    { x: 250,  y: 520 },  // Corridor (left end)
  ],

  hidingSpots: [
    { x: 540,  y: 120,  type: 'closet' },  // Reception
    { x: 1100, y: 130,  type: 'closet' },  // Treatment
    { x: 380,  y: 930,  type: 'bed' },     // Cell 1
    { x: 1560, y: 930,  type: 'bed' },     // Cell 4
  ],

  patrolPoints: [
    { x: 320,  y: 120 }, { x: 540,  y: 320 },   // Reception
    { x: 840,  y: 320 }, { x: 1000, y: 130 },   // Treatment
    { x: 1450, y: 320 }, { x: 1620, y: 130 },   // Surgery
    { x: 200,  y: 520 }, { x: 600,  y: 600 },   // Corridor (left/mid)
    { x: 1150, y: 520 }, { x: 1600, y: 600 },   // Corridor (right)
    { x: 240,  y: 760 }, { x: 690,  y: 940 },   // Cell 1 / Cell 2
    { x: 1100, y: 760 }, { x: 1500, y: 940 },   // Cell 3 / Cell 4
  ],
}));
