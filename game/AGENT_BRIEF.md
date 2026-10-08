# Agent brief — shared contracts for "The Frozen Hour"

Read this file and `game/DESIGN.md` (its LANGUAGE OVERRIDE block says everything player-facing is ENGLISH).

## Ownership rules (mandatory)
- You write ONLY the file(s) named in your task. Never edit any other file. Never commit. Never install anything.
- Plain browser scripts only: wrap in `(function () { ... })();`. No `import`/`export`.
- Check syntax with `node --check <your file>` before you finish. Fix all errors.
- Everything defensive: never throw on unknown inputs. Unknown pose.state behaves like `idle`.
- Keep each file under ~500 lines.

## Art contract (characters and creatures)
Register with the shared helper, which must be loaded first (it is):
```js
(function () {
  ART.register({
    id: 'leo', w: 22, h: 46,            // logical hitbox size in px (see table in your task)
    draw(ctx, p) { /* draw facing RIGHT; origin (0,0) = centre of the feet; y negative is up */ },
    portrait(ctx, expr, t) { /* 200x200 box centred on (0,0): x and y in [-100, 100]; expr: neutral|happy|sad|angry|surprised|worried */ }
  });
})();
```
- The engine flips left-facing sprites itself. Do NOT flip in `draw`.
- Pose fields `p`: `state` (string), `t` (seconds in this state), `time` (global seconds, use for loops), `vx`, `vy` (px/s), `phase` (boss phase 1..3), `facing` (ignore; the engine handles it).
- Helpers on `ART` (all draw an outline by default in `ART.OUT`, colour `#1c1420`, unless `opts.stroke === false`):
  `ART.limb(ctx,x1,y1,x2,y2,width,color,opts)` rounded thick line (arms, legs, cables)
  `ART.ell(ctx,x,y,rx,ry,color,opts)` ellipse; `opts.rot`
  `ART.rr(ctx,x,y,w,h,r,color,opts)` rounded rectangle
  `ART.poly(ctx,pts,color,opts)` pts = `[[x,y],...]`
  `ART.gear(ctx,x,y,r,teeth,rot,color,opts)`
  `ART.eye(ctx,x,y,r,lookX,lookY,blink,opts)` blink 0..1
  `ART.shade(hex,amt)` amt in [-1,1]
  `ART.clamp(v,a,b)`, `ART.lerp(a,b,t)`
  `opts`: `{ stroke: true|false, lw: 2, rot: 0, alpha: 1, outline: '#hex' }`.
- Raw `ctx` calls (beginPath, bezierCurveTo, arc, ellipse, fill, stroke) are fine.
- Style: flat vector with thick dark outlines, light from the upper left. Readable silhouettes. Small secondary details (buttons, rivets, stitching). No pure rectangles for people.
- Animation quality: breathing idle; a real walk cycle with opposed arms and legs; a clear jump, fall and land; an attack with anticipation and an arc; a hurt flinch; a death fall that fades out.
- Portrait: head and shoulders filling the 200x200 box. Show all six expressions via brows, eyes and mouth. Blink using `t`.

### Person states (characters)
`idle`, `walk`, `run`, `jump`, `fall`, `land`, `attack`, `dash`, `hurt`, `dead`, `talk`, `slow`, `frozen` (NPC statue look, optional).

### Boss states (regent only)
`intro`, `idle`, `walk`, `telegraph` (raising the cane, glow building), `slam` (cane strikes the ground), `beam` (sand beam from the hand: the engine's hitbox is a rectangle 330 px long, 26 px tall, at height y -92..-66, to the right of the boss, so draw the beam there), `charge` (lean-in dash), `summon` (coat opens, gears orbit), `hurt`, `dead`. Phase 2 cracks the mask more; phase 3 tears the coat and gears orbit (`p.phase`).

## Creature contract
Same API. ids: `rouage` (w 26, h 18), `fige` (w 26, h 48), `sablier` (w 26, h 34). States: `idle`, `walk`, `attack`, `hurt`, `dead` (pose.t grows from 0 after death).

## Environment theme contract
Write `window.ENV_THEMES.<theme>` as an object with optional methods:
```js
(function () {
  window.ENV_THEMES = window.ENV_THEMES || {};
  ENV_THEMES.station = {
    background(ctx, camX, camY, t, W, H) { /* opaque full-screen art, parallax (0.2x to 0.5x camX), W=960 H=540 */ },
    tile(ctx, ch, x, y, t, nb) { /* ch in '#','=','^','C','X','o','h','B'; draw ONLY inside the 32x32 cell at (x,y); nb = {u,d,l,r} solid neighbours */ },
    foreground(ctx, camX, camY, t, W, H) { /* low-alpha particles, 0.1-0.4 alpha only */ }
  };
})();
```
Any method you omit falls back to the generic version in `env.js`. Use `ctx.save()`/`ctx.restore()` in each method. Never call `ctx.setTransform` (it would wipe the camera). Keep the clock motif: clocks in the sky always show 23:47.

## Music track contract
```js
(function () {
  window.AUDIO_TRACKS = window.AUDIO_TRACKS || {};
  AUDIO_TRACKS.ch1 = {
    bpm: 84,
    wave: 'triangle',      // 'triangle' | 'sine' | 'square' | 'sawtooth' for the lead; bass uses sawtooth or square
    lead: 'A4 - C5 - E5 - D5 ...',   // 32 whitespace-separated steps (16th notes); note names like A4, C#5, Bb3 are NOT allowed, use sharps only; '-' = rest
    bass: 'A2 - - - F2 - - - ...',   // 32 steps
    perc: 'x - - - k - - - ...'      // 32 steps: 'x' = hi-hat noise, 'k' = kick, '.' = nothing
  };
})();
```
Each note must match `[A-G]#?[0-9]`. Write 32 steps for lead, bass and perc. Keep the melody singable and the mood right. Lead should sit in octaves 4-5, bass in 2-3.

## Character sheet (every character and creature agent also writes this)
Write `game/characters/<id>.md` (creature: `game/characters/<id>.md` too), 20-30 lines:
- Name, age, role in the story, one-line logline
- Look (what the art shows) and a palette
- Personality, fears, what they want
- Voice: three sample lines of English dialogue
- Relationships to Leo and the other characters
- Arc across chapters 1 to 5 (one bullet per chapter, the part of the story that is theirs)
The story is in `game/DESIGN.md` sections 1 and 2. Stay consistent with it. Do not change ids.

## Final report
When finished, reply with ONE line: the file(s) you wrote and `OK` (or the problem). Do not paste code.
