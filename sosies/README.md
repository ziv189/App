# SOSIES

First-person psychological horror for desktop browsers (Chrome, Edge, Firefox), built with
TypeScript + Three.js and no game engine. Later it can be wrapped as a desktop app for Steam.

**Current state: Milestone 0 (foundation).** This is a walkable tech test: the engine, controls, physics,
lighting pipeline and asset pipeline running in *Sponza*, a standard 3D test scene. Sponza is not SOSIES
content and is never shipped.

---

## 1. One-time setup (Windows)

1. **Node.js 24 LTS**: download the Windows installer from <https://nodejs.org> and run it (defaults are fine).
2. **Git**: <https://git-scm.com/download/win> (defaults are fine).
3. Open **PowerShell** and get the code:

   ```powershell
   git clone https://github.com/ziv189/App.git
   cd App
   git checkout claude/laughing-albattani-ns6xsm
   cd sosies
   npm install
   ```

4. Download the tech-test assets (about 55 MB download, 30 MB after optimizing; takes a minute):

   ```powershell
   npm run assets:test
   ```

## 2. Run it

```powershell
npm run dev
```

Open <http://localhost:5173> in Chrome, Edge or Firefox. Stop the server with `Ctrl + C` in PowerShell.

If you already have the folder, update it with `git pull` and then run `npm install` again.

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
| `npm run dev` | Starts the game at <http://localhost:5173>. Code changes reload automatically. |
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
  tools/                asset scripts (download + optimize)
  tests/                unit tests
  docs/                 asset pipeline guide
  public/assets/        game assets (tech-test files are downloaded here, not committed)
```

The game runs physics at a fixed 60 steps per second and interpolates the camera between steps, so movement
feels the same on 60, 144 or 240 Hz monitors.

## 6. Troubleshooting

- **"Missing file" screen**: run `npm run assets:test`, then reload the page.
- **Low FPS on a laptop**: the browser may be using the integrated GPU. In Windows *Settings → System → Display →
  Graphics*, set your browser to *High performance*, and check the browser's hardware acceleration setting is on.
  Lower *Graphics quality* in the pause menu to compare.
- **Blank or black screen**: open the browser console (`F12` → *Console*) and send me anything shown in red.
- **`npm run assets:test` fails behind a company proxy**: set `NODE_USE_ENV_PROXY=1` along with your usual
  `HTTPS_PROXY`, then run it again.

## 7. Credits (tech test only)

- Sponza © Crytek, modified by Morgan McGuire, PBR textures by Alexandre Pestana, glTF by the Khronos Group
  (CRYENGINE Limited License Agreement; local testing only, not redistributed).
- *Kloppenheim 01 (Pure Sky)* HDRI by Greg Zaal and Jarod Guest, [Poly Haven](https://polyhaven.com) (CC0).
