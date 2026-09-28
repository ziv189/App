# Human tasks

Things only a person can do (brief §2.10, §14). Each one has exact steps. Claude keeps working on everything else in the meantime and never fakes the result.

## Open now

| # | Task | Why | How | Blocks |
|---|---|---|---|---|
| H1 | Create the empty `conviction` repository | You chose its own repo, but GitHub doesn't let Claude's integration create repositories (it returned 403). | 1. Open https://github.com/new. 2. Owner **ziv189**, name **conviction**, **Private**. Leave README, .gitignore and license unchecked; it must be empty. 3. Click **Create repository**. 4. Give Claude access: open https://github.com/apps/claude/installations/select_target, pick your account, and under Repository access keep "All repositories" or add **conviction**. Save. 5. Tell Claude "repo created". If Claude still can't reach it, start a new Claude Code session with `ziv189/conviction` selected. | Moving the project in with its history; caching the Godot build (R10); the SessionStart hook |
| H7 | Say whether you have a game controller and headphones | Brief §9.9 requires full gamepad support, and §8.8 wants the mix checked on headphones and speakers | Reply, for example, "PS5 controller, AirPods" or "neither" | Phase 3's feel and mix checks |

## Answered

| # | Question | Answer (2026-09-28) |
|---|---|---|
| H1 | Where the project lives | Its own private repository, `ziv189/conviction`. Creating it is the open task above. |
| H2 | Approve PLAN.md | Approved |
| H3 | Deviations D1 and D2 | Approved |
| H4 | Budget for a character artist | None. The R1 fallbacks are free or CC-BY scanned heads, or reframing toward shadow and silhouette, shown to you before any change. |
| H5 | Test machine | MacBook Pro M3. It becomes the first platform and the performance reference (DECISIONS.md, D-015). |
| H6 | Story vetoes | None |

## Coming later (not needed yet)

- **Godot 4.7.2 for macOS** (Phase 1, for the perf kit). Download it from godotengine.org and open the project folder. Claude will give exact steps with the kit.
- **Mixamo animations** (Phases 1 and 3). Sign in at mixamo.com with an Adobe account. Claude will list the exact animations and export settings.
- **Sign-offs:** the character test, design sheets and slice style frames (Phase 2), the vertical slice (Phase 3), then each chapter.
- **Voice casting and recording** (from Phase 3). Casting briefs and recording scripts will be in `docs/casting/`.
- **A composer**, optionally (brief §8.6).
- **Playtests** for feel, fear and pacing (from Phase 3). Your notes become tasks.
