# SOSIES — Decision log

Every technical decision that shapes the project, with the reason and when to revisit it.
Story, the six rules and art direction are fixed by `SOSIES_Master_Build_Prompt.md` and are not decided here.

Format: **ID — Decision** (date, status) · Why · Consequences · Revisit.

---

## D-001 — Engine: Unreal Engine 5.8 (latest 5.8.x hotfix) from the Epic Games Launcher
*2026-09-26 · Accepted*
- **Why:** latest stable release (5.8.0 shipped 17 June 2026; hotfixes up to at least 5.8.3 since), meets the brief's "5.6 or newer", and it is Epic's last planned UE5 release, so it will be a long-lived, well-patched base. It also brings features this game uses directly: MetaHuman Creator and MetaHuman Animator running on macOS, production-ready MegaLights, Lumen Lite for Medium scalability, and production-ready Substrate materials.
- **Consequences:** always install the newest **5.8.x** hotfix. No mid-project move to UE6 unless the owner explicitly decides it.
- **Revisit:** only if a 5.8 bug blocks us.

## D-002 — Development machine: MacBook Pro (Apple M3), 32 GB; the ship target stays Windows
*2026-09-26 · Accepted (owner's hardware)*
- **Why:** the owner develops on a Mac. Unreal 5.8 runs natively on Apple Silicon, including Lumen, Nanite (M2 and newer) and Virtual Shadow Maps on the Metal SM6 renderer.
- **Consequences:**
  - **Xcode is required** even for a Blueprint-only project: Unreal compiles its Metal shaders with Apple's toolchain. Use the Xcode version on Epic's *macOS Development Requirements* page for 5.8 (when checked: Xcode 26.1.1; Epic states **Xcode 26.4 is not compatible**), plus Apple's separately downloaded **Metal Toolchain** (`xcodebuild -downloadComponent MetalToolchain`).
  - **Windows builds cannot be packaged on a Mac.** The Windows/DX12 build, the performance targets (RTX 3060 at 1440p High, GTX 1660 Super at 1080p Medium), DLSS and the final Steam QA all need a Windows PC with an NVIDIA GPU.
  - Mac frame rates are sanity checks, not proof of the Windows targets.
  - MetaHuman Animator works on Mac in 5.8 (facial animation from iPhone depth capture); some Identity features (e.g. marker tracking) are still DX12/Windows-only. Confirm at M3.
  - Never update macOS or Xcode mid-project without checking Epic's supported versions first.
- **Revisit:** decide how to access a Windows PC **before M5** (M6 requires the target frame rate). Options: borrow a friend's gaming PC for test days, a used RTX 3060 12 GB desktop, or a rented cloud Windows GPU machine for packaging and benchmarks.

## D-003 — Repository: `ziv189/App` (public) with the project in `Sosies/`
*2026-09-26 · Accepted (owner's choice, after being told it publishes the story and twist)*
- **Why:** the owner chose to keep the existing public repository.
- **Consequences:** everything under `Sosies/` is self-contained (its own `.gitattributes` and `.gitignore`), so it can be moved into a private repository later without changes. Work happens on the branch `claude/sosies-master-build-1r2wpo`. The story bible is committed publicly with the owner's consent.
- **Revisit:** before M3 (first licensed assets), see D-004.

## D-004 — Licensed third-party content is kept out of the public repository
*2026-09-26 · Accepted (protective default)*
- **Why:** Fab's Standard License only allows sharing source assets privately (with collaborators or through a private repository). A public repository would breach that. MetaHuman output and voice-actor recordings get the same caution until their terms are checked.
- **Consequences:** `Sosies/.gitignore` excludes the default import folders `Content/Fab/`, `Content/Megascans/`, `Content/MSPresets/` and `Content/MetaHumans/`. Any paid pack we add gets its folder added to that list. Those folders need their own backup (e.g. Time Machine plus a cloud copy) because GitHub won't hold them.
- **Revisit:** at M3. Either make the repository private (then delete the block in `.gitignore`) or keep this split and set up the separate backup.

## D-005 — Project created from the First Person template (Blueprint, Variant: None)
*2026-09-26 · Accepted*
- **Why:** the brief asks for a Blueprint First Person project. Variant **None** keeps the project clean; SOSIES builds its own player in M1, so the *Survival Horror* and *Arena Shooter* variant content would only be deleted. Settings: Target Platform *Desktop*, Quality Preset *Maximum*, no Starter Content, Raytracing unchecked.
- **Consequences:** the template's folders (FirstPerson, Input, Characters, LevelPrototyping, ...) stay until M1/M6 cleanup. Our content goes only under `Content/Sosies/`.

## D-006 — Rendering baseline
*2026-09-26 · Accepted*
- Lumen global illumination **and** Lumen reflections, **software** ray tracing (Generate Mesh Distance Fields on).
- Virtual Shadow Maps. Nanite on by default and enabled per mesh. TSR anti-aliasing and upscaling.
- **Substrate materials: left ON** (Epic's default for new projects since 5.7, production-ready).
- **Hardware ray tracing: OFF for now.** It compiles faster and gives the same look on the Mac and on the GTX 1660 Super minimum spec. Re-evaluate at M5 on Windows hardware; it improves Lumen quality on RTX cards.
- **MegaLights: OFF for now.** Re-evaluate at M5; it is production-ready in 5.8 and could help a house full of shadowed lamps.
- **Medium scalability uses Lumen Lite** (new in 5.8, around twice as fast as High), which is how the GTX 1660 Super target can keep bounce light.
- Motion blur off (art direction). Image-based lens flares off: they are a camera artefact, and we'll add lens effects only to the camcorder view. Auto exposure stays on with the extended luminance range; exposure is set per room with post-process volumes.
- **Open:** mirrors. Software Lumen reflections don't show characters that are off-screen, so the hero mirrors (Ch3 old face, Ch4 reveal, bathroom) need a dedicated technique. Decide at M5.

## D-007 — Source control workflow: Git + Git LFS through GitHub Desktop
*2026-09-26 · Accepted*
- **Why:** simplest reliable workflow for a solo developer who is new to Git. The editor's built-in revision-control connection stays **off**: it isn't needed solo and can slow the editor on large repositories.
- **Consequences:** commit at least daily. Close Unreal (or File > Save All) before committing. GitHub Git LFS includes 10 GB storage and 10 GB bandwidth per month on free accounts; beyond that it is metered (about $0.07 per GB per month of storage). Check usage monthly once content grows.
- **Cloud sessions:** Claude's cloud container has no Git LFS, so `.uasset`/`.umap` files are small pointer files there and must never be edited. Claude edits text only (Config `.ini`, docs, C++, `.uproject`).

## Open questions (tracked, not yet decided)
- **June's body (M3):** MetaHuman Creator still offers adult bodies only (as of 5.8). Options: a child-proportioned MetaHuman pack from Fab, or a custom child body. Decide at M3 with the trade-offs.
- **Windows PC access:** see D-002. Decide before M5.
- **Voice budget:** five actors on a tight budget. Temp voices until the script locks, then prioritise Mara and June.
- **Mirror technique:** see D-006. Decide at M5.
