# Asset pipeline

How 3D files get from a source (Blender, a store, a scan) into the game. This grows with each milestone; the
Blender export/bake scripts arrive with the first real SOSIES location.

## Rules for every model

- **Format:** glTF 2.0 binary (`.glb`).
- **Scale:** 1 unit = 1 metre, real-world sizes (doors about 2.0–2.1 m, Daniel 1.80 m). Apply all transforms
  in Blender (`Ctrl+A → All Transforms`) before exporting.
- **Up axis:** glTF is Y-up. Blender is Z-up; its glTF exporter converts automatically (keep **+Y Up** ticked).
- **Every asset is logged** with its source, license, author, format and budget before it goes into the game.

## Names the game reads

| Name in the .glb | Meaning |
| --- | --- |
| `COL_<anything>` | Invisible collision mesh. Use a few simple boxes/planes that hug the floors, walls, stairs and big furniture. Much smoother to walk along than the detailed visual mesh. (The tech-test room has no `COL_` meshes, so Daniel collides with every visible surface, down to the radiator fins.) |
| `SPAWN_Player` | An Empty marking where Daniel starts. He faces along the Empty's **+Y** arrow in Blender. |
| Blender custom property `collider = true` | Same as the `COL_` prefix (export with *Include → Custom Properties*). |

A file with no `COL_` meshes falls back to colliding with every visible, opaque surface (alpha-cut foliage and
chains are skipped). That's fine for quick tests only.

## Blender export settings (File → Export → glTF 2.0)

- Format: **glTF Binary (.glb)**
- Include: *Custom Properties* ✓, *Punctual Lights* ✓ if the file has lights
- Transform: *+Y Up* ✓
- Mesh: *Apply Modifiers* ✓, *UVs* ✓, *Normals* ✓
- Compression: **off**, because our optimizer does it (next section)

## Optimizing a file for the game

```powershell
npm run optimize -- path\to\raw-export.glb public\assets\<area>\<name>.glb
```

What it does (glTF-Transform): removes duplicates and unused data, instances repeated meshes, welds vertices,
resizes textures (max 2048 px by default), converts them to WebP (normal maps at high quality), and compresses
geometry with meshopt. Then it prints a **budget report**:

```
  file:        living-room.glb  5.7 MB
  triangles:   580,631
  meshes:      37  (~37 draw calls before culling)
  materials:   37
  textures:    16  (largest 1280x1920, est. GPU memory 72.2 MB)
```

Options: `--max-texture 1024`, `--max-normal 1024`, `--quality 80`, `--join` (static scenery only: merges meshes
that share a material, so they can no longer be moved or hidden individually), `--no-meshopt`, `--report-only`
(just print the report for a file), `--verbose`.

**GPU memory matters more than file size.** WebP makes files small, but each texture is unpacked to full size in
graphics memory: the test room's 16 small textures already take about 72 MB, and a real SOSIES room with
characters will have many more, larger ones. For characters and rooms we'll switch textures to
**KTX2** (GPU-compressed, typically 4–8× less graphics memory). The game can already load KTX2, Draco and meshopt
files; the optimizer gains a KTX2 mode in the first real-asset milestone.
