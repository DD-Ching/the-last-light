/*
 * LevelBuilder.js — Tools for authoring levels WITHOUT hand-computing walls.
 *
 * The painful part of a level is the geometry: outer walls, room dividers, and
 * doorway gaps. `roomGrid()` does that for you — you declare where the dividers
 * are and where the doorways (gaps) go, and it returns the wall rectangles.
 *
 * A "divider" is a single straight interior wall. A "gap" is an open doorway in
 * it. Everything is in world pixels (top-left origin).
 *
 *   LevelBuilder.roomGrid({
 *     world: { width: 1600, height: 1200 }, wall: 24,
 *     vDividers: [ { x: 520, gaps: [[250,360],[840,950]] } ],  // vertical walls
 *     hDividers: [ { y: 600, gaps: [[230,340]] } ],            // horizontal walls
 *   }) -> { walls: [ {x,y,w,h}, ... ] }   // outer border + dividers
 *
 * The level file then adds furniture / keys / hiding spots / spawns on top.
 * See `houseLevel.js` for a complete example.
 */

const LevelBuilder = {
  // Return the SOLID segments of the span [start,end] once `gaps` are removed.
  // e.g. solidSegments(24, 1176, [[250,360]]) -> [[24,250],[360,1176]]
  solidSegments(start, end, gaps = []) {
    const sorted = gaps
      .map(g => [Math.min(g[0], g[1]), Math.max(g[0], g[1])])
      .sort((a, b) => a[0] - b[0]);
    const segs = [];
    let cur = start;
    for (const [g0, g1] of sorted) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < end) segs.push([cur, end]);
    return segs;
  },

  // Build the outer border + interior dividers (with doorway gaps) for a house.
  roomGrid({ world, wall = 24, vDividers = [], hDividers = [] }) {
    const W = world.width, H = world.height, t = wall;
    const walls = [
      { x: 0,     y: 0,     w: W, h: t }, // top
      { x: 0,     y: H - t, w: W, h: t }, // bottom
      { x: 0,     y: 0,     w: t, h: H }, // left
      { x: W - t, y: 0,     w: t, h: H }, // right
    ];
    // Vertical dividers run top↔bottom (between the border walls) minus gaps.
    for (const d of vDividers)
      for (const [a, b] of this.solidSegments(t, H - t, d.gaps || []))
        walls.push({ x: d.x, y: a, w: t, h: b - a });
    // Horizontal dividers run left↔right minus gaps.
    for (const d of hDividers)
      for (const [a, b] of this.solidSegments(t, W - t, d.gaps || []))
        walls.push({ x: a, y: d.y, w: b - a, h: t });
    return { walls };
  },
};
