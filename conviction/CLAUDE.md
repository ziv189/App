# CONVICTION: rules for every session

CONVICTION is a 3D, third-person, cinematic noir psychological-horror game built in Godot. The master brief is `docs/BUILD_BRIEF.md`. This file holds only what every session needs; the brief has the detail.

The project lives in `conviction/` inside the `ziv189/App` repository, on branch `claude/compassionate-dijkstra-n6wtkf`, until the owner creates `ziv189/conviction` (HUMAN_TASKS.md, H1); then it moves there with its history. Run git commands from the repository root.

## Start of every session

1. Read `PROGRESS.md` (where the last session stopped), then the current phase in `PLAN.md`.
2. Run `tools/setup/bootstrap.sh` and put `/opt/conviction-tools/bin` on `PATH`. It builds Godot from source (about 20-25 minutes on 4 cores), so start it in the background. Use `--no-godot` if the session won't touch the engine.
3. Check `HUMAN_TASKS.md` for anything the owner has answered.

## Sources of truth

- **Story:** `docs/directors_script.md` wins on what happens. It's the working script, including the approved changes. `docs/STORY_CHANGES.md` explains each change from the original `.docx`, and `docs/story_bible.md` explains why things happen.
- **Build and quality:** `docs/BUILD_BRIEF.md` wins. Where it disagrees with the script on a story detail (for example, the postmark is now JAN 12), the script wins; the conflicts are logged in `DECISIONS.md`.
- Never edit the `.docx` originals.

## Non-negotiables (brief §2, condensed)

- Plan each phase in plan mode before touching files, and write its tasks, acceptance criteria and risks into `PLAN.md`.
- The vertical slice (the Prologue, scenes 1–3) sets the bar. Nothing after it ships below it.
- Never shrink scope silently. If something can't reach the bar, stop, explain why in `DECISIONS.md`, propose the best alternative, and ask.
- Evidence, not claims. "Done" needs evidence next to it: captures in `reports/`, passing lints and tests, or a playthrough log.
- After every visual change: capture, critique against the rubric (brief §13.4), fix, and capture again.
- Placeholders are allowed only while work is in progress, and only when logged in `PLACEHOLDERS.md`.
- Finished work has no TODOs, stubs, commented-out code, or hacks without a comment and a logged task.
- Small commits, one task each. Never force-push, never rewrite history, and never delete an asset without a backup.
- Update `PROGRESS.md` at the end of every session, and before the context gets long.
- Human-only work goes in `HUMAN_TASKS.md` with exact steps. Never fake the result.
- Every external asset goes in `ASSET_LICENSES.md` with its source, author and license. Prefer CC0. Nothing with an unclear license, and nothing from films or other games.
- The camera, reflection, light and motif rules are what make the twist fair. Their checks never get disabled.
- Ask the owner when a choice changes how the game looks, sounds or plays. Otherwise decide, log it in `DECISIONS.md`, and keep going.
- The owner has approved story changes at Claude's discretion (2026-09-27). Each change goes in `docs/STORY_CHANGES.md` with its reason, in its own commit.

## Environment (Claude Code cloud sessions)

- **No GPU.** Captures render with Mesa llvmpipe (software Vulkan) under Xvfb, which is slow. Lints and playthrough assertions run with `--headless`. Performance is measured on the owner's MacBook Pro M3, which is also the first platform (DECISIONS.md, D-015).
- **GitHub.** Public repositories can be cloned, but GitHub release files can't be downloaded. That's why Godot is built from source.
- **Fresh machine.** Every session starts on a fresh machine, so anything not committed and pushed is lost.

## Where things are

| File | What it holds |
|---|---|
| `PLAN.md` | Phases, tasks, acceptance criteria, estimates, risks, open questions |
| `PROGRESS.md` | Session log: what was done, evidence, what's next |
| `DECISIONS.md` | Every decision and brief/script conflict, with the reason |
| `HUMAN_TASKS.md` | What only the owner can do |
| `PLACEHOLDERS.md` | Work-in-progress placeholders and what replaces them |
| `ASSET_LICENSES.md` | Every external asset and shipped component |
| `SCENE_TRACKER.md` | One row per scene, generated from the script |
| `AUDIO_CUE_SHEET.md` | Every sound cue, generated from the script and then reviewed |
| `CLUE_REGISTRY.md` | Every clue, where it appears, and what it pays off |
| `BRANCHING.md` | The board rules and every path through the story |
| `docs/` | The brief, the story bible, the script, story changes, and later shot lists and casting |
| `game/` | The Godot project, from Phase 1 |
| `tools/` | Pipeline, lint, capture, test and setup tools |
| `reports/` | Evidence: shots, critiques, tests, perf, playthroughs |

## Tools so far

- `tools/setup/bootstrap.sh` installs the pinned toolchain from `tools/setup/versions.env`.
- `tools/pipeline/docx_to_md.py` converts and verifies the source documents.
- `tools/pipeline/gen_trackers.py` regenerates `SCENE_TRACKER.md` and `AUDIO_CUE_SHEET.md` from the script.
- `tools/lint/script_structure.py` checks the script's structure. It runs in the pre-commit hook in `tools/githooks/`.
- `tools/pipeline/configure_project.sh` regenerates `game/project.godot` and `game/default_bus_layout.tres` from `configure_project.gd`. Never hand-edit those two files.
- `tools/tests/run_tests.sh` runs every lint and every `tools/tests/test_*.gd` headlessly. Run it before each commit that touches the game.
