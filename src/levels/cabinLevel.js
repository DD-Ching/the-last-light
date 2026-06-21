/*
 * cabinLevel.js — Level 2: "The Lakeside Cabin" (a tight, claustrophobic map).
 *
 * Authored exactly like houseLevel.js: declare the dividers + their doorway
 * gaps, drop furniture / keys / hiding spots / spawns on top, register it. The
 * world is deliberately small so the ghost is never far away.
 *
 * Layout (3 x 2 rooms, doorways are gaps in the dividers):
 *    [ Porch   ] [ Living  ] [ Bedroom ]
 *    [ Kitchen ] [ Cellar  ] [ Bathroom ]   <- Exit is in the Bathroom
 */

LEVELS.register(defineLevel({
  id: 'cabin',
  name: 'The Lakeside Cabin',
  world: { width: 1280, height: 960 },

  // Walls: declare the dividers + their doorway gaps; the builder does the rest.
  layout: LevelBuilder.roomGrid({
    world: { width: 1280, height: 960 }, wall: 24,
    vDividers: [
      { x: 440, gaps: [[200, 320], [620, 740]] },
      { x: 856, gaps: [[200, 320], [620, 740]] },
    ],
    hDividers: [
      { y: 480, gaps: [[180, 300], [580, 700], [980, 1100]] },
    ],
  }),

  // Furniture = solid cover, drawn warmer than walls.
  furniture: [
    { x: 600,  y: 120, w: 96,  h: 56 },  // living room sofa
    { x: 1080, y: 130, w: 110, h: 80 },  // bedroom bed
    { x: 120,  y: 660, w: 120, h: 36 },  // kitchen counter
    { x: 600,  y: 700, w: 70,  h: 70 },  // cellar crate
    { x: 690,  y: 700, w: 70,  h: 70 },  // cellar crate
    { x: 1000, y: 640, w: 80,  h: 80 },  // bathroom tub
  ],

  roomLabels: [
    { x: 232,  y: 252, text: 'PORCH' },
    { x: 648,  y: 252, text: 'LIVING' },
    { x: 1056, y: 252, text: 'BEDROOM' },
    { x: 232,  y: 708, text: 'KITCHEN' },
    { x: 648,  y: 708, text: 'CELLAR' },
    { x: 1056, y: 708, text: 'BATHROOM' },
  ],

  playerStart: { x: 160, y: 140 },
  ghostStart:  { x: 648, y: 380 },

  exit: {
    panel: { x: 1180, y: 653, w: 76, h: 110 },
    zone:  { x: 1218, y: 708, r: 46 },
  },

  keys: [
    { x: 1056, y: 360 },  // bedroom
    { x: 160,  y: 820 },  // kitchen
    { x: 520,  y: 560 },  // cellar
  ],

  hidingSpots: [
    { x: 380,  y: 120,  type: 'closet' },
    { x: 1170, y: 360,  type: 'bed' },
    { x: 110,  y: 560,  type: 'closet' },
    { x: 1056, y: 860,  type: 'closet' },
  ],

  patrolPoints: [
    { x: 232,  y: 140 }, { x: 232,  y: 400 },
    { x: 648,  y: 420 }, { x: 760,  y: 160 },
    { x: 980,  y: 160 }, { x: 1056, y: 420 },
    { x: 232,  y: 560 }, { x: 320,  y: 840 },
    { x: 648,  y: 560 }, { x: 760,  y: 860 },
    { x: 1056, y: 560 }, { x: 1100, y: 840 },
  ],
}));
