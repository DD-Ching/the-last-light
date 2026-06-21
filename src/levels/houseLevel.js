/*
 * houseLevel.js — Level 1: "The Abandoned House" (the original map).
 *
 * This is the reference example for authoring a level. Copy this file, change
 * the id/name and the numbers, add a <script> tag in index.html, and you have a
 * brand-new level — no engine code to touch.
 *
 * Layout (3 x 2 rooms, doorways are gaps in the dividers):
 *    [ Entrance ] [ Hallway ] [ Bedroom  ]
 *    [ Kitchen  ] [ Storage ] [ Basement ]   <- Exit is in the Basement
 */

LEVELS.register(defineLevel({
  id: 'house',
  name: 'The Abandoned House',
  world: { width: 1600, height: 1200 },

  // Walls: declare the dividers + their doorway gaps; the builder does the rest.
  layout: LevelBuilder.roomGrid({
    world: { width: 1600, height: 1200 }, wall: 24,
    vDividers: [
      { x: 520,  gaps: [[250, 360], [840, 950]] },
      { x: 1056, gaps: [[250, 360], [840, 950]] },
    ],
    hDividers: [
      { y: 600, gaps: [[230, 340], [760, 870], [1230, 1340]] },
    ],
  }),

  // Furniture = solid cover, drawn warmer than walls.
  furniture: [
    { x: 760,  y: 280, w: 90,  h: 58 },  // hallway table
    { x: 300,  y: 680, w: 120, h: 36 },  // kitchen counter
    { x: 620,  y: 760, w: 70,  h: 70 },  // storage crate
    { x: 700,  y: 760, w: 70,  h: 70 },  // storage crate
    { x: 1410, y: 440, w: 120, h: 90 },  // bedroom bed
    { x: 1300, y: 760, w: 90,  h: 90 },  // basement boiler
  ],

  roomLabels: [
    { x: 272,  y: 312, text: 'ENTRANCE' },
    { x: 800,  y: 312, text: 'HALLWAY' },
    { x: 1328, y: 312, text: 'BEDROOM' },
    { x: 272,  y: 900, text: 'KITCHEN' },
    { x: 800,  y: 900, text: 'STORAGE' },
    { x: 1328, y: 900, text: 'BASEMENT' },
  ],

  playerStart: { x: 180, y: 150 },
  ghostStart:  { x: 660, y: 460 },

  exit: {
    panel: { x: 1500, y: 850, w: 76, h: 110 },
    zone:  { x: 1538, y: 905, r: 46 },
  },

  keys: [
    { x: 1330, y: 175 },  // bedroom
    { x: 175,  y: 1040 }, // kitchen
    { x: 800,  y: 1045 }, // storage
  ],

  hidingSpots: [
    { x: 1490, y: 120,  type: 'closet' },
    { x: 110,  y: 880,  type: 'closet' },
    { x: 970,  y: 1095, type: 'bed' },
    { x: 1170, y: 1095, type: 'closet' },
  ],

  patrolPoints: [
    { x: 272,  y: 160 }, { x: 272,  y: 500 },
    { x: 800,  y: 160 }, { x: 660,  y: 500 },
    { x: 1328, y: 300 }, { x: 1480, y: 320 },
    { x: 272,  y: 900 }, { x: 175,  y: 1100 },
    { x: 800,  y: 940 }, { x: 950,  y: 1000 },
    { x: 1328, y: 900 }, { x: 1200, y: 1060 },
  ],
}));
