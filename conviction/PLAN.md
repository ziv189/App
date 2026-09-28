# CONVICTION: PLAN.md

**Status:** v0.3, 2026-09-28. **Approved by the owner on 2026-09-28**, including deviations D1 and D2. Phase 1 is in progress. The move to the project's own repository waits on the owner creating it (`HUMAN_TASKS.md`, H1).

**Changes since v0.1:**
- The story bible arrived.
- The story gaps and contradictions are resolved (SC-01 to SC-16).
- The toolchain is built and smoke-tested.
- Every tracking file exists.
- Most of the v0.1 open questions are closed (section 6).

References like "brief §5.5" point to `docs/BUILD_BRIEF.md`. Scene numbers point to `docs/directors_script.md`.

---

## 1. How this plan works

- **Detail grows as we go.** Phases 0–3 are broken into tasks now. Each later phase gets its full task list, written in plan mode, when it starts (brief §2.1). That way it can use what the vertical slice teaches us.
- **Estimates are in sessions.** A session is one Claude Code working session that ends with `PROGRESS.md` updated, usually a few hours of work. The ranges are honest guesses. Confidence drops sharply after Phase 3, so everything gets re-estimated after the slice using measured data.
- **Evidence, or it isn't done.** Every exit criterion is met with evidence in `reports/` (brief §2.4) and the Definition of Done (brief §12.2).
- **Assumptions:** Godot 4 and third-person, as the brief specifies. The first platform is **macOS on Apple Silicon**, because the owner's only machine is a MacBook Pro M3 (D-015). Windows and Linux builds are exported too, but are only tested when a tester has that hardware.

## 2. Build environment

Measured in this cloud container on 2026-09-27 (`reports/phase0/environment.md`):

| Item | Finding |
|---|---|
| Machine | Ubuntu 24.04, 4 CPUs, 16 GB RAM, about 30 GB of free disk, no GPU |
| Rendering | Mesa llvmpipe (software Vulkan 1.4). Godot's Forward+ renderer works under Xvfb: the smoke test rendered a fogged, shadowed, flashlight-lit frame at 1280×720 in 19.2 s, including engine start-up. |
| Network | Full internet access. GitHub is the exception: it serves git clones of public repos, but not release files. |
| Godot | 4.7.2-stable, built from the official source at commit `ed1daf0` in 23 minutes |
| Blender | 5.2.2 LTS, checksum-verified, installed in 29 s |
| MPFB | 2.0.17. It creates a base human in 0.3 s, and its bundled assets are CC0. |
| Lifetime | Every session starts on a fresh machine |

This is how the work runs:

- **`tools/setup/bootstrap.sh`** installs the pinned toolchain (`tools/setup/versions.env`) and checks it. Every download is checksum-verified, and Godot's source is verified by commit hash.
- **`tools/setup/smoke_test.sh`** proves Godot renders and MPFB works, and writes the environment report.
- **Godot runs in three ways:**
  - `--headless` for lints, data checks and playthrough state assertions. This is fast.
  - Xvfb with llvmpipe for image captures. This is slower, but fine for stills.
  - Movie Maker mode (`--write-movie`) for frame-by-frame captures of sequences, so slow rendering never changes timing.
- **These run on your MacBook Pro M3:** Godot runs there on Metal, its default macOS driver in 4.7.2.
  - performance against the budget, which is recalibrated for your Mac (D-015)
  - gamepad feel, if you have a controller (H7)
  - the headphone and speaker mix check
  - playtests

  Each one gets a one-command script that writes a report I can read.

## 3. Proposed deviations from the brief (each needs your OK: H3)

- **D1. Asset storage in cloud sessions.** Brief §2.8 says to put binary assets in Git LFS. But every cloud session clones the repo from scratch, so every LFS file would download again in every session, costing time and GitHub LFS bandwidth. Proposal:
  - Anything the `tools/blender/` scripts build is rebuilt into a local cache and not committed.
  - Downloaded CC0 assets are fetched from a manifest of URLs and SHA-256 checksums, and not committed.
  - LFS holds only what can't be regenerated: voice recordings, hand-made textures, bakes too slow to rebuild, and the cached Godot build (R10).

  I'll revisit this at the end of Phase 1 with measured rebuild times.
- **D2. Style frames per chapter.** The brief puts every location's style frame (about 25) into Phase 2, before the slice. Proposal:
  - Phase 2 covers the character test, the five principal design sheets, the monster base, and the style frames the slice needs: the Room, 4F, the cold-open nightmare and the title screen.
  - Every other location still gets its style frame and your sign-off before it's built (brief §4.5), at the start of its chapter phase.

  Reason: building the slice will change the look stack, and 20 frames made before it would need redoing.

## 4. Risks

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | **Character faces at the brief's close-up bar** (brief §6.1). Of the whole bar, faces built from scripted MPFB bodies with custom shaping are what I'm least sure I can reach alone. | High / High | Ward's head is the first deliverable of Phase 2. It gets rendered in all three lighting setups for your verdict before anything depends on it. If it falls short, you choose a fallback; I never switch silently. There's no budget for a character artist (H4), so the fallbacks are free or CC-BY scanned heads usable in Godot, or reframing the look toward shadow and silhouette. |
| R2 | Performance for 338 spoken lines across 17 characters: mocap retargeting, lip sync and expression curves | High / High | Build the whole pipeline in Phases 1–3 and prove it on Ward and Walt in the slice before scaling up. |
| R3 | Software rendering slows down the capture-and-critique loop | Medium / Medium | Iterate at low resolution and make final captures at 1080p. Use Movie Maker mode for sequences. Capture only the shots that changed. Optionally, run capture-heavy sessions in Claude Code on your Mac, where Godot renders on the M3's GPU in real time. |
| R4 | Baking lightmaps (LightmapGI) on software Vulkan may be too slow to be practical | Medium / Medium | Choose the GI approach in Phase 1 by testing VoxelGI or SDFGI against lightmaps baked on your PC. |
| R5 | Film-quality sound sources. CC0 Foley and ambience libraries are thin, and Freesound needs an account and has mixed licenses. | Medium / High | Synthesize what can be synthesized (the hum, the clock, tones). License-check everything. A paid library may be needed; that's your call. |
| R6 | Voices, music and final performances depend on people | Certain / Medium | Use text-to-speech placeholders for timing only (brief §8.7). Write casting briefs and recording scripts early, so recording can run in parallel. |
| R7 | Scope: the brief sets a studio-scale bar | High / High | The slice is the go/no-go checkpoint. Re-estimate after Phase 3. |
| R8 | Godot APIs change between minor versions | Medium / Low | Check the 4.7.2 docs or source before using an API (brief §3.1). The source is already on disk. |
| R9 | ~~Story gaps and script contradictions~~ | Resolved | SC-01 to SC-16 (`docs/STORY_CHANGES.md`), with every path mapped in `BRANCHING.md`. |
| R10 | Every session that needs the engine spends 23 minutes building Godot | Certain / Medium | For now, build in the background at session start. Once the project has its own repo (H1), cache the compressed editor build there with Git LFS, so sessions restore it in seconds. Your Mac just uses the official download. |

## 5. Phases

| Phase | Scope | Estimate (sessions) | Exit |
|---|---|---|---|
| 0 | Setup and plan | 1 (done) | Approved 2026-09-28 |
| 1 | Tools and pipeline | 6–10 | A test scene passes the whole pipeline and every lint |
| 2 | Character test, design sheets, slice style frames | 12–25 | Your sign-off on each one |
| 3 | Vertical slice: the Prologue (scenes 1–3) | 20–35 | Captured playthrough, all lints, clean critic review, your sign-off |
| 4 | Ch. 1, Night 1, Interlude 1 (scenes 4–11) | 25–40 | Chapter exit criteria (brief §12.1) |
| 5 | Ch. 2, Night 2 (scenes 12–17, 15A) | 20–35 | Same |
| 6 | Ch. 3, Night 3, Interlude 2 (scenes 18–24, 22A, 22B) | 20–35 | Same |
| 7 | Ch. 4 (scenes 25–28) | 8–15 | Same |
| 8 | Ch. 5, Night 5, Interlude 3 (scenes 29–34) | 12–20 | Same |
| 9 | Ch. 6, Night 6, Finale, Credits (scenes 35–41, 38A) | 25–40 | Same |
| 10 | Secret ending (scene 42) and refusal beat | 6–12 | Same |
| 11 | Polish, and three full playthroughs | 20–40 | Brief §12.1, Phase 11 |
| 12 | Release build | 2–4 | Exported build, licenses screen, README |
| | **Total** | **about 175–310** | Re-estimated after Phase 3 |

Phase 10 dropped from 10–20 sessions: SC-01 removed the alternate-victim branches.

### Phase 0: Setup and plan (no game code)

- [x] **Convert and verify both documents.** Identical word sequences, all 46 scene headings, and 8 of 8 dialogue lines verbatim. Evidence: `reports/phase0/doc_conversion.md`.
- [x] **Resolve the story gaps (brief §11) and the script's contradictions.** Evidence: `docs/STORY_CHANGES.md` and `BRANCHING.md`.
- [x] **Create the layout (brief §3.3) and every tracking file.** That's `CLAUDE.md`, `HUMAN_TASKS.md`, `DECISIONS.md`, `PLACEHOLDERS.md`, `ASSET_LICENSES.md`, `CLUE_REGISTRY.md` and `BRANCHING.md`, plus the generated `SCENE_TRACKER.md` and `AUDIO_CUE_SHEET.md`.
- [x] **Install and smoke-test the toolchain, and record the versions.** Evidence: `reports/phase0/environment.md`, `reports/phase0/smoke_render.png`, and `DECISIONS.md` (D-002 to D-005).
- [x] **Add the pre-commit hook** with the one lint that can exist before Phase 1 (`tools/lint/script_structure.py`).
- [x] **Draft per-scene budgets** (table below).
- [x] **H1:** decide where the repo lives: its own private repo. Moving it waits on you creating the empty repo (GitHub doesn't let this integration create one).
- [x] **H2:** your approval of this plan (2026-09-28).

**Draft performance budgets** (the brief's targets for 1080p High on an RTX 3060-class GPU; Phase 1 recalibrates them on your MacBook Pro M3, D-015):

| Scene type | Examples | Draw calls | Visible triangles | Texture memory | Shadow-casting lights in view |
|---|---|---|---|---|---|
| Small interior | the Room, 4F, Hale's room, holding cell | ≤ 1,500 | ≤ 1.5 M | ≤ 1.5 GB | ≤ 4 |
| Large interior | precinct, laundromat, the Meridian | ≤ 2,500 | ≤ 3 M | ≤ 2.5 GB | ≤ 8 |
| Exterior | streets, cemetery, Calder Street | ≤ 3,000 | ≤ 4 M | ≤ 3 GB | ≤ 6 |
| Nightmare | Nights 1–6 | ≤ 1,500 | ≤ 2 M | ≤ 1.5 GB | ≤ 3, plus heavy volumetric fog |
| Close-up cutscene | the Room, the finale | ≤ 1,500 | ≤ 3 M | ≤ 2.5 GB | ≤ 4 |

Every scene also has to meet the brief §3.4 targets: 16.6 ms frames, no hitch over 50 ms, and chapter loads under 10 seconds.

### Phase 1: Tools and pipeline

- [ ] **Godot caching (R10):** once the project has its own repo, store the compressed editor build there with Git LFS and teach the bootstrap to restore it. Also add a SessionStart hook there that runs the bootstrap.
- [x] **Project foundation**, generated as code by `tools/pipeline/configure_project.gd`. A rerun is byte-identical, and the editor opens and imports it without rewriting anything.
  - Forward+, physical light units, Jolt physics, and stretch settings for 16:9 through 21:9
  - render layers `world` and `ward` (Ward only; every reflection except the Room's glass culls it), and physics layers
  - 16 input actions, each with keyboard or mouse and gamepad bindings, using physical keys
  - 13 audio buses (brief §8.2): Dialogue ducks Music and Ambience, there's a limiter on Master, and seven fully wet room reverb sends
  - Evidence: `tools/tests/test_project_config.gd` passes, and fails as it should on a copy with a missing gamepad binding and a renamed bus.
- [ ] **Door occlusion** (brief §8.2): sounds behind a closed door get low-passed and quieter. It's a system, with its own test scene.
- [ ] **Blender pipeline:**
  - a script framework in `tools/blender/`
  - glTF export conventions: scale, axes, naming, LODs and collision
  - a skeleton for the modular kit generator
  - Godot import presets
- [ ] **Look stack:** one Look resource per world: day, nightmare, the Room, and the warm finale. Each drives:
  - tonemapping (AgX is present in 4.7.2) and exposure
  - grain, halation and vignette
  - chromatic aberration at the frame edges only
  - LUTs, built by an in-house LUT tool in `tools/`
  - volumetric fog, depth of field and motion blur (brief §4.4)
- [ ] **Camera:**
  - the lens kit (brief §5.1), built on physical camera attributes
  - rack focus, dolly zoom, handheld drift and camera impulses
  - the letterbox, with bars that slide in over 0.6 seconds
  - authored camera zones, with input direction smoothing
  - the third-person gameplay camera, with collision
- [ ] **Cutscenes as data** (brief §5.4): shot list, then data, then a runner. Also a template for `docs/shotlists/`.
- [ ] **The blackout system** (brief §5.6), with per-chapter parameters.
- [ ] **The capture tool** (brief §13.1): named camera markers render to 1080p PNGs plus a contact sheet per scene, and Movie Maker mode handles sequences.
- [ ] **The lint suite** (brief §13.2). Each lint ships with a deliberately broken fixture that it must catch. The lints cover:
  - dialogue, audio cues and clues
  - missing and default resources
  - warm light and reflections
  - the Room hand-visibility check
  - subtitles and licenses

  The clue lint reads a machine-readable twin of `CLUE_REGISTRY.md`. The audio lint turns on only after every cue sheet row is reviewed by hand (D-012).
- [ ] **Narrative pipeline:** `script_to_data` turns the script's Markdown into per-scene dialogue data, and `dialogue_coverage` checks it. Two things get explicit handling:
  - lines embedded in prose: Nadine's answering-machine message, Lily's whisper fragments and the TV captions
  - the refusal beat's pronoun variants
- [ ] **The playthrough harness** (brief §13.3), as a skeleton with headless state assertions.
- [ ] **The GI decision** (R4), made by testing.
- [ ] **A perf kit for your Mac:** a profiling scene you open in Godot 4.7.2 for macOS, plus a script that records your exact chip and GPU cores and writes its report into `reports/perf/`. The budget table is recalibrated from its first report.

**Acceptance:**
- The brief's exit criterion: a test scene goes through the whole pipeline, captures cleanly and passes every lint.
- Every lint catches its broken fixture.
- A perf report from your Mac for the test scene.

**Risks:** the cost of planar reflections, capture speed, and API details in Godot's post-processing (CompositorEffect).

### Phase 2: Character test, design sheets and slice style frames

The order is set by risk:

1. [ ] **Character test (R1).** Ward's head and shoulders, through the full pipeline:
   - MPFB base, then face shaping, then bakes
   - hair and stubble cards
   - eyes and teeth

   It's rendered under the noir key, the flashlight and nightmare red. You decide whether we go ahead or pick a fallback.
2. [ ] **Design sheets** (brief §6.2, steps 1–8) for Ward (every variant in brief §6.3), Walt, Lily, Ruth and Brennan. Also the monster base, and the silhouette and height lineups. Gus Pell and Ray Kostic only need their board photos (D-009).
3. [ ] **Style frames** for the Room, apartment 4F in the morning, the cold-open nightmare and the title screen (D2).

**Acceptance:**
- Your sign-off on the character test, each design sheet and each style frame.
- Critic scores of 4 or more on every rubric line (brief §13.4), with every round recorded in `reports/critiques/`.

### Phase 3: Vertical slice, the Prologue (scenes 1–3)

- [ ] **Scene 1, the Room:**
  - the set (brief §7.1)
  - the one-way glass shader (brief §5.6)
  - the silhouette as a true planar reflection of Ward's mesh (brief §6.5)
  - the test that his hands never enter the frame (brief §5.5, rule 1)
  - the insert of his shoes with no laces
  - the chain clink below the frame (SC-10)
  - the hum and the intercom voice chain (brief §8.7)
  - the letterbox and the rack focus
- [ ] **Scene 2, the cold open:**
  - the clock at 3:40, with its tick and snap-back
  - Lily, the line of light and the reversed whisper
  - the monster base and its signature reaction to the beam
  - the combat tutorial: LIGHT, LIGHT (hold), STRIKE
  - subliminal frames, respecting photosensitivity mode
  - the three knocks
- [ ] **Scene 3, the morning in 4F:**
  - the full apartment (brief §7.2), and the fourth-floor hallway with 4C
  - the shared wake-up pose asset (brief §5.5, rule 3)
  - Ruth's call, with the pin thunk under the dial tone
  - exploration: the envelope (*Not tonight*, postmark JAN 12), the sketch, the bathroom, and the flashlight with one dent
  - Walt's scene: the coffee handoff, the bruised knuckles, and the touch on 4C's doorframe
  - evidence cards collected here can build the case against Ward's ID later (SC-03)
- [ ] Every character in their final slice variant, with facial performance on every line (placeholder TTS and lip sync).
- [ ] Every sound cue in scenes 1–3 from the cue sheet, plus the ambience beds and Foley.
- [ ] The first-launch flow: content note, photosensitivity prompt, title screen, subtitles and basic settings. It's an addition, so testers can play the slice as it stands.
- [ ] An automated playthrough of the slice, captures, a critic review, and a perf report from your Mac.

**Acceptance:**
- The brief's exit criteria: a full captured playthrough, every lint passing, a clean critic review, and your sign-off.
- Every scene meets the Definition of Done (brief §12.2).

### Phases 4–12 (detailed task lists written when each phase starts)

Each chapter phase follows the same template:

1. Style frames for new locations (D2)
2. Shot lists
3. Locations
4. Characters
5. Cutscenes
6. Gameplay beats
7. Nightmare
8. Audio
9. Lints
10. Playthrough
11. Captures and critique
12. Perf
13. Sign-off

The exit criteria are the brief's (§12.1), and every scene meets the Definition of Done.

**Phase 4: Ch. 1, Night 1, Interlude 1 (scenes 4–11)**
- **New locations:**
  - 19 Calder Street, Hale's room and its nightmare version
  - the squad room and Brennan's office, with the booking footage as a real in-game video
  - St. Brigid's Cemetery
  - the Carlyle stairs and hallway at night
- **New characters:** Ruth, Brennan, Ames, Tom, Hale (as a body, with the pale band on his wrist from SC-08) and Kowalski (in the footage).
- **New systems:**
  - investigation with Ward's voice-over, with evidence cards
  - the Board, including the complete-case rule, string physics, PIN and Pell's alibi note (SC-01)
  - the full Night 1 fight, including the crawl phase
  - PROTECT HER and the victory strings
  - the first interlude, with the nightmare-rule line (SC-14)
- **Main risk:** how the Board feels to use, and making Night 1 feel like a win without softening the cornered-victim tells (see `docs/STORY_CHANGES.md`, "Considered and not changed").

**Phase 5: Ch. 2, Night 2 (scenes 12–17, 15A)**
- **New locations:**
  - Tom's row house: the street shot, the hall, and the wall of about 100 photos showing Lily at three ages
  - Nadine's apartment, the laundromat and the car (15A)
- **New characters:** Mrs. Delaney and Nadine.
- **Nightmare:** the 100-foot corridor with its turning photos, the drunk monster and the mail slot.
- **Main risk:** the no-repeats-in-one-shot rule on the photo wall.

**Phase 6: Ch. 3, Night 3, Interlude 2 (scenes 18–24, 22A, 22B)**
- **New locations:** Nadine's crime scene (with Mrs. Ocampo's second-visit line from SC-05), the Meridian hallway and apartment 6D, the payphone at Hollis & Ninth, and the newspaper.
- **New characters:** Mrs. Ocampo, Fenn and Pryce.
- **Beats:** Ruth's camera flash, the search for the transmitter, the Night 3 maze of sheets, and Interlude 2 with the crack on "Go on" and the refusal variant.
- **Main risk:** the hide-and-seek AI, and the cost of the cloth sheets.

**Phase 7: Ch. 4 (scenes 25–28)**
- **Beats:** the morning with the rust smear, the squad-room arrest (tapes from January 15 on, per SC-04; off-screen cuffs; TV captions), the 90-second locked shot of the holding cell, and the guard.
- **Main risk:** making the silent shot read as intentional, not as a freeze.

**Phase 8: Ch. 5, Night 5, Interlude 3 (scenes 29–34)**
- **Locations and beats:**
  - Brennan's office, where Ruth hands over her badge and gun
  - the Meridian alley, with Bell's knock line (SC-06)
  - wrecked 6D, and the basement, with Fenn's "night before last" (SC-07)
  - Ward's bedroom, seen for the first time
  - the Night 5 basement, with no UI
  - Ruth under the streetlight on the 135 mm lens
  - Interlude 3
- **Main risk:** pacing a nightmare in which nothing happens.

**Phase 9: Ch. 6, Night 6, Finale, Credits (scenes 35–41, 38A)**
- **Beats:**
  - the first-sun morning, and the last board with Ward's question-mark card (SC-01)
  - Night 6 in Ruth's apartment: the boxer monster, the cracked screen, the door burst, the shadow figures and the floor-level shot
  - the finale: the lamp going off through the glass shader, the warm observation room, the chain snapping taut and the tilt-down (SC-10), Ruth's and Dr. Reyes's lines (SC-11), the evidence bags, and OPEN
  - scene 40
  - the credits: strings from save data, and replays staged from the player's recorded movement, including the Hale replay's window (SC-12, SC-16)
- **Main risk:** the reveal has to come from the shader's physics alone, with no scripted swap.

**Phase 10: Secret ending (scene 42) and the refusal beat**
- **Scope:** the per-chapter refusal handling (SC-02), and the case against Ward's ID from collected evidence (SC-03), all mapped in `BRANCHING.md`.
- **Main risk:** the branches being correct, checked by a playthrough bot on every path.

**Phase 11: Polish.** Includes three full playthroughs: the main path, the refusal beat and the secret ending.

**Phase 12: Release build.** A macOS export for Apple Silicon (D-015), plus Windows and Linux exports, a licenses screen generated from `ASSET_LICENSES.md`, and a README.

## 6. Open questions

Tracked in `HUMAN_TASKS.md`:

- **H1. Create the empty repo.** GitHub doesn't let this integration create repositories, so it's a one-minute job for you (steps in `HUMAN_TASKS.md`). I then move the project in with its history.
- **H7. Do you have a game controller and headphones?** Needed by Phase 3 for gamepad feel and the mix check.

**Answered on 2026-09-28:**
- **H1:** the project gets its own private repo.
- **H2:** this plan is approved.
- **H3:** deviations D1 and D2 are approved.
- **H4:** there's no budget for a character artist.
- **H5:** the test machine is a MacBook Pro M3.
- **H6:** no story vetoes.

**Resolved earlier:**
- **Story bible (Q1):** received and converted.
- **GitHub access (Q3):** release downloads stay blocked, so Godot is built from source.
- **Branching gaps and script fixes (Q4, Q7):** you gave me discretion; see `docs/STORY_CHANGES.md`.
