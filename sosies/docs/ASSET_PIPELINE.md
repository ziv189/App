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

## Baked lighting (global illumination)

A browser can't compute bounced light in real time, so every room's lighting is **baked**: Blender's Cycles
renderer calculates the light from lamps, windows and the sky, including light bouncing between surfaces,
and stores it in a *lightmap* image. The game multiplies each surface's colour by it.

What the game expects from a baked room:

- a `.glb` whose static meshes have a **second UV map** (glTF `TEXCOORD_1`) laying them out on the lightmap;
- the lightmap next to it: a half-float **EXR** (DWAA compression, about 2.5 MB at 2048 px);
- a note in the `.glb` naming that file (the optimizer's `--lightmap` option writes it).

### Baking a room

1. Set up the room in **Blender 4.5 LTS** with its real lighting: lamps as Point/Spot/Area lights, a sky HDRI
   in the World for the windows, and emission on anything that glows. Check it with a Cycles render.
2. Give anything that must *not* get a lightmap (glass, lampshades, anything that moves) the custom property
   `sosies_nobake = 1`. If the room already has hand-made lightmap UVs, name that UV map `Lightmap` (2nd
   slot) and add `--keep-uvs` below; otherwise the script unwraps and packs them automatically.
3. Bake (on an NVIDIA graphics card add `--device OPTIX` for a much faster bake):

   ```bat
   blender --background --factory-startup --python tools\blender\bake_lightmaps.py -- ^
     --input room.blend --output room-baked.glb ^
     --lightmap public\assets\<area>\<room>-lightmap.exr --size 2048 --samples 128
   ```

4. Optimize and link the lightmap:

   ```bat
   npm run optimize -- room-baked.glb public\assets\<area>\<room>.glb --join --lightmap <room>-lightmap.exr
   ```

Models without lights of their own can take a **light rig** (JSON: world HDRI, sun, lamps placed on named
materials, emissive materials, no-bake materials) with `--rig`; `tools/blender/rigs/living-room.json` is the
test room's. `npm run assets:test-room` runs the whole chain for the test room.

### Budgets

| | Guideline |
| --- | --- |
| Lightmap size | 2048 px per room (about 1-2 cm per pixel); 4096 for large or hero spaces |
| File size | about 2.5 MB per 2048 px EXR |
| Graphics memory | 32 MB per 2048 px lightmap (half-float RGBA) |
| Bake time | test room (580k triangles): about 4 minutes at 2048 px / 64 samples on a 4-core CPU |

Moving things (doors, props, characters) are not baked; they get their light from the room's reflection
probe and real-time lights, which arrive with the characters milestone.
