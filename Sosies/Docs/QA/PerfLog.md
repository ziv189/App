# SOSIES — Performance log

Targets from the brief (Windows, DirectX 12):
- **60 fps at 1440p High** on an RTX 3060-class GPU
- **60 fps at 1080p Medium** on a GTX 1660 Super-class GPU
- **Never below 30 fps** at minimum spec

Every milestone gets at least one row, measured with `stat fps`, `stat unit`, `stat gpu` and one Unreal Insights capture.
Mac rows are **sanity checks only**; the targets above can only be proven on Windows hardware (see `Docs/Decisions.md` D-002).

## How to measure (Standalone Game)
1. Plug the Mac into power; set Low Power Mode to Never while charging; close other heavy apps.
2. In the editor: the ⋮ button next to Play ▶ > **Standalone Game**.
3. In the game window press the backtick key (`, left of 1) and enter one command at a time:
   `r.SetRes 1920x1080w` · `r.VSync 0` · `stat fps` · `stat unit` · `scalability 2`
4. Walk the busiest view for 30 s. Note FPS and the Frame / Game / Draw / GPU times (ms).
5. Repeat with `scalability 3` (Epic). Then `stat gpu`: note the three biggest passes.

## Log
| Date | Milestone | Machine | Build | Map | Resolution | Scalability | Avg FPS | Frame ms | Game ms | Draw ms | GPU ms | Top GPU passes | Insights trace | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | M0 | MacBook Pro M3 32 GB | Standalone | Template map | 1920×1080 | High | | | | | | | | |
| | M0 | MacBook Pro M3 32 GB | Standalone | Template map | 1920×1080 | Epic | | | | | | | | |
