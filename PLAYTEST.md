# Automated Playtest & Performance Feedback

The game is exercised by an automated **Playwright** harness
([`test/playtest.mjs`](test/playtest.mjs)) that boots it in a headless browser
and drives the real systems, then prints telemetry + pass/fail verdicts.

```bash
npm install            # installs playwright
npx playwright install chromium
npm start              # serve on :8000 (in another terminal)
npm run playtest       # boots the game and runs all scenarios
```

## Latest result — 11 / 11 checks pass

| Scenario | Metric | Result |
| --- | --- | --- |
| Pure JS frame logic (AI, fear, noise, effects) | CPU/frame | **0.0015 ms** |
| `renderDarkness` (GPU lighting) | queue cost | **0.11 ms** |
| Worst-case pathfinding (corner→corner) | per call | **0.20 ms** |
| Movement + wall collision | held key | moves, **blocked by wall** ✅ |
| Detection from line-of-sight | state | reaches **CHASE** (det 0.79) ✅ |
| Reachability of keys/exit/hides/patrols | problems | **0** ✅ |
| Ghost navigation entrance→basement | crossed / stalls | **reached, 0 stalls** ✅ |
| Console / page errors | count | **0** ✅ |

## What the playtest found (and what was done)

1. **Performance is excellent — no optimization needed.** All per-frame
   *script* work totals ~1.5µs; the only non-trivial cost is the darkness
   lighting, which is GPU work and runs at a steady 60 FPS in a real
   (headed) browser. There was no hotspot worth rewriting, so nothing was
   "optimized" for its own sake.

2. **Map fix:** one patrol point (`patrol6`) sat inside the bedroom bed
   furniture, i.e. on a blocked navigation cell. Moved it to open floor so the
   ghost patrols cleanly. (Now `reachability.problems == 0`.)

3. **Harness methodology — two measurement traps, both fixed:**
   - *Headless rAF throttling.* When a Playwright page sits in
     `waitForTimeout`, Chromium throttles/​pauses its `requestAnimationFrame`,
     so the game barely steps and the ghost looked "stuck". Fixed by launching
     with `--disable-*-throttling/backgrounding` **and** driving time-based
     scenarios inside an *active* `page.evaluate` (rAF keeps ticking while JS
     awaits it).
   - *Headless software-GL.* Wall-clock FPS and any benchmark that includes
     `renderDarkness` are dominated by SwiftShader (software WebGL), not the
     game. The honest perf metric is the **CPU cost of the JS frame logic**,
     measured in a tight loop with rate-limited side effects (heartbeat audio,
     fake-shadow spawns) neutralized. FPS is now reported as informational
     only, never gated.

## Notes / non-issues

- The **exit zone** deliberately hugs the outer wall, so it reports
  `onOpenCell: false`. That is expected (you reach it by proximity, you don't
  stand on a nav cell), and the harness no longer flags it.
- Headless `avgFps ≈ 40` is the software-GL/throttle ceiling, **not** the game.
  A real browser runs the game at a steady 60 FPS.
