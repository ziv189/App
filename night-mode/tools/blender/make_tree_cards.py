"""
Renders Poly Haven trees (millions of triangles each) into "tree card" images: the tree seen from the
side, with a transparent background. The exterior builds its forest from crossed quads with these
images, which costs a few triangles per tree instead of millions.

    blender --background --factory-startup --python tools/blender/make_tree_cards.py -- \
        --out assets-src/work/trees [--size 1024] [--samples 48]

Writes <out>/<tree>_<view>.png (RGBA, shaded under an even white sky so the needles keep their
self-shadowing) and <out>/trees.json with each tree's height, width and trunk position in the image.
"""
import argparse
import json
import math
import os
import sys
import time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MODELS = os.path.join(ROOT, 'assets-src', 'downloads', 'polyhaven', 'models')

# (card name, Poly Haven asset, object name prefix inside the asset)
TREES = [
    ('fir_a', 'fir_tree_01', 'fir_tree_01_a'),
    ('fir_b', 'fir_tree_01', 'fir_tree_01_b'),
    ('fir_c', 'fir_tree_01', 'fir_tree_01_c'),
    ('sapling_a', 'fir_sapling_medium', 'fir_sapling_medium_a'),
    ('sapling_b', 'fir_sapling_medium', 'fir_sapling_medium_b'),
]
VIEWS = (0, 90)  # degrees around the trunk; two views make an X-shaped card


def log(msg):
    print(f'[trees] {msg}', flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--out', default=os.path.join(ROOT, 'assets-src', 'work', 'trees'))
    p.add_argument('--size', type=int, default=1024, help='image height (width is half)')
    p.add_argument('--samples', type=int, default=48)
    p.add_argument('--only', nargs='*')
    return p.parse_args(argv)


def setup_render(size, samples):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 4
    sc.cycles.transparent_max_bounces = 16
    sc.render.film_transparent = True
    sc.render.resolution_x = size // 2
    sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    world = bpy.data.worlds.new('white')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (1, 1, 1, 1)
    bg.inputs['Strength'].default_value = 1.0
    sc.world = world
    cam_data = bpy.data.cameras.new('card')
    cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('card', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def tree_objects(prefix):
    return [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith(prefix)]


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def trunk_base(objs, lo):
    """XY centre of the vertices near the ground: where the trunk meets it."""
    xs, ys = [], []
    for o in objs:
        mw = o.matrix_world
        for v in o.data.vertices:
            p = mw @ v.co
            if p.z < lo.z + 0.4:
                xs.append(p.x)
                ys.append(p.y)
    if not xs:
        return Vector(((lo.x), lo.y, lo.z))
    xs.sort()
    ys.sort()
    return Vector((xs[len(xs) // 2], ys[len(ys) // 2], lo.z))


def main():
    args = parse_args()
    os.makedirs(args.out, exist_ok=True)
    meta_path = os.path.join(args.out, 'trees.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    loaded = None
    for name, asset, prefix in TREES:
        if args.only and name not in args.only:
            continue
        t0 = time.time()
        if loaded != asset:
            bpy.ops.wm.read_factory_settings(use_empty=True)
            bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, asset, f'{asset}.gltf'))
            loaded = asset
            cam = setup_render(args.size, args.samples)
            log(f'imported {asset} in {time.time() - t0:.0f} s')
        objs = tree_objects(prefix)
        for o in bpy.context.scene.objects:
            if o.type == 'MESH':
                o.hide_render = o not in objs
        lo, hi = bounds(objs)
        base = trunk_base(objs, lo)
        # the image covers [base - W/2, base + W/2] x [lo.z - margin, lo.z - margin + H]
        margin = 0.1
        height = (hi.z - lo.z) + margin + 0.15
        reach = max(abs(hi.x - base.x), abs(lo.x - base.x), abs(hi.y - base.y), abs(lo.y - base.y))
        height = max(height, 2 * reach * 2 + 0.2)  # width is half the height and must hold the crown
        cam.data.ortho_scale = height
        cam.data.clip_start = 0.1
        cam.data.clip_end = 200
        entry = {'height': height, 'width': height / 2, 'bottom': -margin, 'treeHeight': hi.z - lo.z, 'views': {}}
        for view in VIEWS:
            a = math.radians(view)
            d = Vector((math.sin(a), -math.cos(a), 0))  # camera sits on this side, looking back at the trunk
            centre = Vector((base.x, base.y, lo.z - margin + height / 2))
            cam.location = centre + d * 60
            cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            path = os.path.join(args.out, f'{name}_{view}.png')
            bpy.context.scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            entry['views'][str(view)] = os.path.basename(path)
            log(f'{name} view {view}: {path}')
        meta[name] = entry
        log(f'{name}: tree {hi.z - lo.z:.1f} m tall, card {height:.1f} x {height / 2:.1f} m, {time.time() - t0:.0f} s')
        json.dump(meta, open(meta_path, 'w'), indent=1)


if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        import traceback
        traceback.print_exc()
        log(f'FAILED: {err}')
        sys.exit(1)
