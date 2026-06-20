/*
 * playtest.mjs — Automated Playwright play-test for The Last Light.
 *
 * Boots the game in a headless browser and exercises the real systems
 * (movement/collision, ghost navigation, chase, pathfinding, reachability)
 * plus a rAF-independent CPU benchmark, so the numbers reflect the GAME and
 * not headless Chromium's rAF throttling.
 *
 * Lessons baked in:
 *  - Headless backgrounds/occludes the page, throttling requestAnimationFrame.
 *    We launch with throttling disabled AND drive time-based scenarios inside
 *    an *active* page.evaluate (rAF keeps running while JS is awaiting it).
 *  - Wall-clock FPS in headless is unreliable; the honest perf metric is the
 *    CPU time of one frame's scripted work, measured in a tight loop.
 *
 * Run:  npm run playtest      (needs the local server on :8000)
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8000/index.html';
const log = (...a) => console.log(...a);

async function main() {
  const errors = [];
  const browser = await chromium.launch({
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  const report = { url: BASE, scenarios: {}, errors };
  const get = (fn, arg) => page.evaluate(fn, arg);

  log('→ loading', BASE);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.game && game.scene.getScene('TitleScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const s = game.scene.getScene('GameScene');
    return s && s.scene.isActive() && s.player && s.ghost;
  });
  log('✓ game booted');

  // ---------------------------------------------------------------
  // 1) Baseline: does fear rise in the dark, and a sanity FPS read
  //    (informational — rAF based, runs inside an active evaluate).
  // ---------------------------------------------------------------
  report.scenarios.baselineIdle = await get(async () => {
    const s = game.scene.getScene('GameScene');
    s.player.flashlightOn = false; s.fear = 0; s.ghost.setPosition(1400, 1000);
    const fearStart = Math.round(s.fear);
    const deltas = []; let last = performance.now(); const t0 = last;
    while (performance.now() - t0 < 2500) {
      await new Promise(r => requestAnimationFrame(r));
      const now = performance.now(); const d = now - last; last = now;
      if (d > 0 && d < 250) deltas.push(d);
    }
    deltas.sort((a, b) => a - b);
    const avg = deltas.reduce((x, y) => x + y, 0) / deltas.length;
    return {
      avgFps: Math.round(1000 / avg), frames: deltas.length,
      fearStart, fearEnd: Math.round(s.fear), fearRoseInDark: Math.round(s.fear) > fearStart,
    };
  });

  // ---------------------------------------------------------------
  // 2) CPU cost of one worst-case frame's scripted logic (the REAL
  //    perf metric — independent of rAF). Budget: well under 16.7ms.
  // ---------------------------------------------------------------
  report.scenarios.cpu = await get(() => {
    const s = game.scene.getScene('GameScene');
    s.player.setPosition(270, 300); s.player.flashlightOn = true; s.fear = 95;
    s.ghost.setPosition(460, 300); s.ghost.detection = 1; s.ghost._enter('CHASE'); s.chasing = true;
    // Neutralise rate-limited side effects (heartbeat audio, fake-shadow
    // spawns) so a tight loop measures pure CPU instead of cramming many
    // seconds' worth of one-off effects into microseconds.
    const wasMuted = s.sfx.muted; s.sfx.muted = true;
    const realShadow = s._fakeShadow; s._fakeShadow = () => {};
    const bench = (fn, N) => { fn(); const t0 = performance.now(); for (let i = 0; i < N; i++) fn(); return +((performance.now() - t0) / N).toFixed(4); };
    const out = {
      // Pure JS per-frame logic (AI, fear, noise, effects bookkeeping). No GPU.
      jsLogic_ms: bench(() => {
        s.ghost.update(0.016, s.player, s); s._beamHitsGhost();
        s._handleNoise(); s._updateFear(0.016); s._updateEffects(0.016);
      }, 2000),
      // GPU lighting. The number is the cost to QUEUE the WebGL ops; under
      // headless software-GL (SwiftShader) it runs synchronously, so it reads
      // much higher than on real hardware (verified 60 FPS in a headed browser).
      renderDarkness_ms: bench(() => s._renderDarkness(), 2000),
      findPathWorst_ms: bench(() => s.nav.findPath(60, 60, 1540, 1140), 500),
    };
    s.sfx.muted = wasMuted; s._fakeShadow = realShadow;
    return out;
  });

  // ---------------------------------------------------------------
  // 3) Movement + wall collision (real held key).
  // ---------------------------------------------------------------
  await get(() => {
    const s = game.scene.getScene('GameScene');
    s.chasing = false; s.player.setPosition(470, 120); s.player.flashlightOn = false;
    s.ghost.setPosition(1400, 1000); s.ghost._enter('PATROL');
  });
  const beforeX = await get(() => Math.round(game.scene.getScene('GameScene').player.x));
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  const mv = await get(() => Math.round(game.scene.getScene('GameScene').player.x));
  report.scenarios.movement = { beforeX, afterX: mv, movedRight: mv > beforeX, blockedByWall: mv < 512 };

  // ---------------------------------------------------------------
  // 4) Chase: clear line of sight should drive detection -> CHASE.
  // ---------------------------------------------------------------
  report.scenarios.chase = await get(async () => {
    const s = game.scene.getScene('GameScene');
    s.__catch = s._checkCatch; s._checkCatch = () => {};   // invulnerable for the test
    s.player.setPosition(270, 300); s.player.flashlightOn = false;
    s.ghost.setPosition(460, 300); s.ghost.detection = 0; s.ghost._enter('PATROL');
    const t0 = performance.now(); let becameChase = false, maxDet = 0;
    while (performance.now() - t0 < 3000) {
      await new Promise(r => requestAnimationFrame(r));
      maxDet = Math.max(maxDet, s.ghost.detection);
      if (s.ghost.state === 'CHASE') { becameChase = true; break; }
    }
    s._checkCatch = s.__catch;
    return { becameChase, maxDetection: +maxDet.toFixed(2), state: s.ghost.state };
  });

  // ---------------------------------------------------------------
  // 5) Reachability of keys / hiding spots / patrol points from start.
  //    (The exit zone deliberately hugs the outer wall, so it is allowed
  //    to sit on a blocked nav cell — we only require it to be reachable.)
  // ---------------------------------------------------------------
  report.scenarios.reachability = await get(() => {
    const s = game.scene.getScene('GameScene');
    const start = MAP.playerStart;
    const probe = (label, x, y, mustBeOpen) => {
      const onOpenCell = !s.nav.isBlockedWorld(x, y);
      const reachable = s.nav.findPath(start.x, start.y, x, y).length > 0;
      return { label, onOpenCell, reachable, ok: reachable && (!mustBeOpen || onOpenCell) };
    };
    const out = [];
    MAP.keys.forEach((k, i) => out.push(probe('key' + (i + 1), k.x, k.y, true)));
    out.push(probe('exit', MAP.exit.zone.x, MAP.exit.zone.y, false)); // wall-hug is fine
    MAP.hidingSpots.forEach((h, i) => out.push(probe('hide' + (i + 1), h.x, h.y, true)));
    MAP.patrolPoints.forEach((p, i) => out.push(probe('patrol' + (i + 1), p.x, p.y, true)));
    return { count: out.length, problems: out.filter(o => !o.ok) };
  });

  // ---------------------------------------------------------------
  // 6) Ghost navigation across the whole house (entrance -> basement),
  //    driven in an ACTIVE evaluate so rAF is not throttled.
  // ---------------------------------------------------------------
  report.scenarios.navigation = await get(async () => {
    const s = game.scene.getScene('GameScene');
    s.ended = false; s.chasing = false;
    s.player.setPosition(1328, 900); s.player.hidden = false; s.player.flashlightOn = false;
    s.ghost.setPosition(272, 160); s.ghost.detection = 0;
    s.ghost._enter('PATROL'); s.ghost.patrolTarget = { x: 1328, y: 900 };
    let reached = false, minD = 1e9, stuck = 0, frames = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 26000) {
      await new Promise(r => requestAnimationFrame(r));
      const g = s.ghost; frames++;
      const d = Phaser.Math.Distance.Between(g.x, g.y, 1328, 900);
      minD = Math.min(minD, d);
      if (d < 70) { reached = true; break; }
      s.ghost.patrolTarget = { x: 1328, y: 900 }; // keep it heading there
      if (Math.hypot(g.body.velocity.x, g.body.velocity.y) < 8 && d > 90) stuck++;
    }
    return {
      reachedBasement: reached, minDistanceToTarget: Math.round(minD),
      stuckFrames: stuck, frames, seconds: +((performance.now() - t0) / 1000).toFixed(1),
    };
  });

  await browser.close();

  // --- print report ---
  log('\n================ PLAYTEST REPORT ================');
  log(JSON.stringify(report, null, 2));
  log('================================================\n');

  // --- verdicts (honest gates) ---
  const r = report.scenarios;
  const v = [
    ['no console / page errors', report.errors.length === 0],
    ['fear rises in the dark', !!r.baselineIdle.fearRoseInDark],
    ['JS frame logic < 1ms CPU', r.cpu.jsLogic_ms < 1],
    ['render queue < 2ms (sw-GL)', r.cpu.renderDarkness_ms < 2],
    ['pathfind < 1ms/call', r.cpu.findPathWorst_ms < 1],
    ['moves on key press', r.movement.movedRight],
    ['blocked by wall', r.movement.blockedByWall],
    ['line-of-sight triggers CHASE', r.chase.becameChase],
    ['all targets reachable/valid', r.reachability.problems.length === 0],
    ['ghost crosses the house', r.navigation.reachedBasement],
    ['ghost never stalls', r.navigation.stuckFrames === 0],
  ];
  log('VERDICTS:');
  for (const [name, ok] of v) log(`  ${ok ? '✅' : '❌'} ${name}`);
  const failed = v.filter(([, ok]) => !ok);
  log(`\n${v.length - failed.length}/${v.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('PLAYTEST CRASHED:', e); process.exit(2); });
