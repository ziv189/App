# CONVICTION: Build Brief for Claude Code

> Read this entire document before you write a single line of code. It is the master brief for building CONVICTION, a 3D, third-person, cinematic noir psychological-horror game. It tells you what to build, the quality bar it has to meet, and how to work so that nothing gets cut, faked, or left half-finished.

---

## 0. For the human: how to use this brief

1. Create an empty project folder. Save this file inside it as `docs/BUILD_BRIEF.md`.
2. Download the two CONVICTION docs (the story bible, titled "CONVICTION", and "CONVICTION: Director's Script") as Word or PDF files. Save them as `docs/story_bible.docx` (or `.pdf`) and `docs/directors_script.docx` (or `.pdf`).
3. Open Claude Code in the project folder, switch to plan mode, and paste this kickoff message:

   > Read docs/BUILD_BRIEF.md in full, then the story bible and the Director's Script. Do Phase 0 only. Summarize the game back to me, list your open questions, and propose PLAN.md. Don't build anything until I approve the plan.

4. Review and approve `PLAN.md`. After that, let it work one phase at a time. After each phase, look at the screenshots in `reports/` and check `HUMAN_TASKS.md` for anything only you can do.

This project will take many sessions. That's expected. `CLAUDE.md`, `PLAN.md`, and `PROGRESS.md` exist so that every new session picks up exactly where the last one stopped.

---

## 1. Mission

You are the lead developer, technical artist, cinematographer, character artist, environment artist, and sound designer for CONVICTION. Build the complete game described in the Director's Script (every scene, every line of dialogue, every sound cue, every camera note, every gameplay beat, and every director's note) as a 3D, third-person experience that looks, sounds, and feels like a film.

### 1.1 Sources of truth

1. **`docs/directors_script`** defines *what happens*: scenes 1–42 plus 15A, 22A, 22B, and 38A (scene 42 is the secret ending), and an alternate "refusal" beat. It contains every line, camera note, sound cue, gameplay beat, and director's note. Scene numbers in this brief refer to that script.
2. **`docs/story_bible`** defines *why it happens*: the hidden timeline, the clue list, and the rules the twist depends on.
3. **This brief** defines *how to build it* and the quality bar.

If they conflict, the script wins on story content and this brief wins on technical and quality decisions. Log every conflict and how you resolved it in `DECISIONS.md`. Never change story content to make something easier to build. If you believe a story change is truly needed, ask the human first.

### 1.2 What the game is, in one paragraph

Detective Elias Ward investigates a serial killer the papers call the Night Judge. Every suspect he pins to his case board dies that night. At night he "blacks out" and plays through nightmares where he protects a murdered girl, Lily, from a faceless monster. The game is framed as Ward's account, told in an interrogation room to a voice over an intercom while he stares at the silhouette of "the killer" behind a one-way glass. In the finale, he turns off his lamp and learns the silhouette is his own reflection, the nightmares were memories of murders he committed in a dissociative fugue, every suspect the player pinned was innocent, and the one person who ever named the real killer of Lily was Lily herself, through his door, six years ago, when he told her "Not tonight." Every visual, sound, and camera rule in this brief exists to hide that truth fairly and then reveal it.

### 1.3 The bar

The target is a game players describe as "like playing a movie." Concretely:

- **Every frame could be a still from a moody, well-shot thriller.** Composed, deliberately lit, color graded, with depth and atmosphere.
- **Characters are specific people.** Readable silhouettes, believable materials, faces that hold up in close-up under hard noir lighting, performances on every line.
- **Sound carries half the horror.** Every scene has designed ambience, Foley, motifs, and designed silence. Silence is a decision, never an omission.
- **Nothing ever looks like a placeholder, a default, or a tech demo.** No gray boxes, no default materials, no stock sky, no unmotivated lights, no floating props, no clipping, no untextured surfaces, no missing sounds, no debug text.

Tone references, for *feel only* (never copy shots, characters, music, or assets from them): the rain-soaked city and controlled, patient camera of Fincher thrillers such as *Se7en* and *Zodiac*; the psychological dread and symbolic monsters of *Silent Hill 2*; the live-action-noir tension of *Alan Wake 2*; the loneliness and hard light of Edward Hopper paintings.

---

## 2. Standards: how you work

These are non-negotiable. Read them twice.

1. **Plan before you build.** Start every phase in plan mode. Write the phase's tasks, acceptance criteria, and risks into `PLAN.md` before touching files.
2. **Vertical slice first.** Build the Prologue (scenes 1–3) to final quality (final characters, lighting, grade, sound, camera, UI) before starting Chapter 1. The slice sets the bar. Nothing after it ships below it.
3. **Never cut corners. Never shrink scope silently.** If something is hard, break it into smaller tasks. If something truly can't reach the bar with the tools available, stop, explain why in `DECISIONS.md`, propose the best alternative, and ask the human. Never quietly substitute a simpler version.
4. **Evidence, not claims.** A task is done only when its acceptance criteria are met and you can show evidence: captured screenshots in `reports/`, passing lints and tests, a playthrough log. Never write "done", "complete", "final", or "polished" without evidence next to it.
5. **Look at your own work, critically, every time.** After every visual change, capture the relevant shots (Section 13.1), open them, and critique them against the shot brief and the rubric (Section 13.4). List every defect you see. Fix them. Capture again. Repeat until you can't find anything to fix. The first version that works is never the final version.
6. **No placeholders in finished work.** During work in progress, placeholders are allowed only if logged in `PLACEHOLDERS.md` with what will replace them and in which phase. A scene is not done while any placeholder in it remains.
7. **No dead code, no silent stubs.** No `TODO` in finished features. No functions that pretend to work. No commented-out blocks. No hard-coded hacks without a comment explaining why and a logged task to remove them.
8. **Commit constantly.** Small commits with clear messages, one task per commit. Tag each milestone. Use Git LFS for binary assets. Never force-push, never rewrite history, and never delete an asset without a backup. Add a git pre-commit hook that runs the fast lints (Section 13.2).
9. **Leave a trail.** At the end of every session, update `PROGRESS.md`: what you did, links to evidence, what's next, open problems. Keep `CLAUDE.md` short (under about 150 lines): only the rules and pointers every session needs, with links to this brief for detail. When your context gets long, update `PROGRESS.md` first, then compact or start a fresh session.
10. **Humans for human things.** When something needs a person (installing software, logging into a website, buying an asset, casting and recording voices, a creative sign-off), write exact step-by-step instructions in `HUMAN_TASKS.md`, keep working on everything else, and never fake the result.
11. **Licenses are sacred.** Every external asset (model, texture, HDRI, sound, font, animation, plugin, voice model) goes in `ASSET_LICENSES.md` with source URL, author, and license. Prefer CC0. Never use anything with an unclear license. Never use anything copyrighted from films, shows, or other games.
12. **Respect the performance budget (Section 3.4) at every milestone,** not just at the end.
13. **Use helpers well.** If subagents are available, use them for parallel research, asset audits, and an independent "critic" review of each milestone's screenshots against the rubric. The critic's findings go in `reports/critiques/` and become tasks.
14. **Ask when it matters.** When a decision changes how the game looks, sounds, or plays and the docs don't answer it, ask the human with two or three options and your recommendation. For everything else, decide, log it in `DECISIONS.md`, and keep going.
15. **Never mark the story's rules as optional.** The camera rules, reflection rules, light rules, and motif rules in this brief are what make the twist fair. They get automated checks, and those checks never get disabled to make a build pass.

---

## 3. Technology

### 3.1 Default stack

- **Engine: Godot 4 (latest stable 4.x), Forward+ renderer, GDScript.** Chosen because Godot's scenes and resources are plain text, the editor and exporter run from the command line, and iteration is fast. That makes it the engine you can most reliably build, inspect, and verify on your own. Check the installed version first and use the APIs that version actually has. Don't rely on memory for engine APIs that change between minor versions; read the installed docs or source when unsure. If the human prefers Unity or Unreal, stop and ask before Phase 1.
- **3D content: Blender (latest stable), driven by Python (`bpy`) scripts** kept in `tools/blender/`, so every asset can be regenerated and modified by script. If a Blender MCP server is configured, you may use it to inspect and iterate, but every final asset must be reproducible from a script or a saved `.blend` in the repo. Export glTF 2.0 (`.glb`) into Godot.
- **Human characters:** MPFB (the MakeHuman plugin for Blender) for anatomically sound base meshes and rigs, followed by custom shaping, clothing, hair cards, and texture work (Section 6.2). Verify the license of every base asset and log it.
- **Animation:** licensed motion capture retargeted to the character rigs (for example, Mixamo or other mocap libraries whose licenses allow commercial games; downloads that need an account go in `HUMAN_TASKS.md`), plus procedural layers in Godot: look-at, foot IK, hand IK for the flashlight, breathing, blinking, eye darts. `AnimationTree` state machines for gameplay; `AnimationPlayer` tracks for cutscenes.
- **Lip sync:** Rhubarb Lip Sync (or an equivalent open-source tool) to generate viseme timings from each voice line, driving facial blend shapes.
- **Materials & textures:** physically based throughout. Sources: your own Blender bakes, and CC0 libraries such as Poly Haven and ambientCG. Every material has albedo, roughness, normal, and ambient occlusion. Hero materials get wetness variants.
- **Audio:** Godot's audio buses and effects, with the bus layout in Section 8.2. Placeholder voices via a local open-source text-to-speech engine (for example, Piper, after checking each voice model's license) for timing only, until real actors record (see `HUMAN_TASKS.md`).
- **Camera:** a custom camera system in GDScript (Section 5), or a well-maintained open-source camera addon if it genuinely saves time. Check its license and compatibility with the installed Godot version first.
- **Version control:** git with Git LFS.
- **Tooling:** Python and GDScript tools in `tools/` for linting, screenshot capture, data generation, and automated playthroughs (Section 13).

### 3.2 Platform & display

- PC first (Windows; add Linux and macOS if the engine exports cleanly). Keyboard and mouse, and full gamepad support.
- Reference resolution 1920×1080. Support 16:9, 16:10, 21:9, and 4K without stretching or UI breakage.
- Gameplay is 16:9. Every cutscene and every Room scene is letterboxed to 2.39:1 with animated bars that slide in over 0.6 seconds and never pop.

### 3.3 Repository layout

```
/docs            BUILD_BRIEF.md, story_bible, directors_script, shotlists/, casting/
/game            Godot project (project.godot lives here)
  /scenes        one folder per location, plus /nightmares, /room, /cutscenes, /menus
  /characters    one folder per character: model, materials, animations, design sheet
  /props /materials /shaders /luts /audio /ui /data /systems
/tools           blender/, pipeline/, lint/, capture/, tests/
/reports         shots/, critiques/, tests/, perf/, playthroughs/
CLAUDE.md  PLAN.md  PROGRESS.md  DECISIONS.md  HUMAN_TASKS.md  PLACEHOLDERS.md
ASSET_LICENSES.md  SCENE_TRACKER.md  AUDIO_CUE_SHEET.md  CLUE_REGISTRY.md  BRANCHING.md
```

### 3.4 Performance budget

- 60 fps at 1080p on an RTX 3060-class GPU with default settings. 30 fps minimum on the lowest settings on older GPUs.
- No frame hitch longer than 50 ms during gameplay. Precompile and warm up shaders behind loading screens.
- Chapter loads under 10 seconds on an SSD.
- In Phase 0, set per-scene budgets for draw calls, triangles, texture memory, and lights. Measure at every milestone and log results in `reports/perf/`.
- Quality settings presets (Low/Medium/High/Ultra) that degrade gracefully: never remove the fog, rain, or grade entirely, because the mood is the game.

---

## 4. Art direction

### 4.1 The world

January 2011, a rain-soaked, unnamed American city: old brick walk-ups, iron fire escapes, a stone precinct house, wet asphalt, sodium streetlights, steam from street grates. Period-accurate details matter: flip phones, wall landlines with coiled cords, CRT and early flat-screen TVs side by side, beige office computers, paper case files, a microcassette recorder, a compact digital camera, payphones. Nothing that didn't exist in January 2011.

### 4.2 The three worlds

The player must know which world they're in within one second of any cut. Each world has its own lighting, grade, camera behavior, and sound.

**Day (investigation)**
- Palette: desaturated (roughly 60–70% of natural saturation). Cold blue-gray shadows, sickly sodium-orange exterior light, green-white fluorescents indoors, muddy browns and grays.
- Lighting: low-key, and every light is motivated: practicals, windows, streetlights, the flashlight. Nothing lights a scene that the player couldn't point to.
- Weather: rain in every exterior. Everything outside is wet. Breath vapor in exteriors and in Tom Marsh's freezing house.
- The flashlight is the key light in every crime scene: a tight beam with soft falloff, visible in volumetric haze, casting real shadows.

**Nightmare**
- Palette: deep blacks, a sourceless red glow (dark, blood-toned, never saturated neon), and one cool light only: the thin line of hallway light under the door behind Lily. Lily's faded green cardigan is the only other color.
- Architecture: the same room, remembered wrong. Ceilings too low. Rooms stretched toward their front door (real extended geometry combined with a dolly zoom, not just a wider lens). Walls breathing slowly (vertex shader, subtle). Heat shimmer in Hale's room, visible cold breath in Tom's, steam through the floorboards in Nadine's.
- No weather: no rain, no traffic, nothing outside. Memory doesn't record weather.

**The Room (the frame story)**
- One light: a clamp desk lamp with a cold daylight bulb (harsh, blue-white), fixed to a filing cabinet behind Ward and aimed at the glass. Everything else is black.
- The glass: a floor-to-ceiling one-way mirror, full of glare and Ward's backlit silhouette.
- The 60-cycle hum never stops until the lamp goes out in scene 39.

### 4.3 Global light rules

- **Comfortable warm white light appears only twice in the whole game:** the observation room revealed in scene 39, and the epilogue daylight of the secret ending (scene 42). This means soft, inviting, tungsten-like light (roughly 2700–3500 K). Everywhere else, light is cold, fluorescent, sodium, gray daylight, or nightmare red. Build a lint for this (Section 13.2).
- Sodium streetlight orange is allowed everywhere outdoors because it's harsh and sickly, not comforting. Keep it narrow in hue and desaturated.
- The first sun in the game appears in scene 35: pale, low, cool winter sun lying in a stripe across the floor.

### 4.4 Post-processing

Drive everything from a shared "look" resource per world, so grades stay consistent.

- Filmic tonemapping: AgX if the installed Godot version has it, otherwise the best filmic option available. Exposure tuned per scene.
- Film grain: 35 mm-style, animated, luminance-weighted (stronger in shadows). Subtle in the day world, heavier in nightmares.
- Halation: a soft red-orange bleed around bright highlights, the way film reacts to light. Subtle.
- Vignette: gentle, stronger in the Room and nightmares.
- Chromatic aberration: nightmares only, frame edges only.
- Color grading with lookup tables per world, built in-house and stored in `game/luts/`.
- Depth of field: in cutscenes and close dialogue. Use physical camera attributes (focal length, aperture, focus distance) if the installed Godot version supports them.
- Volumetric fog: light haze indoors (dust in the flashlight beam), heavy in nightmares, rain mist outdoors.
- Motion blur: subtle, camera-only, with an off switch.

### 4.5 Style frames first

Before building any location in full, produce a style frame for it: one hero shot built to final lighting, materials, and grade (with blockout geometry where needed), rendered to `reports/shots/styleframes/`. Get the look right in one frame, critique it, and get human sign-off before building the whole space. A location's style frame is its contract.

### 4.6 Materials & surfaces

- Everything has wear: grime in corners, water stains, scuffed paint, patina on brass, fingerprints on glass doors, dust on tops of frames.
- Exterior surfaces use a wetness system: darker albedo, lower roughness, puddle masks, raindrop ripples on standing water, water streaks running down windows and walls.
- Glass never reflects Ward (Section 5.5). Windows at night show the environment and rain streaks, never him.
- Fabric has visible weave at close range. Wool coats have a soft sheen and pilling. Wet fabric darkens and clings.
- All text in the world (signs, labels, newspapers, case files, headstone, evidence bags) is in-universe, specific, and legible whenever the camera needs it.

---

## 5. Cinematography

The camera is how the game lies to the player fairly and then tells the truth. Treat it like a film's director of photography would.

### 5.1 The lens kit

Model a 35 mm full-frame camera (sensor height 24 mm). Set the camera's vertical field of view from focal length with `vertical_fov = 2 × atan(12 / focal_length_mm)`.

| Lens | Vertical FOV | Use |
|---|---|---|
| 24 mm | 53.1° | Nightmares, establishing shots, dread through space, stretched rooms |
| 35 mm | 37.8° | Default gameplay and investigation |
| 50 mm | 27.0° | Dialogue, two-shots, mediums |
| 85 mm | 16.1° | Close-ups, the Room |
| 135 mm | 10.2° | Inserts and compressed telephoto dread (Ruth under the streetlight, scene 33) |

Store the lens choice per shot in cutscene data, never ad hoc.

### 5.2 Camera language

- **Dread** is a slow push-in (0.1–0.3 m/s), longer than feels comfortable.
- **The Room** is locked-off, static, nearly symmetrical. The only camera move in the Room in the entire game is the tilt-down to Ward's hands in scene 39.
- **Day** uses a subtle handheld micro-drift (low-frequency procedural noise, never shaky-cam).
- **Nightmares** feel floaty and slightly too slow, with dolly zooms when rooms stretch.
- **Doors are always framed as the threat:** centered or on a strong third, deep in the frame, the line of light under them visible whenever the story needs it.
- Hold shots longer than you think. Cut later than you think.
- Obey the 180° rule, eyelines, and screen direction. Break them only on purpose (for example, at the reveal) and log where in `DECISIONS.md`.
- Hard cuts between scenes. Fades only where the script says fade.

### 5.3 Gameplay camera

- Third-person over-the-shoulder on the 35 mm lens, at shoulder height, with Ward on the left third by default and a smooth shoulder swap.
- Smooth collision: the camera never clips through walls, doors, or characters, and pulls in with easing in tight spaces.
- **Authored camera zones** in spaces where composition matters: fixed or rail cameras that blend in and out, for example Hale's doorway (scene 5), the reveal of Tom's photo wall (scene 13), the Carlyle hallway past 4C (scene 9). Controls stay camera-relative, with direction smoothing on camera switches so input never flips unexpectedly.
- Ward never runs in daytime. Provide a walk and a slower, heavier "tired" walk used from Chapter 4 on.

### 5.4 Cutscenes

- Build a shot list for every cutscene **before** animating it: `docs/shotlists/scene_XX.md`, with numbered shots, lens, framing (ECU, CU, MCU, MS, WS, EWS), movement, focus target, duration, and the purpose of each shot.
- Implement cutscenes as data: a list of shots, each with camera transform or rail, lens, focus target and aperture, duration, character blocking (marks and animations), lines, and audio cues.
- Every cutscene is letterboxed to 2.39:1.
- Characters hit marks precisely. Eyelines connect. Nobody stares through the camera unless the script says so (Ward's mugshot in the credits does).

### 5.5 Script-mandated camera and image rules (each needs an automated check)

1. **In the Room, Ward's hands never enter the frame until the tilt-down in scene 39.** Write a test that projects both hand bones (with a safety margin for the fingers) into every Room camera for every frame of every Room sequence and fails if either lands inside the visible frame.
2. **Ward never appears in any reflection except the Room's one-way glass.** No mirrors anywhere (Ward's bathroom has four screw holes and a pale rectangle instead). No screen-space reflections in any scene where Ward can be on screen. Reflection probes exclude Ward's render layer. For wet streets and puddles, use probes or custom planar reflections (a mirrored camera rendering to a viewport with Ward's layer culled). Write a lint that fails on any mirror-like material, any probe that includes Ward's layer, and any environment with screen-space reflections enabled where Ward is present.
3. **Every morning wake-up begins with Ward face-down, one arm reaching toward the front door:** the same pose as the bodies. Build it as one shared pose asset used by Ward and by every victim.
4. **The last shot of Night 6 (scene 38) is at floor level, looking at the open door:** the same framing used for every body.
5. **The silhouette in the Room is a true planar reflection of Ward's actual animated mesh** (Section 6.5), never a separate character or animation that could drift out of sync.

### 5.6 Signature systems (build each as a reusable, parameterized system)

- **The blackout.** The camera rolls 3–5° over about 4 seconds. Audio sweeps through a low-pass filter from full range down to about 400 Hz. A dolly zoom on the front door makes it recede down an impossible hallway (extend the geometry). Three knocks. Hard cut to black. Per-chapter parameters: the chain held sharp in the foreground in Chapter 2; no knocks at all in Chapter 6.
- **Subliminal frames.** On every successful hit in a nightmare, replace the rendered image for 1/24 of a second (rounded to the nearest whole frame at the current frame rate) with a pre-rendered still of that chapter's real victim, eyes wide in a flashlight beam. Never show the same still twice in a row. Respect the photosensitivity setting (Section 9.9).
- **The one-way glass.** A physically motivated shader: reflection strength rises with the brightness on Ward's side of the glass, and transmission rises with the brightness on the far side. Turning off Ward's lamp and raising the observation-room lights must reveal the observers naturally through the shader itself, with no scripted material swap.
- **Dolly zoom** utility for stretching rooms and receding doors.
- **Rack focus** utility. Between Ward and the silhouette, always keep the silhouette slightly soft, so its posture matching Ward's is felt rather than seen.
- **Letterbox** controller (animated bars, per-sequence aspect ratio).
- **Camera impulse** system for hits and door bursts, with a global intensity setting.

### 5.7 Shot-level direction for key moments

- **Scene 1 (the Room):** open in black; the lamp clicks on behind Ward and the glare hits the glass. Frame Ward in a medium close-up from slightly off-axis so the glass and the silhouette sit soft over his shoulder. One insert: a low shot under the table catching his shoes without laces for one second.
- **Scene 13 (the mail slot):** first shot from the street, exactly as Mrs. Delaney saw it: four gray fingers poking through a brass flap in the rain. Hold it. Then cut inside.
- **Scene 17 (Tom's corridor):** a long dolly down the hundred-foot corridor of photos toward the door; later, a static wide as every photo turns on its nail to face the door.
- **Scene 27 (the holding cell):** one locked-off shot through the bars for at least ninety seconds. No cuts, no music.
- **Scene 33 (the window):** a 135 mm shot of Ruth under the streetlight, compressed and flat, rain crossing the frame. Then a reverse on Ward at the glass, but framed so the window never reflects him.
- **Scene 38 (Night 6):** the camera drops to floor level facing the open door as the shadow figures' flashlights hit the lens. White.
- **Scene 39 (the reveal):** the lamp click, total silence, a second click from the other side, warm light rising through the glass. Then the first and only tilt-down in the Room, slowly, to the cuffs and the chain through the table ring.
- **Scene 40 (six years earlier):** a static wide of the apartment from the kitchen doorway, the front door deep in the frame. Hold on the line of light under the door and the small shadow standing in it. Cut to black on the last footstep.
- **Scene 42 (secret ending walk):** one long, unbroken follow shot behind Ward through the empty streets at 3 a.m.

---

## 6. Character design

Character design is where this game will be judged hardest, and where corner-cutting shows first. Treat every principal character as if they will be seen in a full-screen close-up under one hard light, because they will.

### 6.1 Principles

- **Style: grounded, stylized realism.** Real human proportions and anatomy, with faces very slightly heightened (clear brow, cheekbone, and jaw planes) so they read under a single hard key light. Light them like portraits in a noir film, never like game characters under flat light.
- **Silhouettes:** every principal must be recognizable as a solid black silhouette at 10% of screen height. Render a silhouette lineup and check it (Section 13.2).
- **Faces:** skin with subsurface scattering, pore-level normal detail, and specular breakup (oilier nose and forehead, drier cheeks). Eyes built properly: separate cornea and iris shading, a wet line along the lower lid, a subtle specular highlight. Eyelashes and brows as cards. Teeth and tongue modeled. Stubble as a mix of texture and short cards where it's heavy.
- **Expressions:** blend shapes for visemes and a base expression set per principal (neutral, tired, grief, anger, fear, suspicion, plus signatures: Ward's dry half-smile, Walt's warm smile, Ruth's held stillness).
- **Hair:** hair cards with anti-aliased alpha edges, root-to-tip color variation, flyaways, and a wet variant (clumped, darker, glossier) for rain scenes.
- **Clothing:** separate garment meshes with real thickness, seams, stitching, wear at edges, and baked wrinkle normal maps. Secondary motion (coat hems, cardigan sleeves, loose ties) with cloth simulation baked in Blender or spring bones in the engine.
- **Wetness state:** every character who appears outdoors has a wet material state (darker, heavier fabric, clumped hair, droplets on skin and shoulders) that can blend in over time.
- **Aging and detail consistency:** scars, bruises, stubble length, and injuries follow the story's timeline (Walt's knuckles, Ruth's sling, Ward's cut knuckle in Chapter 3).
- **Dignity:** Lily is a fifteen-year-old victim. Her design is modest and age-appropriate: never sexualized, never grotesque, never distorted, never used as a jump scare. She is sympathetic in every appearance.
- **No gore:** bodies are shown with restraint: posture, the reaching hand, broken fingernails, scratches in the floor. Never wounds in detail. The horror is implication.

### 6.2 Build pipeline (every principal character)

1. **Written design** (from Section 6.3) turned into a reference board of your own renders and words. No copyrighted reference images go in the repo.
2. **Base body** in MPFB with the exact age, height, weight, and proportions specified.
3. **Face shaping** to the description: brow, nose, jaw, cheeks, ears, age lines, asymmetry (real faces are asymmetrical), scars.
4. **Topology, UVs, and bakes:** check deformation loops at the eyes, mouth, shoulders, elbows, hips, and knees. Bake albedo, normal, roughness, ambient occlusion, and a subsurface mask.
5. **Clothing, hair, and accessories** built as separate assets.
6. **Rig check:** body skeleton and facial blend shapes. Fix weight painting at shoulders, elbows, hips, knees, and neck. Test extreme poses (arms raised shielding the face, crouching, lying face-down reaching).
7. **Lighting tests:** render every principal's face under three setups: the noir key (one hard light at about 45° above and to the side), the flashlight (a hard beam from below the eye line), and nightmare red.
8. **Design sheet:** `game/characters/<name>/design_sheet.png` with front, side, and back turnarounds; face close-ups in the three lighting setups; the expression set; a costume breakdown; and material swatches. Also render a height lineup of all principals.
9. **Human sign-off** on each design sheet (via `HUMAN_TASKS.md`) before animating that character.
10. **Animation set** (Section 6.7).

### 6.3 The principal cast

**Elias Ward**, the protagonist
- 54 years old. 6'1" (185 cm). Lean with heavy shoulders and a slight forward stoop from decades bent over desks and bodies.
- Face: long and lined, hollow cheeks, heavy-lidded gray eyes with red rims, three-day stubble going gray, short graying hair he cuts himself, a thin old scar through the outer end of his left eyebrow. The face of a man who hasn't slept properly in a year and hasn't noticed.
- Wardrobe: a knee-length charcoal wool overcoat, worn shiny at the cuffs, one button missing, hem darker when damp; a dark gray suit a size too big (he's lost weight); a white shirt with a frayed collar; a loosened dark tie; scuffed black oxfords; a cheap steel wristwatch; his badge in a worn leather wallet; a flip phone. The flashlight lives in his coat pocket (Section 6.8).
- Variants: (a) day; (b) wet; (c) the Room: shirtsleeves, no tie, no belt, shoes with no laces, cuffed to the table (hands hidden until scene 39); (d) holding cell morning: the same clothes, but a rested, almost younger face; (e) six years earlier (scene 40): darker hair, a fuller face, the same coat when it was newer; (f) the booking mugshot still for the credits: no tie, red eyes, looking straight into the lens.
- Movement: economical, deliberate, tired. Never hurried. Hands in coat pockets when walking. Paces while talking through cases at the board. Sits heavily. When he's certain, he goes very still.
- Voice: low baritone, dry, understated. His narration is noir in rhythm but never theatrical.

**Ruth Adler**, his partner
- 32. 5'6" (168 cm). Slim and athletic, very upright posture.
- Face: sharp and intelligent, straight dark brows, alert brown eyes, little or no makeup, a mouth that stays neutral while her eyes do the work.
- Hair: dark brown, pinned back tightly. From Chapter 3 on, one strand keeps escaping; by Chapter 5 she's stopped fixing it.
- Wardrobe: a mid-thigh gray wool coat, navy trousers, low boots, a navy sweater or plain white blouse. Carries a notebook, a compact digital camera, and a microcassette recorder.
- Variants: wet (scene 33: soaked, no umbrella, under the streetlight); finale (scene 39): left arm in a navy sling, a bruise along the left cheekbone, exhausted but not afraid.
- Movement: precise and economical. She watches before she speaks. When she writes in her notebook, she doesn't look down.
- Voice: controlled and low. Exactly one crack in the whole game, on "Go on" in Interlude 2 (scene 24), heard only through the processed intercom.

**Walt Doyle**, the super
- 62. 5'9" (175 cm). Soft-bodied but with strong forearms and big hands, slightly stooped.
- Face: kind and crinkled, ruddy cheeks, bright pale-blue eyes, thinning white hair combed neatly, reading glasses on a cord around his neck.
- Wardrobe: a brown cardigan with leather elbow patches, a plaid flannel shirt, work trousers, a leather tool belt. Two paper cups of coffee every morning.
- Continuity detail: bruised right knuckles, fresh purple in the Prologue, fading through blue-green to yellow by Chapter 6 (a texture progression per chapter).
- Signature animations: the coffee handoff; tapping the radiator three times with his wrench; the light two-finger touch on the frame of 4C's door as he passes, without looking at it; the wink.
- **Critical:** Walt must read as the kindest person in the game. No sinister cues in his design, lighting, music, framing, or performance. None. The final reveal depends entirely on players loving him.
- Voice: warm, folksy, gentle, unhurried.

**Lily Marsh**, the girl
- 15. Appears in the nightmares, as one subliminal frame in the cemetery (scene 7), in the framed photo, in her pencil sketch, and as a voice in scene 40.
- Slight and small for her age, pale, freckled, with long straight light-brown hair that falls across half her face in the nightmares.
- Wardrobe: a faded green cardigan too big for her, a plain T-shirt, jeans, worn sneakers.
- In nightmares: she stands with her back to the door, lit from behind by the line of light under it, her face half in shadow. Her lips move in sync with the reversed whisper track (Section 8.3). She never moves toward the player and never touches anything.
- Photo variant: laughing on the Carlyle's front stairs in the green cardigan, full of life.
- See the dignity rule in 6.1. She is never scary. The fear in her scenes comes from what surrounds her.

**Captain Brennan**
- 61. 5'11" (180 cm). Heavy and barrel-chested.
- Face: jowly, gray crew cut, a broken-veined nose, tired pouched eyes, reading glasses he takes off to make a point.
- Wardrobe: a rumpled white shirt with rolled sleeves, a loosened striped tie, suspenders, gray trousers. A gray felt hat that he holds in both hands in the finale.
- Movement: heavy. Sits hard. Rubs his face with both hands when the news is bad.
- Voice: gravel. Loyal to Ward, and afraid of what Ward's record is holding up.

### 6.4 Supporting cast

Build each to the same pipeline, scaled to screen time. Every one of them should be a specific person, not a generic NPC.

- **Victor Hale** (56): thin, narrow-shouldered, stooped, balding, pale, a wary, tired face. Seen as a body (T-shirt, one slipper) and alive in the credits replay (flat, resigned: "I wondered when").
- **Tom Marsh** (58): big and broad, a heavy drinker, red-rimmed eyes, stubble, soaked coat, scraped raw knuckles. Carries a closed umbrella he doesn't use and a bottle he does.
- **Nadine Hale** (45): tall and lean, sharp features, dark hair in a practical bun, tired and furious. Teal scrubs with an "N. HALE, RN" badge; a bathrobe on the night she dies.
- **Dennis Pryce** (40): wiry, jittery, unshaven, hollow-eyed. A hooded sweatshirt and a long black leather coat.
- **Dr. Ames**, medical examiner (60s): bow tie, reading glasses, rubber gloves, calm as a man who has seen everything twice.
- **Mr. Fenn**, landlord of the Meridian (60s): suspenders, a huge ring of keys on his belt, a mop.
- **Mrs. Delaney**, Tom's neighbor (70s): housecoat, rain boots, arms wrapped around herself.
- **Mrs. Ocampo**, laundromat owner (70s): cardigan, reading glasses, a basket of folded sheets she forgets she's holding.
- **Officer Bell** (20s): patrol uniform, pale and shaken.
- **Desk Sergeant** (40s): halfway through a crossword.
- **Guard**, holding cells (30s): baton, bored.
- **Dr. Reyes**, psychiatrist (50s): gray-streaked hair, cardigan, notepad on her knee, a calm, low voice.
- **Edward Kowalski** (booking footage only): staggering drunk.
- **TV reporter**: seen on the precinct TV, in the rain outside the precinct.
- **Gus Pell** (60s, alternate suspect, Chapter 1) and **Ray Kostic** (40s, alternate suspect, Chapter 2): design them fully, because the player can pin them (Section 9.4 and `BRANCHING.md`).

### 6.5 The silhouette (Ward's reflection)

The "killer" behind the glass in the Room is Ward's own reflection. Build it as a true planar reflection of Ward's real animated mesh on the one-way glass, darkened by physics: the lamp is behind Ward, so his reflection is backlit and reads as a faceless silhouette. It must move exactly when and how Ward moves, because it is Ward. Frame it soft-focus in the background so players feel the mirroring without consciously seeing it. It disappears when the lamp goes out in scene 39 because the glass stops reflecting (Section 5.6), not because a script hides it.

### 6.6 The monsters

The monsters are how Ward's mind renders his victims. Their design and behavior must map exactly to what each real victim did in their last minutes.

**Shared base**
- Taller than a man even when stooped. Arms hanging to the knees.
- No face: a smooth, dented, featureless blank where a face should be.
- Wrapped in wet gray fabric that clings where a body should be: simulated cloth, baked, with wet specular and drips.
- Movement animated "on twos" with random single-frame holds and occasional skipped frames, so it moves like film with missing frames.
- **Signature reaction:** when the flashlight hits it, it throws both hands over its blank face and staggers back, exactly the way a person shields their eyes from a flashlight shone in their face.
- It never attacks Lily. It fights like something cornered, never like something hunting. It only strikes the player when the player blocks its path to the door.

**Variants**
- **Hale's (Night 1, scene 10):** tall and stooped, wrapped in wet bedsheets. Lunges toward the door in bursts. In phase two it drops to all fours and crawls toward the door by its fingertips, scratching the floorboards.
- **Tom's (Night 2, scene 17):** broad and heavy, its wrappings hanging like an old coat, a lurching, drunk gait. Turns its back to the light and keeps pushing. Pulls frames off the walls and throws them. Forces its fingers through the mail slot.
- **Nadine's (Night 3, scene 23):** narrow, fast, all angles, its wrappings like a wet robe. Hides between the hanging sheets and freezes when the beam sweeps near. Works frantically at the deadbolt.
- **Ruth's (Night 6, scene 38):** human-sized, upright, balanced, hands raised like a boxer's. Blocks the beam with a forearm instead of cowering. Fights back hard. Never retreats toward the door. It's the only monster guarding something.
- **Shadow figures (Night 6):** tall, faceless silhouettes, many of them, each carrying its own flashlight. Suggestions of police caps and shoulder radios in their outlines.

Write the victim-to-monster mapping in `game/characters/monsters/mapping.md` (for example: "shields face from beam" = the victim blinded by Ward's flashlight at the door; "reaches the door" = the victim trying to escape; "throws objects" = the victim defending themselves) and follow it for every animation.

### 6.7 Animation and performance

- **Ward:** tired idle; two walk speeds (never a run in daytime); turn-in-place; stairs; examine (crouch, lean in, pick up, turn over); flashlight aim; board interactions (pinning, tying string, stepping back to look); phone calls (wall phone and flip phone); drinking; sitting into and rising from the armchair; the blackout slump; the reaching wake-up pose; pacing while thinking out loud; cuffed seated idle; the pointing gesture in scene 39; nightmare combat (beam hold, strike, dodge, drag-back, hit reactions, the Night 6 knockdown).
- **Walt:** coffee handoff, radiator tapping, the 4C doorframe touch, the wink, the long look (scene 35).
- **Ruth:** notebook writing, photographing the board, setting down badge and gun, the sling idle, sitting across the table.
- **Brennan:** sitting heavily, glasses off, rubbing his face.
- **Supporting cast:** conversation idles and gestures that fit each character; Tom's drunk sway; Nadine's crossed arms; Pryce's constant fidgeting.
- **Facial performance for every spoken line:** visemes from lip sync, plus hand-tuned expression curves, blinks, eye darts, and breathing. Nobody talks with a frozen face.
- **Timing:** let performances breathe. Pauses in the script (every "beat") are real pauses in the animation.

### 6.8 Hero props

Model and texture these to close-up quality. Several of them are clues.

- **The flashlight:** long, black anodized metal, knurled grip, a heavy lens bezel. Five states: pristine, one dent, two dents, three dents, three dents plus a scratched lens. It's the investigation light and the nightmare weapon. Its beam is a physically plausible cone with a hot center and soft falloff.
- **The envelope:** manila, with a typed label ("STATE CRIME LABORATORY, COLD CASE UNIT. Det. Elias Ward.") and a JAN 13 postmark legible in close-up. The letter inside, on state letterhead, exactly as written in scene 39.
- **Lily's sketch:** pencil on cream paper: Ward asleep on the building's front stairs, a newspaper over his chest, signed "L.M." A fresher, whiter version for scene 40.
- **The case board:** cork, push pins, index cards, photos, and red string with rope physics.
- **The framed photo of Lily on the Carlyle stairs,** with a cracked corner in scene 39.
- **Evidence bags:** brown paper, handwritten labels in Ward's hand. Create one consistent handwriting (a handwriting texture set or a licensed handwriting font) and use it everywhere Ward writes, including his old case notes.
- **The transmitter:** matchbox-sized, black, with a "PROPERTY OF METRO P.D. — TECHNICAL SERVICES" sticker.
- **Period tech:** the microcassette recorder, Ruth's compact camera, Ward's flip phone, the wall phone with a coiled cord, the payphone at Hollis & Ninth, the precinct TV and monitors.
- **The clocks:** nightmare wall clocks with a second hand that ticks forward and snaps back; the holding-cell corridor clock in a wire cage.
- **Victims' items:** Hale's cheap wristwatch, Nadine's "N. HALE, RN" badge, Tom's bottle, Pryce's leather coat.
- **Lily's headstone:** "LILY ROSE MARSH, 1990–2005, OUR GIRL."
- **The newspaper:** a fictional masthead, with the front page "THE NIGHT JUDGE" and its subhead exactly as in scene 20.

---

## 7. World design

Every space must tell the player who lives there and what happened there. Nothing generic, nothing repeated within a single shot. Build modular kits (walls, floors, trims, doors, windows, radiators) in Blender for consistency, and make every hero prop bespoke.

For each location below: build a style frame first (Section 4.5), then the full space, then its nightmare version if it has one.

### 7.1 The Room and the observation room

- **The Room:** about 4 × 5 m. Painted cinderblock in a dark green-gray, acoustic ceiling tiles, a floor drain. A steel table bolted to the floor with a steel cuff ring welded to its top. Two chairs. A gray filing cabinet behind Ward with a clamp lamp aimed at the glass. A ceiling speaker grille. A steel door behind Ward with no handle on the inside.
- **The glass:** a floor-to-ceiling one-way mirror, the only reflective surface in the game.
- **The observation room (seen only in scene 39):** narrow, carpeted, a desk with a microphone on a stand and a cassette recorder with turning reels, three chairs, a table lamp and overhead tungsten light. The only warm interior light in the game.
- **Sound:** the 60-cycle hum and nothing else, until scene 39.

### 7.2 The Carlyle

- **Exterior:** a five-story brick walk-up from around 1920, iron fire escapes, stone front stairs (the stairs in Lily's sketch and photo), a buzzing entry light, a streetlight across the street (where Ruth stands in scene 33).
- **Stairwell:** worn marble treads with dips in the middle, an iron banister, peeling paint, a window at each landing streaked with rain.
- **Fourth-floor hallway:** long and narrow, a patterned carpet runner worn through in a path, cast-iron radiators, one bulb flickering at the far end, doors 4A–4F. **4C** has a pale rectangle of old glue where police tape sealed it six years ago and a dark peephole. **4F**, Ward's, is at the end.
- **Apartment 4F layout:**
  - Front door with a chain and deadbolt, opening into the living room. Shoes by the door. A coat hook.
  - An armchair facing the front door, a side table with a glass and a bottle.
  - A desk with a lamp (cold bulb) and the envelope at the edge of the lamplight.
  - A window with a roller blind, facing the street and the streetlight.
  - A wall phone with a coiled cord.
  - The case board wall (from Chapter 2) beside the window.
  - A smoke detector on the ceiling (the transmitter hides inside it).
  - Kitchen: an old fridge with Lily's sketch taped at eye level, a counter, a trash can (evidence bag in Chapter 3).
  - Bathroom: a sink, a towel, and, above the sink, four screw holes and a pale rectangle of paint where a mirror used to hang.
  - Bedroom (first seen in scene 31): a narrow bed, a crucifix, a dresser with a stack of unopened mail.
- **Morning states:** one data-driven table controls what's wrong each morning (Section 9.6).
- **Six years earlier (scene 40):** the same apartment, cleaner, fewer bottles, a small TV playing a ballgame, the sketch fresh and white.

### 7.3 19 Calder Street and Hale's room

- **Exterior:** a three-story rooming house with peeling green paint, an awning, and the ghost of "CHILD KILLER" spray paint on the ground-floor door, scrubbed more than once and still legible (a decal with partial removal and cleaner streaks).
- **Hale's room:** a single room about 3.5 × 5 m. The radiator hissing at maximum, heat shimmer, condensation running down the windows (animated shader). A bed. A desk with the block-capital letters ("I KNOW WHAT YOU DID TO MY GIRL", signed T.M.) and the harassment complaint. Three frost-killed plants on the windowsill: black, limp, curled leaves. Hale's body face-down just inside the door, one arm reaching toward it, broken fingernails, fresh scratches in the floorboards. One slipper.
- **Nightmare version (scene 10):** the ceiling a foot lower, the room stretched to three times its length toward the door, the radiator glowing orange like a stove element, windows fogged solid, the three plants **green and alive**, a wall clock at 3:40 with a stuck second hand, Lily at the door, the line of light.

### 7.4 The precinct

- **Exterior:** stone, early 1900s, wide steps, patrol cars, rain.
- **Homicide squad room (third floor):** tall rain-streaked windows, knocking radiators, crowded desks, beige computers, paper files, the cork board by the window, a TV on a high shelf, a coffee machine, a water cooler.
- **Brennan's office:** glass walls with half-closed blinds, a cluttered desk, a monitor showing the booking-desk footage. Build the footage as a real in-game video: grainy, timestamped 23:02 (Ward signing in Edward Kowalski) and 00:10 (Ward leaving).
- **Holding cells:** concrete, a steel bench, bars, a caged bulb in the corridor, a slow drip, a corridor clock in a wire cage.
- **Front desk:** harsh fluorescents, scratched bulletproof glass, a desk sergeant's crossword.

### 7.5 St. Brigid's Cemetery

Dusk and rain. Bare black trees, rows of weathered stones, a wrought-iron fence, puddles, low mist. Lily's small stone: "LILY ROSE MARSH, 1990–2005, OUR GIRL." Far back between the trees, the spot where Lily stands for one frame.

### 7.6 Tom Marsh's row house

- **Street:** a narrow brick row house across the river. The brass mail slot at hip height, seen from the sidewalk in the rain with four gray fingers poking through it (scene 13's first shot).
- **Front hall:** barely wide enough for one person.
- **Living room:** a whole wall of about a hundred framed photos of Lily at different ages (build young, middle, and fifteen-year-old variants of Lily for the photos, all in modest, everyday clothes). At eye level in the middle: an empty nail and a clean rectangle on the faded wallpaper. A bottle and a single glass on the kitchen table. So cold that breath is visible.
- **Nightmare version (scene 17):** the hall becomes a corridor about a hundred feet long, lined floor to ceiling with photos of Lily. The framed photo of Lily on the Carlyle stairs hangs on the nail. Midway through the fight, every photo turns on its nail to face the front door. A clock at 3:12.

### 7.7 Nadine's apartment and the laundromat

- **Laundromat:** a 24-hour laundromat with harsh fluorescents, rows of big industrial dryers thumping, folding tables, Mrs. Ocampo.
- **Apartment upstairs:** reached by a narrow staircase. Small and very clean. Steam fogging the windows. Photos of Victor as a gap-toothed boy holding a fish. Teal scrubs over a kitchen chair with the "N. HALE, RN" badge (empty clip after the murder). A shoebox of Pryce's letters and the restraining order in the closet. A small face drawn with a finger in the window fog days ago, half faded. The deadbolt, with Nadine's fingers hooked on it.
- **Nightmare version (scene 23):** the floor beats like a heart (camera and props thump on the beat), steam rises between the floorboards, dozens of white sheets hang on lines to form a shifting maze, a clock turns slowly on a clothespin at 3:26, and Lily knocks on the door from the inside.

### 7.8 The Meridian

- **Building:** a tired twelve-story building, flickering hallway lights, wet carpet, the smell of damp you can almost see.
- **Apartment 6D:** cramped. A mattress, a TV playing the news, a long leather coat on a hook by the door, a tall window onto an old iron fire escape with every rung glazed in ice (an ice shader that catches gray light), the alley six stories down.
- **After the fall (scene 30):** drawers dumped, a half-packed suitcase on the mattress, the TV looping the "detective detained" story, the empty coat hook, one of Pryce's shoes frozen to the first iron landing, a yellow tarp in the alley.
- **Basement:** a boiler the size of a truck, breathing and ticking; pipes along the ceiling; a narrow steel door to the back stairwell.
- **Nightmare version (scene 32):** the basement bigger and darker, a single bare bulb swinging slowly with no draft, pipes knocking three times, a clock at 3:05, Lily at the stairwell door. No monster. No UI.

### 7.9 Ruth's apartment (nightmare only, scene 38)

Small and neat: bookshelves, a reading chair, a kettle, plants green and alive. On one wall, her own cork board: Ward's photo in the center, red strings to every victim. A kitchen clock at 3:03.

### 7.10 The city

Streets for transitions and the secret-ending walk. Wet asphalt reflecting sodium light (the environment only, never Ward). Steam from grates. Traffic lights changing for no one at 3 a.m. Distant sirens. The payphone at the corner of Hollis and Ninth under a streetlight, rain hammering its metal hood.

### 7.11 Title screen and menus

The title screen: a rain-streaked window at night looking across the street at the Carlyle, one fourth-floor window lit. The hum, faint, under the rain. The title in a restrained serif. Menus styled like the pages of a case file.

### 7.12 Set-dressing rules

- No prop repeats visibly within a single shot.
- Clutter has logic: what's on Ward's desk is what a drinking, sleepless detective would leave there.
- Every story prop and clue from `CLUE_REGISTRY.md` is placed, lit, and framed so a careful player can find it on a first playthrough without the game ever pointing at it.

---

## 8. Sound design

Sound is half the horror in this game. Doors, knocks, and silence are the instruments.

### 8.1 Principles

- Every scene gets an ambience bed, full Foley, its motif cues, and designed silence.
- Every sound cue in the script is implemented exactly as written: timing, source, and feel.
- When the script calls for silence, it means true silence, not a quiet room tone.

### 8.2 Bus layout

Master, feeding from Dialogue, Music, SFX, Ambience, and UI, with sends to per-room reverb buses (small apartment, long hallway, stairwell, squad room, cemetery, basement, the Room). Dialogue ducks music and ambience slightly (sidechain). **Occlusion:** sounds behind a closed door are low-passed and quieter. This gets used constantly: knocks from the hallway, footsteps outside 4F, the TV through walls.

### 8.3 Motifs

Each motif is exactly one asset, reused everywhere, never duplicated or approximated.

- **The three knocks.** Knuckles on wood, soft, evenly spaced about 600 ms apart, like someone trying not to wake the building. Material variants (radiator iron, pipe, dryer drum) keep the identical rhythm and spacing.
- **The pin thunk.** Heavy, too loud for the room, with a short low-end tail. A faint version plays under every phone call that announces a death.
- **The hum.** 60 Hz plus harmonics at 120 and 180 Hz, with a faint flicker. It plays in the Room and, at a barely audible level, under every nightmare.
- **The clock.** A tick followed by a softer back-tick as the second hand snaps back.
- **The monster roar.** Built from a human voice saying "please" (and sobbing, for Night 2), pitched down two octaves, time-stretched, and distorted. It must be reversible: pitching it back up reveals the word "please."
- **Lily's whisper.** Her line from scene 40, played in reverse, low in the mix. As the nights progress, fade in the unreversed fragments exactly as the script specifies ("Mr. Ward", "please", "it's"). Never the name, until scene 40.
- **The handcuffs.** Two metallic ratchets, used off-screen in scene 26, in the white at the end of scene 38, and seen for the first time in scene 39.
- **The line of light.** A faint, high air tone whenever the line of light under a door is on screen.
- **The flashlight click.** One specific, satisfying mechanical click, used every time.

### 8.4 Ambience beds

- **The Carlyle, 4F:** rain on the window, radiator ticks, distant traffic, pipes settling, the hallway bulb buzzing through the door.
- **Hale's room:** radiator hiss and clank, the thick heat (low, pressurized air tone), rain outside.
- **The precinct:** phones, keyboards, radiators knocking, distant radio chatter, the TV murmur.
- **St. Brigid's:** rain on stone and leaves, wind in bare branches, distant traffic.
- **Tom's house:** cold wind whistling at the mail slot, a fridge hum.
- **Nadine's apartment:** the dryers thumping below, like a heartbeat.
- **The Meridian:** fluorescent buzz, TVs through walls, wind at the fire escape; in the basement, the boiler breathing.
- **Holding cell:** the drip, the caged bulb's hum, far-off doors. Nothing else.
- **Nightmares:** no weather at all; the room's own sounds, exaggerated and slowed; the hum underneath.
- **The Room:** the hum only.

### 8.5 Foley

Footsteps per surface (wet asphalt, marble stairs, carpet runner, wood floors, tile, concrete, iron fire escape) and per character's weight; coat rustle and wet coat rustle; the door chain; keys; paper and envelopes; pins and string; the flashlight; glass and bottles; rain on shoulders and umbrellas.

### 8.6 Music

Sparse. Low strings, felt piano, bowed metal, drones.

- No music during daytime investigation except rare stingers.
- Nightmare victory strings: Night 1, a full, warm, almost heroic swell. Night 2, softer and uncertain. Night 3, two notes and then it cuts out.
- No music at all in the holding cell (scene 27), the basement (scene 32), or the Room after the lamp goes out (scene 39).
- The secret ending: a single held piano note.
- All music is original or CC0. A composer may replace it later (add this to `HUMAN_TASKS.md`).

### 8.7 Voice

- Write a casting brief per character in `docs/casting/` (age, voice quality, references in words only, sample lines).
- Generate recording scripts ("sides") per actor from the Director's Script, with context and every parenthetical.
- Placeholder text-to-speech is for timing only and must be replaced by human performances before release.
- **The intercom voice:** band-pass filter at roughly 300 Hz–3.4 kHz, light saturation, crackle, and a slight pitch-down so players can't tell whose voice it is. In scene 39 Ruth's voice arrives clean for the first time. The contrast should hit like a slap.
- Lip sync comes from the final recordings.

### 8.8 Mix

Dialogue always intelligible. Horror lives in dynamic range, so quiet scenes stay quiet. Keep loudness consistent from scene to scene. Test on headphones and speakers. Offer a "night mode" option that reduces dynamic range.

### 8.9 Audio cue sheet

Generate `AUDIO_CUE_SHEET.md` from the script: every sound cue (every SOUND line, knock, thunk, phone ring, hum, drip, siren, and music note) with its scene, trigger, asset, bus, and status. A lint check confirms every cue exists and fires.

---

## 9. Gameplay systems

### 9.1 Player controller

Third-person. Walk only in daytime, plus the slower tired walk from Chapter 4. Interaction raycast with a small, unobtrusive prompt. Flashlight aim on hold. Crouch-to-examine.

### 9.2 Investigation

- Every examinable object in the script uses Ward's voice-over line exactly as written.
- Every clue is registered in `CLUE_REGISTRY.md`: the scene, the object, how it looks or sounds, the line, and which reveal it pays off. A lint confirms every clue exists in its scene.
- Interviews play as scripted scenes. The script's lines are the performance; don't add dialogue options that aren't in the script.

### 9.3 The envelope

Every interaction with it shows the prompt *Not tonight*, even in the morning, until scene 39, where the prompt finally says OPEN. In the secret ending it shows no prompt at all; Ward simply puts it in his pocket.

### 9.4 The Board

- A diegetic interface on the cork board: drag photos, index cards, and evidence; tie red string with rope physics; push pins with the thunk.
- Motive, Opportunity, and Means fill in as evidence is attached under each suspect.
- **PIN SUSPECT is the core rule: whoever is pinned dies that night.**
- Suspects per chapter, from the script: Chapter 1, Tom Marsh or Gus Pell. Chapter 2, Nadine Hale or Ray Kostic. Chapter 3, Dennis Pryce. Chapter 6, Ruth Adler, Mr. Fenn, or Officer Bell.
- Chapter 5's board has pinning disabled, with Ward's line "Not until I know who's listening."
- **Refusal beat:** leaving the board without pinning, or waiting 60 seconds, triggers the script's alternate beat.
- **Secret ending:** Ward's police ID in the inventory can be pinned on any night. That triggers scene 42.
- Build crime scenes as modular kits so that alternate victims get real scenes, not text swaps. See Section 11 before building any alternate.

### 9.5 Nightmare combat

- Controls: LIGHT (hold), STRIKE, DODGE. A PROTECT HER bar that drains whenever the monster reaches the door. The drag-back move to pull it away from the door.
- Monster AI: its goal is to reach the door. It flees the light, throws nearby objects, never targets Lily, and attacks the player only when cornered or blocked. Night 1 has a crawl phase. Night 3 is hide-and-seek through the sheets. Night 6 fights back.
- Night 6: when the player's health reaches zero, the screen cracks like glass and the fight continues. The door-burst sequence triggers at the midpoint. There is no retry and no game over.
- Feel: heavy, deliberate hits with 2–3 frames of hit-stop, camera impulses, and the subliminal frames.
- Difficulty: a Story setting in which the PROTECT HER bar drains more slowly. These fights are about feeling, not skill.

### 9.6 Morning states

A data table per chapter morning: which wrong details are present (loose chain, damp coat, muddy shoes, cut knuckle, evidence bag in the trash, rust smear on the cuff) and the flashlight's dent state. Chapter 6's morning has nothing wrong at all. Walt's knuckle bruise state is driven from the same table.

### 9.7 The Room

Non-interactive cinematic dialogue, except for the two prompts in scene 39: TURN OFF THE LAMP and OPEN. No HUD. The silhouette reflection, the camera rules, and the one-way glass shader do all the work.

### 9.8 Saves and chapters

Autosave at every chapter start and after each board decision. Chapter select unlocks after completion. The credits' string sequence and replays reflect the player's actual pins from their save data.

### 9.9 Accessibility and comfort

- Subtitles on by default, with size, background, speaker names, and sound captions.
- **Photosensitivity mode,** which disables the subliminal frames and all hard flashes (including Ruth's camera flash and the Night 6 flashlight burst) and replaces them with a gentle desaturation pulse. Show this option on first launch.
- Camera shake and roll reduction, a motion blur toggle, remappable controls, and full gamepad support.
- Never rely on color alone for important information (the PROTECT HER state also uses shape and sound).
- A content note on the title screen: violence, death, psychological horror.

### 9.10 UI and typography

Minimal and diegetic wherever possible. Fonts: an understated serif for titles and the lab letter, a clean sans for subtitles, a typewriter face for documents, all with licenses that allow games (for example, the SIL Open Font License). The PROTECT HER bar is thin, small, white, and bottom-center, and it's the only HUD element in nightmares. There's no UI in the Room except the two finale prompts.

---

## 10. Narrative data

- **Convert the docs to Markdown** in Phase 0 (`docs/story_bible.md`, `docs/directors_script.md`). Verify nothing was lost: compare word counts, check that every scene heading (1–42, plus 15A, 22A, 22B, 38A, and the alternate beat) is present, and spot-check dialogue.
- **Structured dialogue data:** convert every spoken line into `game/data/dialogue/` (one file per scene): scene ID, speaker, the exact line, parenthetical, delivery notes, voice file, subtitle timing, lip-sync file.
- **Script-to-data pipeline:** write `tools/pipeline/script_to_data` to generate that data from the Markdown script, then `tools/lint/dialogue_coverage` to fail the build if any spoken line is missing, altered, reordered, or assigned to the wrong speaker. Every word ships exactly as written.
- **Scene tracker:** generate `SCENE_TRACKER.md` from the script, one row per scene: location, characters, shot list status, audio status, gameplay beats, clues, and a Definition of Done checklist (Section 12.2).
- **Clue registry:** build `CLUE_REGISTRY.md` from the story bible's clue list and the script. For each clue: where it appears, how it looks or sounds, the exact line if any, and the reveal it pays off.

---

## 11. Known story and design gaps (resolve these with the human before building them)

The main path (the one the script follows) is fully defined. Some branches are not. Build the main path first. Before building any alternate, write `BRANCHING.md`, which maps every possible pin through every downstream scene, clue, and the finale, and get the human's decision on each gap below.

1. **Chapter 6 alternates (Mr. Fenn, Officer Bell).** Scene 35 lists them on the board, but the script never says what happens if one is pinned, and Ruth's trap only works if Ward pins her. Options: (a) Fenn and Bell appear as suspects Ward considers and rules out in his own notes, and Ruth is the only pinnable card; (b) write an alternate in which Ruth predicted the choice and set her trap at that suspect's home; (c) the pinned suspect dies and the story takes a longer path to the same finale. Recommend one and ask.
2. **Chapter 1 alternate (Gus Pell).** If Pell is pinned, Tom Marsh lives, but the finale depends on Tom's death: the framed photo of Lily taken from Tom's wall, and Nadine's suspicion of Tom, which drives Chapter 2. Map the consequences and propose how the story reconverges. Ask.
3. **Chapter 2 alternate (Ray Kostic).** If Kostic is pinned, Nadine lives, but Chapter 3 depends on her death: Pryce's letters, Mrs. Ocampo's witness statement, and the Night Judge headline. Same analysis. Ask.
4. **Chapter 3 has a single suspect (Pryce).** Decide with the human whether Pryce is the only pinnable card that chapter or whether a new alternate should be written.
5. **The refusal beat** kills "the chapter's strongest suspect." Define exactly how "strongest" is computed and confirm that every chapter's downstream story still works when it fires.

Never invent story content to fill these gaps without approval.

---

## 12. Milestones

### 12.1 Phases

**Phase 0: Setup and plan (no game code).**
Convert the docs to Markdown and verify them. Check and record the installed versions of Godot, Blender, git, and Git LFS (add missing installs to `HUMAN_TASKS.md`). Create the repository structure and every tracking file listed in Section 3.3. Write a short `CLAUDE.md` with the non-negotiable rules and pointers to this brief. Write `PLAN.md` covering every phase with tasks, acceptance criteria, estimates, and risks. List your open questions, including every gap in Section 11. **Exit:** the human approves `PLAN.md`.

**Phase 1: Tools and pipeline.**
Blender generation scripts and the glTF import pipeline; Godot project settings; the look stack (tonemapping, grain, halation, LUTs, fog); the lens system; the letterbox; the blackout system; the shot capture tool; the lint suite; the playthrough harness. **Exit:** a test scene goes through the entire pipeline, captures cleanly, and passes every lint.

**Phase 2: Style frames and character sign-off.**
A style frame for every location (Section 4.5). Design sheets for Ward, Ruth, Walt, Lily, and Brennan, and the monster base. **Exit:** the human signs off on every style frame and design sheet.

**Phase 3: Vertical slice, the Prologue (scenes 1–3).**
Final quality in every discipline: the Room (the silhouette reflection, the one-way glass shader, the hands rule), the cold-open nightmare (the monster, Lily, the combat tutorial, the subliminal frames), and the morning in 4F (exploration, the envelope, the sketch, the bathroom, the flashlight, Walt). **Exit:** a full captured playthrough, every lint passing, a clean critic review, and human sign-off. This slice defines the bar for the rest of the game.

**Phase 4:** Chapter 1, Night 1, and Interlude 1 (scenes 4–11).
**Phase 5:** Chapter 2 and Night 2 (scenes 12–17, including 15A).
**Phase 6:** Chapter 3, Night 3, and Interlude 2 (scenes 18–24, including 22A and 22B).
**Phase 7:** Chapter 4 (scenes 25–28).
**Phase 8:** Chapter 5, Night 5, and Interlude 3 (scenes 29–34).
**Phase 9:** Chapter 6, Night 6, the Finale, and the Credits (scenes 35–41, including 38A).
**Phase 10:** The secret ending (scene 42), the refusal beat, and the branching alternates approved in `BRANCHING.md`.
**Phase 11: Polish.** Lighting, grade, camera, animation, facial performance, audio mix, performance, accessibility, text and localization readiness, and bug fixing, followed by at least three full playthroughs start to finish (one main path, one with the refusal beat, one secret ending).
**Phase 12: Release build.** Export, a credits and licenses screen generated from `ASSET_LICENSES.md`, and a README.

Every chapter phase has the same exit criteria: every scene in its range meets the Definition of Done, every lint passes, the automated playthrough passes, performance is within budget, the critic review is clean, and the evidence is in `reports/`.

### 12.2 Definition of Done (every scene)

- [ ] All geometry final. No placeholders, clipping, z-fighting, floating objects, or unlit props.
- [ ] Lighting matches the location's style frame and brief, every light is motivated, and the grade is applied.
- [ ] Every character in the correct final costume and variant, with facial performance on every line.
- [ ] Every scripted line present exactly as written (dialogue lint), with voice (placeholder or final) and subtitles.
- [ ] Every scripted sound cue implemented (audio lint), plus ambience, Foley, and music as specified, and silence where specified.
- [ ] Shot list implemented, with the lens set per shot, and the script's camera and image rules passing their automated checks.
- [ ] Gameplay beats working, every examinable object carrying its line, and every clue present (clue lint).
- [ ] Performance within budget.
- [ ] Hero shots captured and critiqued, with no open defects.
- [ ] `PROGRESS.md` and `SCENE_TRACKER.md` updated.

---

## 13. Verification

### 13.1 Shot capture

`tools/capture/`: every scene has named camera markers for its hero shots (from its shot list). One command renders each marker at 1920×1080 (and letterboxed where applicable) to `reports/shots/<phase>/<scene>/<shot>.png`, along with a contact sheet of the whole scene. Run it after every visual change, and look at the results before moving on.

### 13.2 Lint suite

Fast lints run in the pre-commit hook; the full suite runs at every milestone.

- Dialogue coverage (every line, exact, in order, correct speaker).
- Audio cue coverage (every cue in `AUDIO_CUE_SHEET.md` exists and fires).
- Clue coverage (every clue in `CLUE_REGISTRY.md` exists in its scene).
- Missing resources, missing textures, default or placeholder materials in scenes marked done.
- Warm-light audit (Section 4.3).
- Reflection audit (Section 5.5, rule 2).
- The Room hand-visibility test (Section 5.5, rule 1).
- A silhouette lineup render of all principals for review.
- Subtitle coverage for every line and every captioned sound.
- License coverage: every file under the assets folders has an entry in `ASSET_LICENSES.md` or is marked as original work.

### 13.3 Automated playthrough

A bot that drives the critical path of each chapter with scripted inputs: walk to markers, interact with required objects, pin the scripted suspect, and win the nightmare fights on Story difficulty. It asserts every expected state change and records video or screenshots to `reports/playthroughs/`. It runs at every milestone.

### 13.4 Critique rubric

For every hero shot, score each criterion from 1 to 5 and write one line of evidence for each score:

1. Composition
2. Lighting and mood
3. Character fidelity (matches the design sheet)
4. Materials and surface detail
5. Readability (what matters is visible)
6. Cinematic quality (would this pass as a still from a well-shot thriller?)
7. Consistency with the script and this brief

Anything under 4 is a defect. Fix it, capture again, and score again. Record every round in `reports/critiques/`.

### 13.5 Performance capture

At every milestone, profile each scene for frame time, draw calls, and memory, and log the results in `reports/perf/` against the budgets set in Phase 0.

---

## 14. What needs a human

Start `HUMAN_TASKS.md` with these, and keep it current:

- Installing Godot, Blender, and Git LFS if they're missing.
- Anything that needs an account, a download behind a login (for example, Mixamo animations), or a purchase.
- Casting and recording the final voice performances. Optionally, hiring a composer.
- Sign-offs: `PLAN.md`, every style frame, every character design sheet, the vertical slice, and each chapter.
- Playtesting for feel, fear, and pacing. The human's notes become tasks.

Never fake any of these. Write the steps, keep working on everything else, and pick the task back up when it's done.

---

## 15. Kickoff

Read this brief, the story bible, and the Director's Script completely. Then do Phase 0 only. In your first reply:

1. Summarize the game back in about ten lines, including the twist, so the human can confirm you understood it.
2. List your open questions, including every gap in Section 11.
3. Propose `PLAN.md`.

Don't write game code until the human approves the plan. When you do start building, remember the standard this whole brief comes down to: build it like it's going to be watched in a dark theater, then check your work like someone who's paid to find every flaw.
