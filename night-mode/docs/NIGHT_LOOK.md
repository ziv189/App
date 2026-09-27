# The night look

Every value that shapes the night lives in one object: **`src/render/nightConfig.ts` (`NIGHT`)**. With the
debug build (`?debug`), `nm.night` in the browser console is that object; change a value and call
`nm.applyNight()` to see it (values marked *(reload)* are compiled into shaders).

## Audit (before this pass)

What made the night read as "the day with the brightness turned down":

| Problem | Where it came from |
| --- | --- |
| Sky was a daytime photo, darkened and tinted blue; its sun became the "moon" (a flare, not a disc) | `World.sky()` graded an HDRI on load |
| No stars (the white dots were snowflakes), no clouds, nothing moving overhead | no night sky existed |
| No fog or depth: the far shore and the trees 150 m away were as crisp as the porch | `scene.fog` was always null |
| Moonlit rooms were pushed to 1.5–3.4× exposure: evenly lit, blue-filtered daylight | per-room `exposure.moon` |
| The baked "moon" indoors is a soft area light in each window: no window-shaped pools, no beams | Blender rigs (`window_moon` AREA lights) |
| One flat blue cast over everything, lifted milky blacks, AgX's low contrast | post chain (AgX + saturation only) |
| Practical lights (street lamp, lanterns, windows) were baked but had no glow, no halo, no flicker | lamps only in the lightmap |
| Lit windows threw no light on the snow | exterior bake had no window lights |
| Nothing moved except falling snow | static trees, sky, air |
| The snow texture visibly repeated; paths and ice looked like the snow | one tiled texture each |
| Nothing against the sky but trees | no silhouettes (poles, wires) |

## What changed

**Lighting**
- Indoors, the moon is a real light: one shadow-casting directional light aimed through the current room's
  windows (`cells.ts` → `moonBeam`), only while the house lights are off. Window-shaped pools fall across floors,
  furniture and walls; blinds throw stripes; a power cut leaves the moon as the only light. (`src/fx/MoonBeams.ts`)
- Glass never blocks it (`/glass/` materials don't cast shadows).
- Moonlit rooms keep their own balance at 0.72× the old exposure, with a less blue baked moon
  (`exposure.interiorMoonScale`, `interiorMoonTint`).
- Outdoors the baked low south-east moon stays; everything added at runtime (pines, poles) is lit from the same
  direction (`src/render/Moonlit.ts`).
- Warm practicals: halos on the street lamp and the six lanterns, the street lamp's cone of light, noise-driven
  flicker (a gentle waver, and an old lamp's occasional dip), the lamp glass glowing in step. (`src/fx/NightOutdoors.ts`)
- The house's windows from outside (`src/fx/HouseWindows.ts`): each window looks into a room behind the glass
  (interior mapping: walls, ceiling, floor, furniture, a picture, a doorway to a darker hall, a ceiling light or a
  standard lamp), with curtains or a blind lit through, and the night sky and the moon reflected at glancing
  angles. Windows close together on a storey share one room (a bay looks into one room). Rooms differ in colour,
  lamp warmth and brightness; some are empty and dark, the garage too, and a few have a television flickering blue.
  The lit ground-floor windows lay soft, window-shaped patches of light on the snow a step out from the wall (the
  wall below the sill shades the ground next to it), crossed by the sash bars' shadows. The story's "house wakes
  up" lights the rooms in four steps (ground floor first), every room blazing warm.
- Shadow budget: the moon indoors and the phone's flashlight. Everything else is baked, emissive or unshadowed.
- Tone mapping: ACES filmic (deeper blacks than AgX), exposure per state in `NIGHT.exposure`.

**Atmosphere**
- A procedural night sky (`src/render/NightSky.ts`): near-black zenith to deep blue-purple horizon, a haze band,
  a faint warm town glow low in the south, two layers of stars of varied size, colour and twinkle, a faint Milky
  Way, a moon disc with seas, limb darkening, glow, halo and the faint 22° ice ring of a cold night, and drifting
  moonlit clouds with silver edges that veil the moon and hide the stars.
- Height fog on every material (`src/render/HeightFog.ts`): thick over the snow and the ice, thinning with height,
  integrated along each view ray, brighter towards the moon. Distant treelines melt into silhouettes against the
  lighter horizon.
- Drifting low mist over the garden and the lake; falling snow that lights up as it drifts through lamp light;
  shafts of lit air through the windows indoors, with dust drifting in them.
- Indoors, the view out of the windows is a picture of the garden taken once; snow falls past the glass in
  front of it (`src/fx/WindowSnow.ts`: only outside the room, denser than the garden's own snowfall so that a
  window shows more than a handful of flakes, and lit warm by the house's lights for a few metres out), and
  the falling snow is left out of that picture so no flakes hang frozen in it.

**Materials**
- Snow: large wind-blown drifts of lighter and darker snow over the tiled texture, varied roughness, and crystals
  that glint where light actually falls (and change as you move). Paths and the ice get compacted, glassier
  patches that pick up the sky. (`src/render/SnowGround.ts`)
- Pines: needle clumps, per-tree colour, snow on the branches.

**Environment and motion**
- Telegraph poles and sagging wires along the road: silhouettes against the moonlit sky.
- One upstairs room keeps a child's night light burning, a small warm lamp low down, whatever the rest of the
  house does.
- Motion everywhere: pines swaying (each with its own phase), clouds drifting over the moon, stars twinkling,
  lamps flickering, mist drifting, snow falling, dust turning in the moonbeams.

**Post-processing** (`src/render/PostFX.ts`, `src/render/NightGrade.ts`)
- Bloom thresholded so only lamps, windows, screens and the moon glow; N8AO ambient occlusion as before.
- Night grade after tone mapping: less saturation, contrast around a low pivot, cool shadows and warm highlights
  (hue shifts that keep brightness), and a minimum black level so nothing crushes to pure black.
- Vignette, film grain, and dithering on the final pass (dark gradients band without it). SMAA as before.
- Settings has **Brightness** (exposure) and a new **Gamma (shadow detail)** slider.

**Kept as it was**
- Gameplay, controls and the story's lighting cues. The dawn after the "Goodnight" ending keeps its day look
  (photographed sky, AgX, the old grade, no fog).

## Tune these first

1. `NIGHT.exposure` (`exteriorOn`, `exteriorMoon`, `interiorMoonScale`): the overall darkness per situation.
2. `NIGHT.fog.density` and `NIGHT.fog.color`: how much the distance melts away, and into what.
3. `NIGHT.moonBeam.intensity` and `shaftOpacity`: how strong the moonlight pools and shafts are indoors.
4. `NIGHT.grade.blackLevel` and `contrast`: readability of the darks against mood.
5. `NIGHT.practicals.windowPoolIntensity` and `haloIntensity`: how much light the windows lay on the snow, and how
   warmly the lamps glow.

## Performance

All of it is a handful of draw calls: the sky is one dome drawn only where nothing else is; lamps, halos, pools,
mist, snow and poles are one mesh each (the poles instanced); fog and the snow glints are a few instructions in
the existing shaders. The rooms behind the windows are no geometry at all: the window glass's shader traces them. The one real cost is the moon's shadow map indoors (the room's depth once per frame, 2048²,
1024² on Low). The **Low** preset also leaves out the mist, the light shafts and dust, and half the snowfall.
