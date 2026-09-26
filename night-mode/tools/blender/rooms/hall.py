"""Entry hall, stairs and upstairs landing: The Wooden Staircase by Wig42 (CC BY 3.0) + doors and props."""
import os

import bpy

import nm_lib as L

SCENE = os.path.join(L.ROOT, 'assets-src', 'work', 'staircase-import.blend')
TEX = os.path.join(L.BITTERLI, 'staircase', 'staircase', 'textures')

FLOOR = 0.025       # ground floor surface
LANDING = 3.559     # upstairs landing surface
FOYER_CEILING = 3.956


def door_materials():
    wood = L.image_material('NM_DoorWood', os.path.join(TEX, 'WoodPanel.jpg'), rough=0.42, tint=(0.62, 0.5, 0.42))
    return wood, L.material('WhitePaint'), L.material('Brass')


def footprints():
    """Wet child's footprints from the bathroom door to Ivy's door (shown in chapter 3)."""
    import math
    from mathutils import Vector
    tex = os.path.join(L.ROOT, 'assets-src', 'work', 'tex', 'footprint.png')
    mat = bpy.data.materials.new('NM_WetFootprint')
    b = L._principled(mat)
    nt = mat.node_tree
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(tex, check_existing=True)
    rnd = nt.nodes.new('ShaderNodeMath')
    rnd.operation = 'ROUND'
    nt.links.new(t.outputs['Alpha'], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], b.inputs['Alpha'])
    b.inputs['Base Color'].default_value = (0.01, 0.012, 0.014, 1)
    b.inputs['Roughness'].default_value = 0.06
    path = [Vector(p) for p in ((-3.55, 3.25), (-3.25, 2.3), (-3.0, 1.1), (-2.9, -0.35))]
    pts, step, dist = [], 0.27, 0.0
    for a, c in zip(path[:-1], path[1:]):
        seg = (c - a).length
        while dist < seg:
            pts.append((a + (c - a) * (dist / seg), (c - a).normalized()))
            dist += step
        dist -= seg
    verts, faces, uvs = [], [], []
    for i, (p, d) in enumerate(pts):
        side = Vector((-d.y, d.x)) * (0.075 if i % 2 else -0.075)
        c = p + side
        z = L.surface_z(c.x, c.y, LANDING + 1.0, LANDING) + 0.003
        fwd, right = d * 0.085, Vector((d.y, -d.x)) * 0.043
        base = len(verts)
        for (su, sv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            q = c + right * su + fwd * sv
            verts.append((q.x, q.y, z))
        uvs += [(0, 0), (1, 0), (1, 1), (0, 1)]
        faces.append((base, base + 1, base + 2, base + 3))
    me = bpy.data.meshes.new('footprints')
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='UVMap')
    for li, loop in enumerate(me.loops):
        uv.data[li].uv = uvs[loop.vertex_index]
    me.materials.append(mat)
    o = L.link(bpy.data.objects.new('DYN_footprints', me))
    L.dynamic(o)
    L.hidden(o)
    L.nocollide(o)
    return o


def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    wood, trim, brass = door_materials()
    # a stray piece of dado rail floats in the middle of the original foyer (the scene was built for one camera)
    L.log(f'removed {L.delete_faces_in_box(L.by_material("WoodStairs"), (-2.6, -3.9, 1.3), (-2.3, -2.3, 1.6))} stray faces')

    # ---- doors (bottom centre on the wall surface, facing into the hall)
    L.make_door('front', (-0.8, -4.95, FLOOR), 0, wood, trim, brass, width=1.0, height=2.3)
    L.make_door('living', (-4.107, -3.0, FLOOR), -90, wood, trim, brass)
    L.make_door('kitchen', (2.495, -3.0, FLOOR), 90, wood, trim, brass, hinge='right')
    L.make_door('bedroom', (-4.107, 0.35, LANDING), -90, wood, trim, brass)
    L.make_door('bathroom', (-4.107, 3.3, LANDING), -90, wood, trim, brass, hinge='right')
    L.make_door('ivy', (-2.9, -0.853, LANDING), 0, wood, trim, brass)

    # transom window above the front door: moonlight comes in here at night
    glass = L.simple_material('NM_TransomGlass', (0.55, 0.62, 0.75), rough=0.15, emission=(0.35, 0.45, 0.7), emission_strength=0.0)
    L.emissive('NM_TransomGlass', states=('moon', 'on'), color='#5a6f9c', strength=0.35)
    t = L.add_box('transom_glass', (-1.25, -4.948, 2.55), (-0.35, -4.940, 3.02), glass)
    L.nobake(t, cast_shadow=False)
    L.add_box('transom_frame_b', (-1.3, -4.95, 2.5), (-0.3, -4.925, 2.55), trim)
    L.add_box('transom_frame_t', (-1.3, -4.95, 3.02), (-0.3, -4.925, 3.07), trim)
    L.add_box('transom_frame_l', (-1.3, -4.95, 2.55), (-1.25, -4.925, 3.02), trim)
    L.add_box('transom_frame_r', (-0.35, -4.95, 2.55), (-0.3, -4.925, 3.02), trim)
    L.add_box('transom_frame_m', (-0.82, -4.95, 2.55), (-0.78, -4.925, 3.02), trim)

    # ---- props
    ch = L.ph_model('Chandelier_02', (-0.8, -3.0, FOYER_CEILING - 0.908), name='foyer_chandelier')
    L.nocollide(ch)
    cam1 = L.ph_model('security_camera_01', (-3.85, -4.7, 3.55), yaw_deg=-135, name='cam_foyer')
    L.dynamic(cam1, 'cam_foyer')
    L.marker('cam_foyer', (-3.85, -4.7, 3.5), -45, camera='hall1')
    cam2 = L.ph_model('security_camera_01', (-3.85, -0.7, 6.1), yaw_deg=-135, name='cam_landing')
    L.dynamic(cam2, 'cam_landing')
    L.marker('cam_landing', (-3.85, -0.7, 6.05), -45, camera='hall2')
    plant = L.ph_model('potted_plant_02', (-3.55, 4.6, LANDING), yaw_deg=30, name='plant_landing')
    L.proxy('plant_landing', (-3.55, 4.6, LANDING + 0.45), (0.8, 0.8, 0.9))

    # Jordan's phone lies on the floor in the nook under the stairs (a hiding place in chapter 2)
    phone_mat = L.simple_material('NM_PhoneBlack', (0.02, 0.02, 0.025), rough=0.25)
    phone = L.add_box('jordan_phone', (-0.08, -0.037, 0), (0.08, 0.037, 0.008), phone_mat)
    phone.location = (-1.25, 4.35, FLOOR + 0.001)
    phone.rotation_euler = (0, 0, 0.6)
    L.dynamic(phone, 'jordan_phone')
    L.proxy('jordan_phone', (-1.25, 4.35, FLOOR + 0.05), (0.35, 0.35, 0.15))

    footprints()

    # the family photos going up the stairs (their textures are swapped for the Hales' photos in the game)
    L.proxy('photos', (2.3, 1.1, 2.95), (0.3, 0.7, 0.9))

    # ---- markers
    L.marker('hide_nook', (-1.0, 4.2, FLOOR), 90, hide='nook')
    L.marker('landing', (-2.9, 1.8, LANDING), 180)
    L.marker('stairs_bottom', (1.5, 0.6, FLOOR), 0)
    L.marker('foyer', (-0.8, -3.2, FLOOR), 0)

    # ---- bake lights
    L.light('chandelier_stairs', 'POINT', (-0.54, 2.03, 4.47), 160, '#ffc98f', radius=0.35, states=('on',),
            runtime={'intensity': 30, 'distance': 9})
    L.light('stair_lamp', 'POINT', (-0.72, 3.92, 1.40), 35, '#ffb36b', radius=0.04, states=('on',))
    L.light('foyer_chandelier', 'POINT', (-0.8, -3.0, 3.35), 140, '#ffcf9a', radius=0.25, states=('on',),
            runtime={'intensity': 25, 'distance': 8})
    L.light('landing_fill', 'POINT', (-2.9, 2.0, 6.6), 40, '#ffd8a8', radius=0.5, states=('on',))
    L.light('skylight', 'AREA', (-0.48, 1.65, 7.05), 55, '#9fb4e6', states=('moon',), direction=(0, 0, -1))
    bpy.data.lights['skylight'].size = 1.6
    L.light('transom_moon', 'AREA', (-0.8, -4.9, 2.78), 8, '#8ea5d8', states=('moon', 'on'), direction=(0, 1, -0.3))
    bpy.data.lights['transom_moon'].size = 0.9
    L.emissive('Emission', states=('on',), color='#ffd2a0', strength=8.0)
    L.emissive('Lampshade', states=('on',), color='#ffb36b', strength=1.5)

    return {
        'lightmap_size': 2048,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.004, 0.005, 0.009)}, 'moon': {'color': (0.004, 0.005, 0.009)}},
        'exposure': {'on': 1.0, 'moon': 2.4},
        'sky': {'hdri': 'snowy_forest_path_01', 'intensity': 0.03, 'tint': [0.55, 0.66, 1.0]},
    }
