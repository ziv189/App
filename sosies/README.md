# SOSIES

First-person psychological horror for desktop browsers (Chrome, Edge, Firefox), built with
TypeScript + Three.js and no game engine. Later it can be wrapped as a desktop app for Steam.

**Current state: Milestone 0 (foundation).** This is a walkable tech test: the engine, controls, physics,
lighting pipeline and asset pipeline running in *Sponza*, a standard 3D test scene. Sponza is not SOSIES
content and is never shipped.

---

## 1. One-time setup (Windows)

1. Install **Node.js 24 LTS** from <https://nodejs.org> (Windows installer, default options).
2. Install **Git** from <https://git-scm.com/download/win> (default options).
3. Get the code. Open **Command Prompt** (Start menu → type `cmd`) and run these lines one at a time:

   ```bat
   cd %USERPROFILE%
   git clone https://github.com/ziv189/App.git
   cd App
   git checkout claude/laughing-albattani-ns6xsm
   ```

   The game is now in `C:\Users\<you>\App\sosies`. Already cloned it before? Skip this step: run `git pull`
   inside your `App` folder instead. (No Git? Download
   [this ZIP](https://github.com/ziv189/App/archive/refs/heads/claude/laughing-albattani-ns6xsm.zip) and unzip it
   somewhere outside OneDrive, e.g. `C:\Games`.)

## 2. Run it

**Double-click `START-SOSIES.bat`** in the `sosies` folder. It:

1. checks Node.js is installed and new enough,
2. installs or updates the game's tools (`npm install`),
3. downloads the tech-test scene the first time (about 55 MB),
4. starts the game server and **opens the game in your browser**.

Keep its black window open while you play; close it to stop the game. If anything fails, the window stays open
with the error: copy all its text and send it to me. (If Windows asks whether to run it, choose *More info → Run
anyway*; it's a plain text script you can read in Notepad.)

To get my latest changes later: in Command Prompt, `cd %USERPROFILE%\App` then `git pull`, then double-click
`START-SOSIES.bat` again.

<details>
<summary>Manual alternative (Command Prompt)</summary>

```bat
cd %USERPROFILE%\App\sosies
npm install
npm run assets:test
npm run dev
```

</details>

### If it doesn't load

| What you see | What it means / what to do |
| --- | --- |
| The START-SOSIES window closes instantly or shows red `npm error` lines | Copy the whole window's text and send it to me. |
| PowerShell: *"running scripts is disabled on this system"* | Use `START-SOSIES.bat` or Command Prompt instead of PowerShell. |
| Browser: *"This site can't be reached"* | The game server isn't running. Start `START-SOSIES.bat` and keep its window open. |
| *"This page was opened straight from the folder"* | You opened `index.html` directly. Use `START-SOSIES.bat`; it opens the right address. |
| Stuck on the SOSIES loading screen | The line under the bar names the step it's on; after 45 s a hint appears. Send me a screenshot of it plus the Console tab (`F12` → *Console*). |
| *"Missing file"* screen | The test scene isn't downloaded. `START-SOSIES.bat` does it automatically, or run `npm run assets:test`. |
| *"SOSIES needs WebGL 2"* | Turn on the browser's hardware acceleration and update your graphics driver. |
| Any other error screen | Click **Copy these details** and paste them to me. |
| Errors mentioning `EPERM` or `OneDrive` | Move the project out of OneDrive (e.g. to `C:\Games`) and try again. |

## 3. Controls

| Action | Mouse & keyboard | Controller |
| --- | --- | --- |
| Move | `W` `A` `S` `D` or arrow keys | Left stick |
| Look | Mouse | Right stick |
| Run | Hold `Shift` | Click `L3` (stops when you let go of the stick) |
| Crouch | `C` (toggle) | `B` (toggle) |
| Pause / settings | `Esc` | `Start` |
| Debug panel | `` ` `` (the key left of `1`) | — |

Browser notes:

- The browser only lets a page capture the mouse after a click, so the game starts with **Click to begin**.
  `Esc` always gives the mouse back to you (the browser enforces this) and opens the pause menu.
- Controllers appear after you **press a button once** (browser privacy rule).
- Crouch is not on `Ctrl`, because `Ctrl+W` closes the browser tab.

## 4. Commands

| Command | What it does |
| --- | --- |
| `START-SOSIES.bat` | Double-click: installs, downloads test assets if needed, starts the game and opens the browser. |
| `npm run dev` | Starts the game and opens it at <http://localhost:5173>. Code changes reload automatically. |
| `npm run assets:test` | Downloads and optimizes the tech-test assets (add `-- --force` to redo). |
| `npm run optimize -- in.glb out.glb` | Optimizes any glTF/GLB for the web and prints its budget report. See [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md). |
| `npm test` | Runs the unit tests. |
| `npm run typecheck` | Checks the TypeScript for errors. |
| `npm run build` | Builds the release version into `dist/`. |
| `npm run preview` | Serves the `dist/` build at <http://localhost:4173>. |

## 5. How it's built

| Part | Library | Why |
| --- | --- | --- |
| Rendering | [three.js](https://threejs.org) r186, WebGL 2 | The standard 3D library for the web; PBR materials, glTF, shadows. |
| Post-processing | [postprocessing](https://github.com/pmndrs/postprocessing) + [N8AO](https://github.com/N8python/n8ao) | Proven effect stack: ambient occlusion, bloom, AgX tone mapping, SMAA, vignette, grain. |
| Physics & movement | [Rapier](https://rapier.rs) | Its character controller handles walls, slopes, stairs and staying on the floor. |
| Assets | glTF 2.0 (`.glb`), [glTF-Transform](https://gltf-transform.dev), meshopt, Draco, KTX2 | Industry-standard 3D format and optimizer. |
| Tooling | Vite, TypeScript, Vitest | Fast dev server, type safety, unit tests. |
| Debug | [stats-gl](https://github.com/RenaudRohlinger/stats-gl), [lil-gui](https://lil-gui.georgealways.com) | FPS/CPU/GPU graphs and live tuning sliders. |

```
sosies/
  START-SOSIES.bat      one-click start on Windows
  index.html            page shell: canvas + menus
  src/
    main.ts             entry: checks WebGL 2, loads the engine
    core/               Game (state + main loop), fixed-timestep loop, settings
    render/             renderer, post-processing, quality presets, sky lighting
    input/              keyboard, mouse (pointer lock) and controller input
    physics/            Rapier world + level collision
    player/             first-person controller (capsule, crouch, head bob, footsteps)
    assets/             glTF/HDR loading, level loading conventions
    levels/             level definitions (techTest.ts)
    ui/                 menus and debug overlay
  tools/                asset scripts (download + optimize; shared code in tools/lib)
  tests/                unit tests
  docs/                 asset pipeline guide
  public/assets/        game assets (tech-test files are downloaded here, not committed)
```

The game runs physics at a fixed 60 steps per second and interpolates the camera between steps, so movement
feels the same on 60, 144 or 240 Hz monitors.

## 6. Performance tips

- **Low FPS on a laptop**: the browser may be using the integrated GPU. In Windows *Settings → System → Display →
  Graphics*, set your browser to *High performance*, and check the browser's hardware acceleration setting is on.
  Lower *Graphics quality* in the pause menu to compare.
- **`npm run assets:test` fails behind a company proxy**: set `NODE_USE_ENV_PROXY=1` along with your usual
  `HTTPS_PROXY`, then run it again.

## 7. Credits (tech test only)

- Sponza © Crytek, modified by Morgan McGuire, PBR textures by Alexandre Pestana, glTF by the Khronos Group
  (CRYENGINE Limited License Agreement; local testing only, not redistributed).
- *Kloppenheim 01 (Pure Sky)* HDRI by Greg Zaal and Jarod Guest, [Poly Haven](https://polyhaven.com) (CC0).
