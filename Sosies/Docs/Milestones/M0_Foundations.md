# M0 — Foundations

**Goal:** Unreal Engine 5.8 installed on your Mac; the SOSIES project created from the First Person template inside this repository; required plugins on; rendering baseline set; folder structure in place; the template running at 60 fps; everything committed and pushed with Git LFS.

**Done when:** every box in the [test checklist](#test-checklist) at the bottom is ticked and you've sent me the numbers.

**Time:** about 3–5 hours, mostly downloads (Unreal is tens of GB, Xcode about 3 GB) and the first shader compile. You can do Parts 3–5 while Unreal downloads.

**How to read the steps**
- `A > B > C` means click A, then B, then C.
- `code like this` means type exactly this.
- ⚠️ means stop and tell me if what you see is different. Don't improvise around it.
- On a Mac, Unreal's menus (File, Edit, Window, ...) are either in the menu bar at the very top of the screen or at the top-left of the Unreal window; both are the same menus.

---

## Part 1 — Check your Mac (10 min)

1. Apple menu  > **About This Mac**. Write down **Chip** (e.g. Apple M3 Pro), **Memory** and **macOS** (name and version).
2. Apple menu  > **System Settings > General > Storage**. You need **at least 150 GB free** (250 GB+ is comfortable once MetaHumans arrive). ⚠️ If you have less, tell me: we'll put Unreal and the project on an external USB-C/Thunderbolt SSD.
3. Apple menu  > **System Settings > [your name] > iCloud > Drive** (called *iCloud Drive* on some versions) > **Desktop & Documents Folders**. If it's ON, never put Unreal projects on your Desktop or in Documents: iCloud would try to sync tens of GB and can corrupt files mid-save. We'll use a `Developer` folder in your home folder, which iCloud doesn't sync.
4. Open Epic's page **macOS Development Requirements for Unreal Engine** (version picker: 5.8):
   https://dev.epicgames.com/documentation/unreal-engine/macos-development-requirements-for-unreal-engine
   Note the **Xcode** version it recommends and the macOS versions it supports. When I checked, it listed **Xcode 26.1.1** and warned that **Xcode 26.4 is not compatible**. Use whatever the page says when you read it.
   ⚠️ If your macOS is newer than the newest one on that page, stop and tell me before installing anything.
5. From now on: don't update macOS or Xcode without checking with me first. Unreal on Mac is sensitive to exact Xcode versions.

## Part 2 — Start the Unreal Engine 5.8 download (10 min of clicks, then it downloads)

1. Go to https://store.epicgames.com/download and download the Epic Games Launcher for macOS.
2. Open the downloaded `.dmg` and drag **Epic Games Launcher** onto **Applications**.
3. Open **Applications > Epic Games Launcher** (if macOS warns it was downloaded from the internet, click **Open**) and sign in, or create a free Epic account.
4. Left sidebar: **Unreal Engine**. Top tabs: **Library**.
5. Next to **ENGINE VERSIONS**, click the **+** button. A new engine tile appears.
6. Click the version number on that tile and choose the **highest 5.8.x** in the list (5.8.3 or later). Click **Install**.
7. Install location: keep the default **/Users/Shared/Epic Games** (or pick your external SSD if Part 1 showed less than 150 GB free). Click **Install**.
8. As soon as the tile's **▾** menu (next to the Install/Launch button) offers **Options**, open it and set:

   | Option | Setting | Why |
   |---|---|---|
   | Core Components | ✅ (always on) | The engine itself |
   | Starter Content | ☐ | We don't use it |
   | Templates and Feature Packs | ✅ | Needed for the First Person template |
   | Engine Source | ☐ | Not needed |
   | **MetaHuman Creator Core Data** | ✅ | The MetaHuman Creator plugin won't work without it |
   | Target platforms (iOS, Android, ...) | ☐ all | We don't ship on them; saves space |

   Click **Apply**. Leave the download running and go to Part 3.

## Part 3 — Xcode and the Metal Toolchain (30–60 min, mostly download)

Why: on a Mac, Unreal compiles its graphics shaders with Apple's Metal tools, which come with Xcode. This is needed even though we're making a Blueprint project.

1. Open **Terminal** (press `Cmd+Space`, type `Terminal`, press Return).
2. If you already have Xcode, type `xcodebuild -version` and press Return. If it prints the version from Part 1 step 4, skip to step 7.
3. Go to https://developer.apple.com/download/all/ and sign in with your Apple ID (free; accept the developer agreement if asked).
4. In the search box type the Xcode version from Part 1 (e.g. `Xcode 26.1.1`) and download its `.xip` file (about 3 GB).
5. Double-click the `.xip` in Downloads and wait until **Xcode.app** appears. Drag it into **Applications**.
   (If an older or newer Xcode.app is already there, first rename the new one to `Xcode-26.1.1.app`, then use `/Applications/Xcode-26.1.1.app` instead of `/Applications/Xcode.app` in the commands below.)
6. Open Xcode once from Applications. If it asks which platforms to install, keep **macOS** only and continue. When it's done, quit Xcode (`Cmd+Q`).
7. In Terminal, run these one at a time. `sudo` asks for your Mac password; nothing appears while you type, which is normal.
   ```
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -runFirstLaunch
   xcodebuild -downloadComponent MetalToolchain
   ```
8. Check:
   ```
   xcodebuild -version
   xcrun -sdk macosx metal --version
   ```
   ✅ The first prints the Xcode version from Part 1. The second prints a line starting with `Apple metal version`.
   ⚠️ If it says `unable to find utility "metal"`, run the `downloadComponent` line again, then re-check.

## Part 4 — Git LFS (10 min)

Why: Git on its own is bad at big binary files (every `.uasset` and `.umap` is binary). Git LFS stores them separately. Your repository is already configured for LFS (`Sosies/.gitattributes`); this installs the tool that makes it work. Turning it on *before* the first commit matters, because fixing it afterwards means rewriting history.

1. In Terminal, install Homebrew (the standard Mac package manager):
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Press Return when asked, and enter your password. It takes a few minutes.
2. When it finishes, it prints "Next steps". Run these three lines (the same ones it shows):
   ```
   echo >> ~/.zprofile
   echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
   eval "$(/opt/homebrew/bin/brew shellenv)"
   ```
3. Install and switch on Git LFS:
   ```
   brew install git-lfs
   git lfs install
   git lfs version
   ```
   ✅ `git lfs install` prints `Git LFS initialized.` and `git lfs version` prints `git-lfs/3.x.x ...`.

## Part 5 — GitHub Desktop, clone, branch (15 min)

1. Go to https://desktop.github.com, download GitHub Desktop for macOS, unzip it, and drag **GitHub Desktop** into **Applications**. Open it and choose **Sign in to GitHub.com** (account `ziv189`). If it asks you to configure Git, keep your name and email and click **Finish**.
2. In Finder: **Go > Home**, then **File > New Folder**, and name it `Developer`. macOS shows it with a hammer icon; that's normal.
3. GitHub Desktop: **File > Clone Repository… > GitHub.com** tab > select **ziv189/App** > **Local Path: Choose…** > select the **Developer** folder, so the field reads `/Users/<you>/Developer/App` > **Clone**.
4. If a dialog offers to **Initialize Git LFS**, click it.
5. Top bar: **Current Branch** > type `sosies` in the filter > select **claude/sosies-master-build-1r2wpo**.
6. Check in Finder: `Developer/App/Sosies` contains a `Content` folder (with `Sosies` inside it) and a `Docs` folder. Press `Cmd+Shift+.` to show hidden files: `.gitattributes` and `.gitignore` are there too. Press it again to hide them.

## Part 6 — Create the SOSIES project (30–60 min, including the first shader compile)

Wait until the Unreal download from Part 2 has finished (the tile shows **Launch**).

1. Epic Games Launcher > **Unreal Engine > Library** > on the 5.8 tile click **Launch**. The **Unreal Project Browser** opens. If macOS asks whether Unreal may access folders or find devices on your local network, click **Allow**.
2. Left column: **GAMES**. In the template list click **First Person**.
3. Right panel (project defaults):

   | Setting | Value | Why |
   |---|---|---|
   | Blueprint / C++ | **Blueprint** | Blueprints first (brief §12). C++ gets added later only where it's needed |
   | Variant | **None** | We build our own player in M1; the Survival Horror and Arena Shooter variants add content we'd delete |
   | Target Platform | **Desktop** | PC game |
   | Quality Preset | **Maximum** | Turns on Lumen, Virtual Shadow Maps, TSR, etc. |
   | Starter Content | **unchecked** | Keeps the project clean |
   | Raytracing (if shown) | **unchecked** | Software Lumen baseline, see `Docs/Decisions.md` D-006 |

4. Bottom of the window:
   - **Project Location:** click the folder icon, select `/Users/<you>/Developer/App`, click **Open**.
   - **Project Name:** `Sosies` (capital S, no spaces).
5. Click **Create**.
   ⚠️ If Create is greyed out with a message about the name or folder already existing: change Project Location to a new folder `/Users/<you>/Developer/SosiesTemp`, click **Create**, and when the editor opens, quit it (**Unreal Editor > Quit**). Then run this in Terminal:
   ```
   ditto ~/Developer/SosiesTemp/Sosies ~/Developer/App/Sosies && rm -rf ~/Developer/SosiesTemp
   ```
   Finally, double-click `~/Developer/App/Sosies/Sosies.uproject` to open it.
6. The editor opens on the template's level and compiles shaders. The bottom-right corner shows *Compiling Shaders* with a count. The first time can take 15–60 minutes. Let it finish before judging anything, including the frame rate.

## Part 7 — Enable plugins (10 min + restart)

**Edit > Plugins**. Use the search box at the top of the Plugins window. For each row, tick **Enabled**. If a dialog warns about Beta/Experimental status or asks to enable dependencies (e.g. *MetaHuman Core Tech*), click **Yes**.

| Type in search | Plugin to enable | Used for |
|---|---|---|
| `MetaHuman Creator` | **MetaHuman Creator** | Building Mara, June, Adler inside the editor (M3) |
| `MetaHuman Animator` | **MetaHuman Animator** | iPhone depth capture → facial animation and lip sync (M3) |
| `Groom` | **Groom** | Strand hair on MetaHumans |
| `Alembic Groom` | **Alembic Groom Importer** | Importing groom hair |
| `Chaos Cloth` | **Chaos Cloth** | Cloth simulation: coat, scarf, skirt |
| `MetaSound` | **MetaSound** (usually already on) | June's Song layers (M2) |
| `Enhanced Input` | **Enhanced Input** (already on) | Keyboard, mouse and gamepad input |

Then click **Restart Now** in the banner at the bottom-right.

- After the restart, if a notification says MetaHumans need extra project settings, click its button to apply them and **write down what it said**.
- Names can differ slightly between engine versions. ⚠️ If one isn't found, search `MetaHuman` and send me a screenshot of the list.

## Part 8 — Project settings (20 min)

**Edit > Project Settings**. The left column has sections (Project, Game, Engine, Editor, Platforms, Plugins); the search box at the top finds any setting by name. Most of these are already the Maximum-preset default, so you're mainly **checking**. Only Motion Blur and Lens Flares should need a change.

**Project > Description**

| Setting | Value |
|---|---|
| Project Displayed Title | `SOSIES` |
| Company Name | your name or studio name |
| Copyright Notice | `© 2026 <your name>. All rights reserved.` |
| Project Version | `0.0.1` |

**Engine > Rendering**

| Section > Setting | Value | Note |
|---|---|---|
| Global Illumination > Dynamic Global Illumination Method | **Lumen** | Art direction §9 |
| Reflections > Reflection Method | **Lumen** | Art direction §9 |
| Shadows > Shadow Map Method | **Virtual Shadow Maps** | Art direction §9 |
| Software Ray Tracing > Generate Mesh Distance Fields | **✅ on** | Required by software Lumen (restart if you changed it) |
| Hardware Ray Tracing > Support Hardware Ray Tracing | **☐ off** | For now, see D-006 |
| Direct Lighting > MegaLights | **☐ off** | Evaluate at M5 |
| Default Settings > Anti-Aliasing Method | **Temporal Super-Resolution (TSR)** | Brief §12 |
| Default Settings > Motion Blur | **☐ off** | Art direction: off by default (the settings menu will offer it) |
| Default Settings > Lens Flares (Image based) | **☐ off** | A camera artefact; we'll add lens effects only to the camcorder view |
| Default Settings > Auto Exposure | **✅ on** | Exposure is set per room with post-process volumes later |
| Default Settings > Extend default luminance range in Auto Exposure settings | **✅ on** | Lets us set exposure in real EV100 values |

Nanite needs no project switch: it's on by default and enabled per mesh. **Substrate** materials are on by default in 5.8; leave them on.

**Engine > General Settings > Framerate**

| Setting | Value |
|---|---|
| Smooth Frame Rate | **☐ off** |
| Use Fixed Frame Rate | **☐ off** |

**Engine > Input > Default Classes**

| Setting | Value |
|---|---|
| Default Player Input Class | **EnhancedPlayerInput** |
| Default Input Component Class | **EnhancedInputComponent** |

**Platforms > Mac**
- Find **Targeted RHIs** (usually under Rendering) and make sure the **Metal SM6** entry is ticked. The label varies by version, e.g. *Metal Desktop Renderer (SM6)*. SM6 is what Nanite, Lumen and Virtual Shadow Maps need on a Mac. If SM5 is also ticked, leave it.

**Windows (DirectX 12, SM6):** the Mac editor can't show Windows platform settings. The template writes DX12 into `Config/DefaultEngine.ini`; I'll verify that file myself when you push.

Close Project Settings. If the editor asks to restart, restart.

## Part 9 — Folder structure (5 min)

1. Click **Content Drawer** at the bottom-left of the editor. For a permanent panel, use **Window > Content Browser > Content Browser 1**.
2. In the folder tree: **All > Content > Sosies** should contain: `Audio, Characters, Cinematics, Data, Environments, Maps, Props, Systems, UI`.
   If you don't see them: the **Settings** button at the top-right of the Content Browser > tick **Show Empty Folders**.
3. The rule from now on: everything we make goes under `Content/Sosies/...` with the prefixes `BP_ WBP_ M_ MI_ T_ SM_ SK_ ABP_ MS_ DT_ LS_`. The template's own folders stay untouched for now.

## Part 10 — Performance check and first Unreal Insights capture (20 min)

**Prepare:** plug the Mac into power; Apple menu  > **System Settings > Battery** > Low Power Mode: **Never** (or at least not on power adapter); quit other heavy apps.

**Frame rate (Standalone Game):**
1. In the main toolbar, click the **⋮** button right next to **Play ▶** > **Standalone Game**. A separate game window opens (it may compile a few more shaders first).
2. Click inside the game window. Press the **backtick** key (`` ` ``, left of the 1 key; on some keyboards it's next to the left Shift) to open the console. Type each line and press Return:
   ```
   r.SetRes 1920x1080w
   r.VSync 0
   stat fps
   stat unit
   scalability 2
   ```
3. Walk around with WASD and the mouse for 30 seconds, looking at the busiest view. Write down **FPS** and the **Frame, Game, Draw, GPU** times (ms).
4. Type `scalability 3` (Epic) and write down the same numbers again.
5. Type `stat gpu` and write down the three biggest lines. On Mac this view may show fewer details than on Windows; that's fine.
6. Press **Esc** to close the game.

✅ **Pass:** 60 fps or more at High (`scalability 2`) at 1920×1080. (This proves the pipeline works; the real targets get measured on Windows later.)

**Unreal Insights (first look):**
1. At the bottom-right of the editor, open the **Trace** menu and click **Start Trace** (default channels are fine).
2. Click **Play ▶**, walk around for 10 seconds, and press **Esc**.
3. **Trace > Stop Trace**.
4. **Trace > Unreal Insights** (it may say *Open Unreal Insights*). The Session Browser opens. Double-click the newest trace. **Timing Insights** shows one bar per frame at the top. Hover over a few bars to see frame times, and take a screenshot.
   ⚠️ If there's no Trace menu, open `/Users/Shared/Epic Games/UE_5.8/Engine/Binaries/Mac/UnrealInsights.app` directly and send me a screenshot of what you see.

## Part 11 — Commit and push (15 min)

1. In Unreal: **File > Save All**, then quit (**Unreal Editor > Quit Unreal Editor**, `Cmd+Q`).
2. GitHub Desktop, **Changes** tab: you'll see many new files under `Sosies/` (`Sosies.uproject`, `Config/...`, `Content/...`).
   ⚠️ Nothing from `Sosies/Saved`, `Sosies/Intermediate`, `Sosies/Binaries` or `Sosies/DerivedDataCache` may be in the list. If anything from those folders appears, stop and tell me.
3. Bottom-left **Summary:** `M0: create SOSIES project (UE 5.8 First Person template) and settings`. Click **Commit to claude/sosies-master-build-1r2wpo**.
4. Click **Push origin** (top bar). The first push uploads the LFS files and can take a few minutes.
5. Verify LFS, both ways:
   - Terminal:
     ```
     cd ~/Developer/App && git lfs ls-files | head -5
     ```
     ✅ lists `.uasset` / `.umap` files.
   - Browser: https://github.com/ziv189/App/tree/claude/sosies-master-build-1r2wpo/Sosies/Content. Open any `.uasset`; ✅ the page says **Stored with Git LFS**.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Xcode's metal shader compiler was not found" / Unreal quits on launch | Metal Toolchain missing, or the wrong Xcode is selected | Part 3 steps 7–8 again. `xcode-select -p` must print the Xcode you installed |
| Editor crashes right after the splash screen | Unsupported Xcode or macOS version | Compare with Epic's 5.8 page (Part 1 step 4). Send me `~/Developer/App/Sosies/Saved/Logs/Sosies.log` |
| No **First Person** template in the Project Browser | *Templates and Feature Packs* not installed | Launcher > 5.8 tile ▾ > Options > tick it > Apply |
| MetaHuman Creator warns about missing Core Data | *MetaHuman Creator Core Data* not installed | Launcher > 5.8 tile ▾ > Options > tick it > Apply, then restart the editor |
| Push rejected: "file exceeds 100 MB" or "not an LFS pointer" | LFS wasn't active when you committed | **Stop. Don't force anything.** Tell me, and we'll fix the commit safely |
| Frame rate far below 60 | Low Power Mode, battery power, shaders still compiling, or other heavy apps | Part 10 "Prepare"; wait for *Compiling Shaders* to finish; measure again |
| Unreal is very slow in general | The Mac is swapping memory | Quit browsers and other apps; tell me your chip and memory |

## Test checklist

Tick each one and send me the results (numbers, screenshots, anything marked ⚠️).

- [ ] **Mac:** chip, memory, macOS version and free space written down; free space is at least 150 GB.
- [ ] **Xcode:** `xcodebuild -version` shows the version from Epic's 5.8 page, and `xcrun -sdk macosx metal --version` prints `Apple metal version ...`.
- [ ] **Git LFS:** `git lfs version` prints a version.
- [ ] **Engine:** the Launcher shows 5.8.x installed; ▾ > Options shows **MetaHuman Creator Core Data** and **Templates and Feature Packs** ticked. **Help > About Unreal Editor** shows 5.8.x.
- [ ] **Project:** `~/Developer/App/Sosies/Sosies.uproject` opens with no error dialogs, and **Window > Output Log** shows no red errors after startup (warnings are fine; send me any red lines).
- [ ] **Plugins:** Edit > Plugins shows MetaHuman Creator, MetaHuman Animator, Groom, Alembic Groom Importer, Chaos Cloth, MetaSound and Enhanced Input all **Enabled**.
- [ ] **Settings:** every value in Part 8 matches (screenshots of Engine > Rendering > Default Settings and the Mac Targeted RHIs are enough).
- [ ] **Folders:** Content Browser shows `Content/Sosies/` with the 9 subfolders.
- [ ] **Performance:** Standalone at 1920×1080: FPS and Frame/Game/Draw/GPU at **High** and **Epic**, plus the top 3 `stat gpu` lines. ✅ 60+ fps at High.
- [ ] **Insights:** a trace opens in Timing Insights (screenshot).
- [ ] **Commit:** pushed to `claude/sosies-master-build-1r2wpo`; `git lfs ls-files` lists assets; GitHub shows **Stored with Git LFS** on a `.uasset`; nothing from Saved/Intermediate/Binaries/DerivedDataCache was committed.

When you've pushed, I'll read your `Config/*.ini` files, verify every setting (including the Windows DX12/SM6 entries), log your numbers in `Docs/QA/PerfLog.md`, and then start M1.
