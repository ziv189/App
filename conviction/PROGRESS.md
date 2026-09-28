# Progress

Newest session first. Each entry: what was done (with evidence), what's next, open problems.

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
