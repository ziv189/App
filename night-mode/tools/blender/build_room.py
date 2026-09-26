"""
Builds one NIGHT MODE room: dresses it (tools/blender/rooms/<room>.py), generates collision, bakes one
lightmap per lighting state and exports the room for the game.

    blender --background --factory-startup --python tools/blender/build_room.py -- \
        --room hall [--size 2048] [--samples 64] [--no-bake] [--device CPU]

Outputs (see docs/ASSET_PIPELINE.md):
    assets-src/work/<room>-baked.glb        room for tools/build-rooms.mjs to optimize
    public/assets/rooms/<room>-<state>.exr  one half-float lightmap per lighting state
    assets-src/work/<room>-final.blend      the finished scene, for inspection
"""
import argparse
import importlib
import json
import math
import os
import sys
import time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bake_lightmaps as B  # noqa: E402  (lightmap UV packing, Cycles setup, denoised EXR output)
import nm_lib as L  # noqa: E402

WORK = os.path.join(L.ROOT, 'assets-src', 'work')
OUT = os.path.join(L.ROOT, 'public', 'assets', 'rooms')


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--room', required=True)
    p.add_argument('--size', type=int, default=0, help='lightmap size (default: the room decides)')
    p.add_argument('--samples', type=int, default=64)
    p.add_argument('--device', default='CPU')
    p.add_argument('--no-bake', action='store_true', help='skip baking (fast layout checks)')
    return p.parse_args(argv)


def is_marker(o):
    return o.type == 'EMPTY'


def classify():
    static, keep = [], []
    for o in L.mesh_objects():
        if o.name.startswith(('I_', 'COL_', 'EMITTER_')):
            continue
        if o.get('nm_dynamic') or o.get('nm_nobake') or o.get('sosies_nobake'):
            keep.append(o)
        else:
            static.append(o)
    return static, keep


def clean_attributes(objs):
    """Only what the game uses: one texture UV set (the lightmap set is added later, and must end up as
    the 2nd, TEXCOORD_1) and no vertex colours (three.js would multiply them into the materials)."""
    for o in objs:
        me = o.data
        for layer in list(me.uv_layers)[1:]:
            if layer.name != B.LIGHTMAP_UV:
                me.uv_layers.remove(layer)
        for attr in list(me.color_attributes):
            me.color_attributes.remove(attr)


def decimate_heavy(objs, threshold=12000):
    for o in objs:
        if o.get('nm_keep_detail'):
            continue
        n = L.tris(o)
        if n > threshold:
            target = int(min(40000, max(8000, n * 0.4)))
            after = L.decimate(o, target)
            L.log(f'decimated {o.name}: {n:,} -> {after:,} triangles')


def build_collision(static, extra=(), max_tris=60000):
    """One simplified collision mesh from the solid, player-sized parts of the room."""
    picks = []
    for o in list(static) + list(extra):
        if o.get('nm_nocollide'):
            continue
        lo, hi = L.world_bbox(o)
        size = hi - lo
        if max(size) < 0.35 and not o.get('nm_collide'):
            continue  # cups, books, small clutter: walking over them would feel bumpy
        if lo.z > 2.3 and max(size.x, size.y) < 3:
            continue  # chandeliers, shelves above head height
        picks.append(o)
    copies = []
    for o in picks:
        c = o.copy()
        c.data = o.data.copy()
        L.link(c)
        for m in list(c.modifiers):
            c.modifiers.remove(m)
        copies.append(c)
    if not copies:
        return None
    col = L.join(copies, 'COL_static')
    col.data.materials.clear()
    for layer in list(col.data.uv_layers):
        col.data.uv_layers.remove(layer)
    n = L.tris(col)
    if n > max_tris:
        L.decimate(col, max_tris)
    col['nm_nobake'] = 1
    L.log(f'collision: {len(picks)} objects -> {L.tris(col):,} triangles')
    return col


def split_small_parts(obj, max_area, name):
    """Moves loose parts smaller than max_area (m2) out of the lightmapped mesh: nails, hinges and small
    trim would cost more lightmap space in padding than they're worth; they're lit by reflections."""
    import bmesh
    L.select_only([obj])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.remove_doubles(threshold=0.0005, use_sharp_edge_from_normals=True)
    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.index_update()
    seen = set()
    for f in bm.faces:
        f.select = False
    count = 0
    for f in bm.faces:
        if f.index in seen:
            continue
        stack, part = [f], []
        while stack:
            g = stack.pop()
            if g.index in seen:
                continue
            seen.add(g.index)
            part.append(g)
            for e in g.edges:
                stack.extend(h for h in e.link_faces if h.index not in seen)
        if sum(x.calc_area() for x in part) < max_area:
            for g in part:
                g.select = True
            count += len(part)
    bmesh.update_edit_mesh(obj.data)
    if count:
        bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    details = [o for o in bpy.context.selected_objects if o is not obj]
    for o in details:
        o.name = name
        o['nm_nobake'] = 1
    L.log(f'{count} faces in small parts left out of the lightmap')


def apply_state(state, cfg):
    for o in bpy.context.scene.objects:
        if o.type == 'LIGHT':
            states = str(o.get('nm_states', 'on')).split(',')
            o.hide_render = state not in states
    for m in bpy.data.materials:
        if 'nm_emit_states' not in m:
            continue
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.use_nodes else None
        if b is None:
            continue
        on = state in str(m['nm_emit_states']).split(',')
        b.inputs['Emission Color'].default_value = (*L.srgb(m.get('nm_emit_color', '#ffd7a0')), 1)
        b.inputs['Emission Strength'].default_value = float(m.get('nm_emit_strength', 6.0)) if on else 0.0
    world = cfg.get('world', {}).get(state)
    if world:
        L.set_world(**world)
    L.log(f'state {state}: {sum(1 for o in bpy.context.scene.objects if o.type == "LIGHT" and not o.hide_render)} lights')


def cap_textures(max_size=2048, rules=()):
    """Scales down oversized images (some scene textures are 3500 px) before export. rules: [(regex, size)]
    checked in order against the image name; the first match sets that image's limit."""
    import re
    for img in bpy.data.images:
        w, h = img.size
        limit = next((size for pat, size in rules if re.search(pat, img.name)), max_size)
        if max(w, h) > limit and img.source in ('FILE', 'GENERATED'):
            max_size_img = limit
            k = max_size_img / max(w, h)
            img.scale(max(1, int(w * k)), max(1, int(h * k)))
            L.log(f'scaled {img.name} {w}x{h} -> {img.size[0]}x{img.size[1]}')


def export_glb(path, scene_meta, texture_caps=()):
    cap_textures(2048, texture_caps)
    bpy.context.scene['nm'] = json.dumps(scene_meta)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=False, export_apply=True, export_texcoords=True,
        export_normals=True, export_tangents=False, export_materials='EXPORT', export_extras=True, export_yup=True,
        export_lights=False, export_cameras=False, export_animations=True, export_skins=True, export_morph=True,
        export_image_format='AUTO')
    L.log(f'exported {path}')


def main():
    args = parse_args()
    t0 = time.time()
    room = importlib.import_module(f'rooms.{args.room}')
    cfg = room.build()
    L.delete([o for o in bpy.context.scene.objects if o.name.startswith('EMITTER_') or o.type == 'CAMERA'])
    for o in L.mesh_objects():  # the importer flags glass as sosies_nobake; keep one convention
        if o.get('sosies_nobake'):
            o['nm_nobake'] = 1

    static, keep = classify()
    clean_attributes(static + keep)
    decimate_heavy(static)
    decimate_heavy([o for o in keep if not o.get('nm_dynamic')])
    col = build_collision(static, [o for o in keep if o.get('nm_collide')], cfg.get('collision_tris', 60000))
    # invisible walls (the edge of the garden, a frozen lake that goes on forever) exist only as collision
    L.delete([o for o in L.mesh_objects() if o.get('nm_collision_only')])
    static, keep = classify()
    size = args.size or cfg.get('lightmap_size', 2048)
    states = cfg.get('states', ['on', 'moon'])
    meta = {'room': args.room, 'states': states, 'lightmaps': {}, 'exposure': cfg.get('exposure', {}),
            'sky': cfg.get('sky', {}), 'ambient': cfg.get('ambient', {})}

    if static:
        joined = B.join_static(static)
        joined.name = f'{args.room}_static'
        if cfg.get('nobake_small_parts'):
            split_small_parts(joined, cfg['nobake_small_parts'], f'{args.room}_details')
        margin = cfg.get('lightmap_margin', 3)
        B.make_lightmap_uvs([joined], size, margin, density=cfg.get('lightmap_density'))
        if not args.no_bake:
            B.setup_cycles(args.samples, args.device)
            os.makedirs(OUT, exist_ok=True)
            for state in states:
                apply_state(state, cfg)
                image = B.bake([joined], size, max(4, margin * 2))
                path = os.path.join(OUT, f'{args.room}-{state}.exr')
                B.save_lightmap(image, path, denoise=True)
                meta['lightmaps'][state] = os.path.basename(path)
                bpy.data.images.remove(image)
        apply_state(states[0], cfg)  # exported emissive strengths match the first state
    # lights are baked; the game creates real-time lights from M_light_ markers where it needs them
    L.delete([o for o in bpy.context.scene.objects if o.type == 'LIGHT'])
    export_glb(os.path.join(WORK, f'{args.room}-baked.glb'), meta, cfg.get('texture_caps', ()))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, f'{args.room}-final.blend'), compress=True)
    L.log(f'{args.room} done in {time.time() - t0:.0f} s')


if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        import traceback
        traceback.print_exc()
        L.log(f'FAILED: {err}')
        sys.exit(1)
