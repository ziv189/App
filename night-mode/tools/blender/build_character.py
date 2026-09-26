"""
Converts a Microsoft Rocketbox avatar (MIT licence) into a game-ready GLB: skinned mesh, the face's
mouth shapes (15 visemes) and 52 ARKit expressions as morph targets, and a few animation clips.

    blender --background --factory-startup --python tools/blender/build_character.py -- \
        --fbx assets-src/downloads/rocketbox/Female_Child_01/Export/Female_Child_01_facial.fbx \
        --out assets-src/work/ivy.glb --clips idle=f_idle_breathe_01 talk=f_gestic_talk_sad_01 [--pose float]

Shape keys are renamed to the ARKit convention (eyeBlinkLeft, jawOpen, ...) and viseme_<name>.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ANIMS = os.path.join(ROOT, 'assets-src', 'downloads', 'rocketbox', 'anims')


def log(msg):
    print(f'[char] {msg}', flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--fbx', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--clips', nargs='*', default=[])
    p.add_argument('--pose', default=None, help='extra hand-made pose clip: float | sit')
    return p.parse_args(argv)


def clean_key_name(name):
    if name.startswith('AA_VI_'):
        return 'viseme_' + name.split('_', 3)[3]
    if name.startswith('AK_'):
        n = name.split('_', 2)[2]
        return n[0].lower() + n[1:]
    return None


def fix_shape_keys(mesh):
    keys = mesh.data.shape_keys
    if not keys:
        return 0
    obj = mesh
    kept = 0
    for kb in list(keys.key_blocks)[1:]:
        new = clean_key_name(kb.name)
        if new is None:
            obj.shape_key_remove(kb)
        else:
            kb.name = new
            kb.value = 0.0
            kept += 1
    return kept


def fix_materials(mesh, tex_dir):
    """Rebuilds each material from the avatar's Textures folder: <material>_color/_normal.tga."""
    for slot in mesh.material_slots:
        m = slot.material
        if not m:
            continue
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        name = m.name.lower()
        color_path = os.path.join(tex_dir, f'{m.name}_color.tga')
        normal_path = os.path.join(tex_dir, f'{m.name}_normal.tga')
        if os.path.exists(color_path):
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(color_path, check_existing=True)
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
            if 'opacity' in name:
                cut = nt.nodes.new('ShaderNodeMath')
                cut.operation = 'GREATER_THAN'
                cut.inputs[1].default_value = 0.35
                nt.links.new(tex.outputs['Alpha'], cut.inputs[0])
                nt.links.new(cut.outputs[0], bsdf.inputs['Alpha'])
                m.surface_render_method = 'DITHERED'
        else:
            log(f'  no colour texture for {m.name}')
        if os.path.exists(normal_path):
            nt_tex = nt.nodes.new('ShaderNodeTexImage')
            nt_tex.image = bpy.data.images.load(normal_path, check_existing=True)
            nt_tex.image.colorspace_settings.name = 'Non-Color'
            nmap = nt.nodes.new('ShaderNodeNormalMap')
            nt.links.new(nt_tex.outputs['Color'], nmap.inputs['Color'])
            nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
        bsdf.inputs['Roughness'].default_value = 0.5 if 'head' in name else 0.72
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = 0.35
        log(f'material {m.name}: {"colour" if os.path.exists(color_path) else "-"} {"normal" if os.path.exists(normal_path) else ""}')


def import_clip(armature, clip_name, fbx_name):
    before_objs = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=os.path.join(ANIMS, f'{fbx_name}.max.fbx'))
    new_actions = [a for a in bpy.data.actions if a not in before_actions]
    main = max(new_actions, key=lambda a: (a.frame_range[1] - a.frame_range[0], a.name.startswith('Bip01.')))
    main.name = clip_name
    main.use_fake_user = True
    for a in new_actions:
        if a is not main:
            bpy.data.actions.remove(a)
    for o in [o for o in bpy.data.objects if o not in before_objs]:
        bpy.data.objects.remove(o, do_unlink=True)
    add_nla(armature, main)
    log(f'clip {clip_name} <- {fbx_name} ({main.frame_range[0]:.0f}-{main.frame_range[1]:.0f})')


def add_nla(armature, action):
    ad = armature.animation_data or armature.animation_data_create()
    ad.action = action
    if hasattr(ad, 'action_slot') and len(getattr(action, 'slots', [])):
        ad.action_slot = action.slots[0]
    track = ad.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, int(action.frame_range[0]), action)
    ad.action = None


def pose_clip(armature, kind):
    """A still pose, keyed on two frames (the exporter needs a clip)."""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    rot = {}
    if kind == 'float':
        # limp, drifting under the ice: head back, arms up and out, legs apart
        rot = {
            'Bip01 Head': (-35, 0, 0), 'Bip01 Neck': (-15, 0, 0),
            'Bip01 L UpperArm': (0, -60, 40), 'Bip01 R UpperArm': (0, 60, -40),
            'Bip01 L Forearm': (0, 0, 25), 'Bip01 R Forearm': (0, 0, -25),
            'Bip01 L Thigh': (10, 0, 12), 'Bip01 R Thigh': (-8, 0, -12), 'Bip01 L Calf': (0, 0, 20), 'Bip01 R Calf': (0, 0, 14),
        }
    action = bpy.data.actions.new(kind)
    action.use_fake_user = True
    ad = armature.animation_data or armature.animation_data_create()
    ad.action = action
    for pb in armature.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = Euler([math.radians(v) for v in rot.get(pb.name, (0, 0, 0))])
        for f in (1, 2):
            pb.keyframe_insert('rotation_euler', frame=f)
            pb.keyframe_insert('location', frame=f)
    bpy.ops.object.mode_set(mode='OBJECT')
    ad.action = None
    add_nla(armature, action)
    log(f'pose {kind}')


def main():
    a = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.abspath(a.fbx))
    armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for m in meshes:
        log(f'mesh {m.name}: {len(m.data.polygons)} faces, {fix_shape_keys(m)} face shapes kept')
        fix_materials(m, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(a.fbx))), 'Textures'))
    # the facial rig's own "Take 001" action is a bind pose; drop it
    for act in list(bpy.data.actions):
        bpy.data.actions.remove(act)
    if armature.animation_data:
        armature.animation_data.action = None
    for spec in a.clips:
        name, fbx = spec.split('=')
        import_clip(armature, name, fbx)
    if a.pose:
        pose_clip(armature, a.pose)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(a.out), export_format='GLB', export_skins=True, export_morph=True,
        export_morph_normal=False, export_animations=True, export_animation_mode='NLA_TRACKS',
        export_force_sampling=True, export_yup=True, export_image_format='AUTO', export_extras=True,
        export_lights=False, export_cameras=False)
    log(f'exported {a.out}')


if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        import traceback
        traceback.print_exc()
        log(f'FAILED: {err}')
        sys.exit(1)
