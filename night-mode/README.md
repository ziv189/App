# NIGHT MODE

*One night house-sitting a Victorian lake house run by a friendly AI. At 10 PM it switches to Night Mode.*

A first-person horror story for desktop browsers (Chrome, Edge, Firefox), about 30 minutes long, with three
endings. Written, designed and built by Claude (Anthropic) in one session: story, code, levels, lighting,
voices, music and sound, all generated or assembled from free assets. Built with TypeScript and Three.js,
no game engine.

> **Hale House, Lake Ellery, Minnesota. January 14.** You're Alex, a student who house-sits through an app.
> The owner, Dana, left you a list of chores, a door code, and a note about the house's assistant: *"Wren will
> look after you. She gets lonely at night. Please don't go down to the lake."*

---

## Play it

**In your browser:** open the link Claude gave you (a private claude.ai page) and click **New game**.
Use headphones. The first load downloads about 90 MB.

**From your own PC (Windows):**

1. Install **Node.js 24 LTS** from <https://nodejs.org> (default options).
2. Get the code: download [this ZIP](https://github.com/ziv189/App/archive/refs/heads/claude/laughing-albattani-ns6xsm.zip)
   and unzip it somewhere outside OneDrive (for example `C:\Games`), or `git clone` the repo and check out the
   branch `claude/laughing-albattani-ns6xsm`.
3. Open the `night-mode` folder and double-click **`START-NIGHT-MODE.bat`**. The first run installs the tools
   (a minute or two); then the game opens in your browser. Keep the black window open while you play.

On macOS/Linux: `cd night-mode && npm install && npm run dev`.

## Controls

| | Keyboard and mouse | Controller |
| --- | --- | --- |
| Look / move | Mouse / WASD | Sticks |
| Use, read, open | **E** or left click | A |
| Phone (messages, booking, notes) | **Tab** | Y |
| Phone flashlight | **F** | X |
| Crouch | **C** | B |
| Pause, settings | **Esc** | Start |

Settings: brightness, volume, mouse sensitivity, field of view, subtitles, head bob, graphics quality.

## The story (no spoilers)

The prologue starts outside in the snow. Chapter 1 is a gentle tour of the house and its chores. At ten o'clock
Wren switches the house to Night Mode, and the rest of the night is about finding out who else lives here, what
happened to the family, and why the last house-sitter never checked out. There are three endings; the title
screen counts the ones you've found, and finished chapters can be replayed from **Chapters**.

The full design document (**spoilers**) is in [docs/STORY.md](docs/STORY.md).

## How it was made

- **Engine** (`src/`): Three.js WebGL2 renderer with post-processing (AgX tone mapping, bloom, N8AO ambient
  occlusion, film grain), Rapier physics for the first-person controller, a WebAudio engine with 3D sound and
  room reverb, and a small story runtime (`src/story/`) that the five chapters are written in.
- **Rooms**: each room is a separate scene with light baked in Blender/Cycles in two states (lamps on, and
  moonlight only) that the game blends between. See [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md).
- **People**: Microsoft Rocketbox avatars with lip-sync driven by the voice files' phoneme timings.
- **Voices**: Kokoro text-to-speech. Wren's voice is synthetic on purpose; that's part of the story.
- **Credits**: in the game (title screen → Credits) and in `public/assets/audio/sfx/CREDITS.md`.

## For developers

```bash
npm install
npm run dev          # local game with hot reload (add ?debug for window.nm: nm.jump('ch3') etc.)
npm test             # unit tests
npm run typecheck
npm run build        # production build in dist/
npm run build:artifact   # the hosted build (dist-artifact/)
```
