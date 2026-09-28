# Progress

Newest session first. Each entry: what was done (with evidence), what's next, open problems.

## Session 2: 2026-09-28, Phase 1 started

**Done**

- The owner approved `PLAN.md` and deviations D1 and D2. Their answers are recorded: macOS on the MacBook Pro M3 is the first platform and the performance reference, and there's no character artist budget. See `DECISIONS.md` D-014 to D-017 and `HUMAN_TASKS.md`.
- Tried to create `ziv189/conviction`. GitHub refused this integration (`403 Resource not accessible by integration`), so creating the empty repo is now human task H1, with exact steps.
- **Project foundation:** `tools/pipeline/configure_project.gd` generates `game/project.godot` and `game/default_bus_layout.tres`:
  - Forward+, physical light units, Jolt physics
  - the `ward` render layer
  - 16 input actions, each with keyboard or mouse and gamepad bindings
  - 13 audio buses with Dialogue ducking and room reverb sends

  A rerun is byte-identical, and the editor imports it without rewriting anything. Evidence: `tools/tests/test_project_config.gd` passes, and fails on a deliberately broken copy.
- **Narrative pipeline:** `tools/pipeline/script_to_data.py` writes 347 spoken lines into 47 scene files in `game/data/dialogue/`, and `tools/lint/dialogue_coverage.py` guards them. Evidence: `tools/tests/test_dialogue_coverage.py` catches five kinds of damage, and `tools/tests/test_script_to_data.py` proves IDs stay stable and hand-filled fields survive.
- `tools/tests/run_tests.sh` runs everything. All 6 checks pass.

**Next**

- When the owner has created the repo (H1):
  1. Move the history with `git subtree split --prefix=conviction`.
  2. Attach the repo and push.
  3. Update the commit hashes cited in D-006.
  4. Remove `conviction/` from the App branch.
  5. Cache the Godot build there with Git LFS (R10) and add the SessionStart hook.
- Continue Phase 1:
  - the look stack and LUT builder
  - the camera system (lens kit, rack focus, dolly zoom, letterbox, camera zones)
  - cutscenes as data, and the blackout
  - the capture tool
  - the remaining lints: reviewing the audio cue sheet, the clue data twin, resources, warm light, reflections, Room hands, subtitles, licenses
  - door occlusion and the playthrough harness
  - the GI decision
  - the Blender pipeline
  - the perf kit for the Mac

**Open problems**

- Until the repo exists, every fresh session spends 23 minutes building Godot.
- The bootstrap's clean-clone Godot path hasn't run end to end yet: this session reused an existing checkout. It gets exercised in the next fresh session.

## Session 1: 2026-09-27, Phase 0

**Done**

- Read the brief, the story bible and the Director's Script in full.
- Converted both documents to Markdown and verified them: identical word sequences, all 46 numbered scene headings, and 8 of 8 sampled lines verbatim. Evidence: `reports/phase0/doc_conversion.md`.
- Made story changes SC-01 to SC-16 under the owner's approval. They resolve brief §11 and the script's contradictions. Evidence: `docs/STORY_CHANGES.md`, `BRANCHING.md`, and the commit diffs of `docs/directors_script.md`.
- Created the §3.3 layout and every tracking file: `CLAUDE.md`, `HUMAN_TASKS.md`, `DECISIONS.md`, `PLACEHOLDERS.md`, `ASSET_LICENSES.md`, `CLUE_REGISTRY.md` and `BRANCHING.md`, plus the generated `SCENE_TRACKER.md` and `AUDIO_CUE_SHEET.md`.
- Built the toolchain: Godot 4.7.2 from source, and Blender 5.2.2 LTS with MPFB 2.0.17. `tools/setup/bootstrap.sh` reproduces it from pinned, checksummed versions. A bootstrap run takes 2 minutes 49 seconds when a Godot build is already on disk; a fresh session adds the 23-minute Godot build. The smoke test rendered a Forward+ frame on software Vulkan and created an MPFB human. Evidence: `reports/phase0/environment.md`, `reports/phase0/smoke_render.png`.
- Added the script structure lint and pre-commit hook, and verified the lint against a deliberately broken heading.
- Revised `PLAN.md` to v0.2.

**Next**

- Wait for the owner: H1 (where the repo lives), H2 (approve the plan), H3 (D1 and D2), H4 (artist budget), H5 (their PC). See `HUMAN_TASKS.md`.
- Once H1 and H2 are answered, start Phase 1 in plan mode: detail its tasks in `PLAN.md`, then set up the Godot project foundation.

**Open problems**

- Every session that needs the engine spends about 20-25 minutes building Godot until a cached binary exists (PLAN.md, R10). The fix depends on H1.
