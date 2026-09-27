# Human tasks

Things only a person can do (brief §2.10, §14). Each one has exact steps. Claude keeps working on everything else in the meantime and never fakes the result.

## Open now

| # | Task | Why | How | Blocks |
|---|---|---|---|---|
| H1 | Decide where the project lives | The brief assumes its own repo. Sessions also need a place to cache the Godot build (see PLAN.md, R10). | Reply **"own repo"**: Claude creates a private `ziv189/conviction` and moves `conviction/` into it with its history. Or reply **"keep it in App"**. | The SessionStart hook; caching Godot between sessions |
| H2 | Approve PLAN.md | It's the Phase 0 exit (brief §12.1) | Read `PLAN.md`, then reply "approved" or list changes | Phase 1 |
| H3 | Approve or reject deviations D1 and D2 | They change the brief's workflow | `PLAN.md` section 3 | D1 blocks Phase 1; D2 blocks Phase 2 |
| H4 | Say whether there's a budget for a character artist | Fallback if the character test misses the bar (PLAN.md, R1) | Reply yes, no, or "decide after the test" | Only the Phase 2 fallback |
| H5 | Describe your PC | Frame-rate budgets, gamepad feel and the mix are checked there | Reply with your OS, GPU, RAM, and whether you have a gamepad and headphones | The Phase 1 perf report |
| H6 | Optional: veto any story change | You gave Claude discretion; this is your chance to undo anything | Read `docs/STORY_CHANGES.md` and reply with any IDs to undo | Nothing |

## Coming later (not needed yet)

- **Mixamo animations** (Phases 1 and 3). Sign in at mixamo.com with an Adobe account. Claude will list the exact animations and export settings.
- **Perf runs on your PC** (from Phase 1). Run one command and send back the report file it writes.
- **Sign-offs:** the character test, design sheets and slice style frames (Phase 2), the vertical slice (Phase 3), then each chapter.
- **Voice casting and recording** (from Phase 3). Casting briefs and recording scripts will be in `docs/casting/`.
- **A composer**, optionally (brief §8.6).
- **Playtests** for feel, fear and pacing (from Phase 3). Your notes become tasks.
