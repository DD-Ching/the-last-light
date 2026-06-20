/*
 * NavGrid.js — A simple grid for ghost navigation + line-of-sight.
 *
 * We chop the world into square cells. A cell is "blocked" if it overlaps
 * any wall (expanded a little so the ghost doesn't scrape corners).
 *
 *  - findPath()    : BFS path between two points, then smoothed.
 *  - lineBlocked() : is the straight line between two points blocked by a wall?
 *                    Used for line-of-sight (can the ghost see the player?).
 *
 * BFS is plenty fast for a grid this small and keeps the code beginner-readable.
 */

class NavGrid {
  constructor(worldW, worldH, cell, walls, pad = 14) {
    this.cell = cell;
    this.cols = Math.ceil(worldW / cell);
    this.rows = Math.ceil(worldH / cell);
    // blocked[row][col] = true if a wall sits in that cell.
    this.blocked = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        const cx = c * cell + cell / 2;
        const cy = r * cell + cell / 2;
        row.push(this._cellHitsWall(cx, cy, cell / 2 + pad, walls));
      }
      this.blocked.push(row);
    }
  }

  _cellHitsWall(cx, cy, half, walls) {
    for (const w of walls) {
      // Axis-aligned box vs box overlap test.
      if (cx + half > w.x && cx - half < w.x + w.w &&
          cy + half > w.y && cy - half < w.y + w.h) {
        return true;
      }
    }
    return false;
  }

  toCol(x) { return Math.floor(x / this.cell); }
  toRow(y) { return Math.floor(y / this.cell); }
  inBounds(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  isBlockedCell(c, r) { return !this.inBounds(c, r) || this.blocked[r][c]; }

  isBlockedWorld(x, y) {
    return this.isBlockedCell(this.toCol(x), this.toRow(y));
  }

  // Centre point of a cell in world coordinates.
  cellCenter(c, r) {
    return { x: c * this.cell + this.cell / 2, y: r * this.cell + this.cell / 2 };
  }

  // Find the nearest non-blocked cell to (x,y) — used when a target sits
  // inside a wall padding zone.
  _nearestOpen(c, r) {
    if (!this.isBlockedCell(c, r)) return { c, r };
    for (let radius = 1; radius < 6; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (!this.isBlockedCell(c + dc, r + dr)) return { c: c + dc, r: r + dr };
        }
      }
    }
    return null;
  }

  // Is the straight segment (x1,y1)->(x2,y2) clear of walls?
  // Returns true if BLOCKED. We sample along the line in half-cell steps.
  lineBlocked(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isBlockedWorld(x1 + dx * t, y1 + dy * t)) return true;
    }
    return false;
  }

  // BFS path from start world point to target world point.
  // Returns an array of world waypoints (smoothed), or [] if no path.
  findPath(sx, sy, tx, ty) {
    const start = this._nearestOpen(this.toCol(sx), this.toRow(sy));
    const goal = this._nearestOpen(this.toCol(tx), this.toRow(ty));
    if (!start || !goal) return [];

    const key = (c, r) => r * this.cols + c;
    const visited = new Uint8Array(this.cols * this.rows);
    const cameFrom = new Int32Array(this.cols * this.rows).fill(-1);
    const queue = [start];
    visited[key(start.c, start.r)] = 1;
    const goalKey = key(goal.c, goal.r);
    let found = false;

    // 4-directional BFS.
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const ck = key(cur.c, cur.r);
      if (ck === goalKey) { found = true; break; }
      for (const [dc, dr] of dirs) {
        const nc = cur.c + dc, nr = cur.r + dr;
        if (this.isBlockedCell(nc, nr)) continue;
        const nk = key(nc, nr);
        if (visited[nk]) continue;
        visited[nk] = 1;
        cameFrom[nk] = ck;
        queue.push({ c: nc, r: nr });
      }
    }
    if (!found) return [];

    // Reconstruct cell path from goal back to start.
    const cells = [];
    let k = goalKey;
    while (k !== -1) {
      const c = k % this.cols, r = Math.floor(k / this.cols);
      cells.unshift({ c, r });
      if (c === start.c && r === start.r) break;
      k = cameFrom[k];
    }

    // Convert to world points and smooth (string-pulling): keep a waypoint
    // only when the straight line from the last kept point is blocked.
    const pts = cells.map(({ c, r }) => this.cellCenter(c, r));
    if (pts.length <= 2) return pts;
    const smoothed = [pts[0]];
    let anchor = 0;
    for (let i = 2; i < pts.length; i++) {
      if (this.lineBlocked(pts[anchor].x, pts[anchor].y, pts[i].x, pts[i].y)) {
        smoothed.push(pts[i - 1]);
        anchor = i - 1;
      }
    }
    smoothed.push(pts[pts.length - 1]);
    return smoothed;
  }
}
