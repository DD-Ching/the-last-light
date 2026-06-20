/*
 * MapData.js — The abandoned house layout.
 *
 * Everything is plain rectangles in WORLD coordinates (top-left origin).
 * Walls double as collision AND navigation blockers. "furniture" rectangles
 * are just walls that we draw in a different colour for atmosphere/cover.
 *
 * The house is a 3 x 2 grid of rooms connected by doorways (gaps in walls):
 *
 *    [ Entrance ] [ Hallway ] [ Bedroom  ]
 *    [ Kitchen  ] [ Storage ] [ Basement ]   <- Exit door is in the Basement
 *
 * To redesign the house, edit the rectangles below. The world is bigger
 * than the camera, so the camera scrolls to follow the player.
 */

const MAP = {
  world: { width: CONFIG.world.width, height: CONFIG.world.height },

  // Solid rectangles. type 'furniture' is drawn differently but still solid.
  walls: [
    // --- Outer border ---
    { x: 0,    y: 0,    w: 1600, h: 24 },
    { x: 0,    y: 1176, w: 1600, h: 24 },
    { x: 0,    y: 0,    w: 24,   h: 1200 },
    { x: 1576, y: 0,    w: 24,   h: 1200 },

    // --- Vertical divider A (x ~520), doorway gaps at y 250-360 & 840-950 ---
    { x: 520, y: 24,  w: 24, h: 226 },
    { x: 520, y: 360, w: 24, h: 240 },
    { x: 520, y: 600, w: 24, h: 240 },
    { x: 520, y: 950, w: 24, h: 226 },

    // --- Vertical divider B (x ~1056), same doorway pattern ---
    { x: 1056, y: 24,  w: 24, h: 226 },
    { x: 1056, y: 360, w: 24, h: 240 },
    { x: 1056, y: 600, w: 24, h: 240 },
    { x: 1056, y: 950, w: 24, h: 226 },

    // --- Horizontal divider (y ~600), doorways at x 230-340, 760-870, 1230-1340 ---
    { x: 24,   y: 600, w: 206, h: 24 },
    { x: 340,  y: 600, w: 180, h: 24 },
    { x: 544,  y: 600, w: 216, h: 24 },
    { x: 870,  y: 600, w: 186, h: 24 },
    { x: 1080, y: 600, w: 150, h: 24 },
    { x: 1340, y: 600, w: 236, h: 24 },

    // --- Furniture / cover (still solid) ---
    { x: 760,  y: 280, w: 90,  h: 58,  type: 'furniture' }, // hallway table
    { x: 300,  y: 680, w: 120, h: 36,  type: 'furniture' }, // kitchen counter
    { x: 620,  y: 760, w: 70,  h: 70,  type: 'furniture' }, // storage crate
    { x: 700,  y: 760, w: 70,  h: 70,  type: 'furniture' }, // storage crate
    { x: 1410, y: 440, w: 120, h: 90,  type: 'furniture' }, // bedroom bed frame
    { x: 1300, y: 760, w: 90,  h: 90,  type: 'furniture' }, // basement boiler
  ],

  // Labels drawn faintly in each room centre (atmosphere only).
  roomLabels: [
    { x: 272,  y: 312,  text: 'ENTRANCE' },
    { x: 800,  y: 312,  text: 'HALLWAY' },
    { x: 1328, y: 312,  text: 'BEDROOM' },
    { x: 272,  y: 900,  text: 'KITCHEN' },
    { x: 800,  y: 900,  text: 'STORAGE' },
    { x: 1328, y: 900,  text: 'BASEMENT' },
  ],

  playerStart: { x: 180, y: 150 },
  ghostStart:  { x: 660, y: 460 },

  // Exit door: a panel on the basement's outer (right) wall.
  // The zone is what the player must reach (after collecting all keys).
  exit: {
    panel: { x: 1500, y: 850, w: 76, h: 110 },
    zone:  { x: 1538, y: 905, r: 46 },
  },

  // Three keys, each in a different room.
  keys: [
    { x: 1330, y: 175 }, // bedroom
    { x: 175,  y: 1040 }, // kitchen
    { x: 800,  y: 1045 }, // storage
  ],

  // Hiding spots (closets / beds). Non-solid: you stand in/at them.
  hidingSpots: [
    { x: 1490, y: 120,  type: 'closet' }, // bedroom closet
    { x: 110,  y: 880,  type: 'closet' }, // kitchen pantry
    { x: 970,  y: 1095, type: 'bed' },    // storage cot
    { x: 1170, y: 1095, type: 'closet' }, // basement closet
  ],

  // Random wander targets for the ghost while patrolling.
  patrolPoints: [
    { x: 272,  y: 160 }, { x: 272,  y: 500 },
    { x: 800,  y: 160 }, { x: 660,  y: 500 },
    { x: 1328, y: 300 }, { x: 1480, y: 320 },
    { x: 272,  y: 900 }, { x: 175,  y: 1100 },
    { x: 800,  y: 940 }, { x: 950,  y: 1000 },
    { x: 1328, y: 900 }, { x: 1200, y: 1060 },
  ],
};
