/*
 * Levels.js — The level registry + the `defineLevel()` normalizer.
 *
 * To add a new level you do NOT touch the engine. You write one file that calls:
 *
 *     LEVELS.register(defineLevel({ id: 'myLevel', ... }));
 *
 * ...add a <script> tag for it in index.html, and it automatically appears on
 * the title screen's level picker and is validated by the playtest. That's it.
 *
 * `defineLevel()` fills in defaults and merges the geometry pieces (grid walls +
 * furniture) into a single, uniform shape the GameScene understands:
 *
 *   { id, name, world:{width,height}, walls:[{x,y,w,h,type?}], roomLabels:[],
 *     playerStart:{x,y}, ghostStart:{x,y},
 *     exit:{ panel:{x,y,w,h}, zone:{x,y,r} },
 *     keys:[{x,y}], hidingSpots:[{x,y,type}], patrolPoints:[{x,y}] }
 */

const LEVELS = {
  _list: [],
  _byId: Object.create(null),

  register(level) {
    if (this._byId[level.id]) throw new Error('Duplicate level id: ' + level.id);
    this._byId[level.id] = level;
    this._list.push(level);
    return level;
  },

  get(id) { return this._byId[id] || this._list[0] || null; },
  all() { return this._list.slice(); },
  defaultId() { return this._list.length ? this._list[0].id : null; },
};

// Normalize a level spec into the uniform shape used everywhere.
function defineLevel(spec) {
  if (!spec.id) throw new Error('A level needs an id');
  if (!spec.world) throw new Error(`Level "${spec.id}" needs a world {width,height}`);

  // Walls come from (optional) grid layout + explicit walls + furniture.
  const walls = [];
  if (spec.layout && spec.layout.walls) walls.push(...spec.layout.walls);
  if (spec.walls) walls.push(...spec.walls);
  if (spec.furniture) for (const f of spec.furniture) walls.push({ ...f, type: 'furniture' });

  return {
    id: spec.id,
    name: spec.name || spec.id,
    world: spec.world,
    walls,
    roomLabels: spec.roomLabels || [],
    playerStart: spec.playerStart,
    ghostStart: spec.ghostStart,
    exit: spec.exit,
    keys: spec.keys || [],
    hidingSpots: spec.hidingSpots || [],
    patrolPoints: spec.patrolPoints || [],
  };
}
