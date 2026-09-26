# SOSIES — instructions for Claude sessions

Read this first. Then read `Docs/SOSIES_Master_Build_Prompt.md` (the owner's brief: story, the six rules, systems, art direction and milestones, all fixed unless the owner approves a change) and `Docs/Decisions.md`.

## Where we are
- **Current milestone: M0 Foundations.** Repo scaffolding was pushed on 2026-09-26. The owner is creating the Unreal project on their Mac following `Docs/Milestones/M0_Foundations.md` and will report the checklist.
- **Next step once the owner pushes the project:** read `Sosies/Config/*.ini` and verify every M0 setting:
  - Lumen global illumination and reflections, Virtual Shadow Maps, TSR
  - Motion blur off, image-based lens flares off
  - Mesh distance fields on; hardware ray tracing off; MegaLights off
  - Smooth frame rate off; Enhanced Input default classes
  - Windows `DefaultGraphicsRHI_DX12` with `PCD3D_SM6`; Mac Metal SM6

  Fix anything wrong directly. Then log the performance numbers in `Docs/QA/PerfLog.md`, update the milestone table in `README.md`, and start M1.

## How the owner wants to work (from the brief)
- Follow the milestones in order. One milestone, or one clearly named part of it, per response. Never jump ahead.
- Give exact editor steps with full menu paths, and complete Blueprint logic node by node (with variable names and types) or complete C++ files. No "...", TODOs or placeholders. If a file can be edited directly, edit it and list exactly what changed.
- End every response with a test checklist (what to do, what they should see). Nothing is done until the owner confirms it passes.
- Bug reports: likely cause, then the fix, then a test that proves it's fixed.
- Say when an Unreal menu or API differs between engine versions, and give the alternative.
- Never change the story, the rules or the art direction without asking first and explaining the trade-off.
- Quality bar: a modern, photoreal commercial horror game. Never stylized, low-poly, blocky or procedural characters or rooms.

## Owner profile
- New to Unreal **and** to programming. Explain every click; give C++ as complete files to paste in unchanged.
- Dev machine: **MacBook Pro, Apple M3, 32 GB, macOS**. UE 5.8.x from the Epic Games Launcher; Xcode per Epic's 5.8 requirements page, plus the Metal Toolchain.
- Has an **iPhone 12 or newer** (MetaHuman Animator depth capture through Live Link Face).
- **Tight budget:** prefer free or already-owned content; ask before recommending any purchase.
- No fixed weekly hours; keep each milestone part to a few hours of work.

## Hard constraints
- The target is Windows / DirectX 12 / Steam, but the owner has **no Windows PC yet**. A Mac can't package Windows builds or prove the Windows performance targets (Decisions D-002). Raise this before M5.
- The repository `ziv189/App` is **public** (owner's choice, D-003). Never commit licensed third-party source assets (Fab, Megascans, MetaHuman output, paid packs, voice recordings); see the guard block in `Sosies/.gitignore` and D-004. When a paid pack is added, add its folder to that block.
- Keep the project self-contained under `Sosies/` (its own `.gitattributes` and `.gitignore`) so it can move to a private repository later.

## Working in the cloud container
- Git LFS isn't installed in the container, so `.uasset`/`.umap` files there are LFS pointer files. Never edit, rename, move, delete or re-add them, and never install git-lfs or run `git lfs pull` (it would use up the owner's LFS bandwidth).
- Safe to edit: `Sosies/Config/*.ini`, `Sosies/*.uproject` (JSON), `Sosies/Source/**` (C++, once it exists), `Sosies/Docs/**`, `Sosies/.gitattributes`, `Sosies/.gitignore`.
- Blueprints, maps and assets can only be changed by the owner in the editor, so give node-by-node steps.
- Unreal can't run in the container. Say so when something is unverified, and give the owner a test for it.
- Work on the branch named for the session, with clear commit messages.

## Conventions
- Assets live only under `Content/Sosies/{Characters, Environments, Props, Systems, UI, Audio, Cinematics, Maps, Data}`.
- Prefixes: `BP_ WBP_ M_ MI_ T_ SM_ SK_ ABP_ MS_ DT_ LS_`.
- All player-facing text goes in String Tables.
- Record every technical decision in `Docs/Decisions.md`, bugs in `Docs/QA/BugList.md`, and performance in `Docs/QA/PerfLog.md` (at least one row per milestone).
