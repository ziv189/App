"""Ivy's room: built for the game from Poly Haven props and textures (CC0).

A nine-year-old's bedroom kept exactly as it was a year ago: the bed, a toy basket, drawings on the
walls, a star night light, and under the window the red mitten, soaking wet.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

import nm_lib as L

TEX = os.path.join(L.ROOT, 'assets-src', 'work', 'tex')

W, D, H = 3.6, 3.4, 2.55          # x, y, height
X0, X1 = -W / 2, W / 2
Y0, Y1 = -D / 2, D / 2            # the door is on the north wall (Y1), the window on the south (Y0)
FLOOR = 0.0


def wool(name, rgb):
    return L.simple_material(name, rgb, rough=0.95)


def mitten(at, yaw_deg):
    """A knitted red mitten lying flat: a squashed palm and a thumb."""
    red = L.simple_material('NM_MittenWool', (0.42, 0.02, 0.02), rough=0.85)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0, location=(0, 0, 0))
    palm = bpy.context.active_object
    palm.scale = (0.055, 0.085, 0.018)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1.0, location=(0.05, -0.02, 0))
    thumb = bpy.context.active_object
    thumb.scale = (0.022, 0.04, 0.014)
    thumb.rotation_euler = (0, 0, math.radians(-30))
    cuff = L.add_box('cuff', (-0.045, -0.12, -0.012), (0.045, -0.075, 0.012), red)
    for o in (palm, thumb):
        o.data.materials.append(red)
        L.apply_transforms(o)
    m = L.join([palm, thumb, cuff], 'DYN_mitten')
    for p in m.data.polygons:
        p.use_smooth = True
    m.location = (at[0], at[1], at[2] + 0.018)
    m.rotation_euler = (0, 0, math.radians(yaw_deg))
    L.dynamic(m, 'mitten')
    # a little puddle of lake water around it
    wet = L.simple_material('NM_Wet', (0.02, 0.025, 0.03), rough=0.05)
    bpy.ops.mesh.primitive_circle_add(vertices=24, radius=0.16, fill_type='NGON', location=(at[0], at[1] + 0.02, at[2] + 0.001))
    puddle = bpy.context.active_object
    puddle.name = 'mitten_puddle'
    puddle.scale = (1.0, 1.35, 1.0)
    puddle.data.materials.append(wet)
    L.apply_transforms(puddle)
    L.nocollide(puddle)
    return m


def drawing_quad(name, variant, centre, width, normal_axis, tilt_deg=0.0):
    """A child's drawing taped to a wall. normal_axis: '+x', '-x', '+y' or '-y' (the way it faces)."""
    mat = L.image_material(f'NM_Drawing_{variant}', os.path.join(TEX, f'drawing_{variant}.png'), rough=0.9)
    h = width * 338 / 512
    t = math.radians(tilt_deg)
    right = {'+y': Vector((-1, 0, 0)), '-y': Vector((1, 0, 0)), '+x': Vector((0, 1, 0)), '-x': Vector((0, -1, 0))}[normal_axis]
    up = Vector((0, 0, 1))
    r = right * math.cos(t) + up * math.sin(t)
    u = up * math.cos(t) - right * math.sin(t)
    c = Vector(centre)
    corners = [c - r * width / 2 - u * h / 2, c + r * width / 2 - u * h / 2, c + r * width / 2 + u * h / 2, c - r * width / 2 + u * h / 2]
    q = L.add_quad(name, corners, mat)
    uv = q.data.uv_layers[0]
    for li, (a, b) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = (a, b)
    L.nocollide(q)
    return q


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    floor = L.ph_texture_material('NM_IvyFloor', 'old_wooden_floor_02', res='1k', tint=(0.85, 0.75, 0.65))
    wall = L.ph_texture_material('NM_IvyWall', 'plastered_wall_04', res='1k', tint=(0.86, 0.7, 0.76))
    ceiling = L.ph_texture_material('NM_IvyCeiling', 'plastered_wall_04', res='1k', tint=(0.92, 0.9, 0.88))
    paint = L.simple_material('NM_IvyTrim', (0.78, 0.76, 0.72), rough=0.45)
    # walls, floor and ceiling; the south wall is built around the window opening
    walls = L.add_box('ivy_walls', (X0, Y0, FLOOR), (X1, Y1, H), wall, 1.5, faces={'+x', '-x', '+y'})
    L.flip_normals(walls)
    L.add_box('ivy_floor', (X0, Y0, FLOOR), (X1, Y1, FLOOR), floor, 1.2, faces={'+z'})
    L.add_box('ivy_ceiling', (X0, Y0, H), (X1, Y1, H), ceiling, 1.5, faces={'-z'})
    wx0, wx1, wz0, wz1 = -0.55, 0.55, 0.9, 2.05
    for (lo, hi) in (((X0, Y0 - 0.14, FLOOR), (wx0, Y0, H)), ((wx1, Y0 - 0.14, FLOOR), (X1, Y0, H)),
                     ((wx0, Y0 - 0.14, FLOOR), (wx1, Y0, wz0)), ((wx0, Y0 - 0.14, wz1), (wx1, Y0, H))):
        L.add_box('ivy_south_wall', lo, hi, wall, 1.5)
    # skirting and a picture rail
    for (a, b) in (((X0, Y0), (X1, Y0 + 0.02)), ((X0, Y1 - 0.02), (X1, Y1)), ((X0, Y0), (X0 + 0.02, Y1)), ((X1 - 0.02, Y0), (X1, Y1))):
        L.add_box('skirting', (a[0], a[1], FLOOR), (b[0], b[1], FLOOR + 0.14), paint, 0.5)
        L.add_box('rail', (a[0], a[1], H - 0.42), (b[0], b[1], H - 0.39), paint, 0.5)

    wood, trim, brass = L.door_materials(paint)
    L.make_door('hall', (0.55, Y1, FLOOR), 180, wood, trim, brass, hinge='right')

    # the window: a frame in the south wall looking at the snow; the glass shows the sky
    frame_mat = L.simple_material('NM_IvyWindowFrame', (0.8, 0.79, 0.76), rough=0.4)
    for (lo, hi) in (((wx0 - 0.06, Y0 - 0.12, wz0 - 0.08), (wx1 + 0.06, Y0 + 0.06, wz0)),   # sill
                     ((wx0 - 0.06, Y0 - 0.12, wz1), (wx1 + 0.06, Y0 + 0.03, wz1 + 0.08)),
                     ((wx0 - 0.06, Y0 - 0.12, wz0), (wx0, Y0 + 0.03, wz1)),
                     ((wx1, Y0 - 0.12, wz0), (wx1 + 0.06, Y0 + 0.03, wz1)),
                     ((-0.02, Y0 - 0.1, wz0), (0.02, Y0 - 0.06, wz1)),
                     ((wx0, Y0 - 0.1, (wz0 + wz1) / 2 - 0.02), (wx1, Y0 - 0.06, (wz0 + wz1) / 2 + 0.02))):
        L.add_box('window_frame', lo, hi, frame_mat, 0.5)
    glass_mat = L.simple_material('NM_IvyGlass', (0.85, 0.9, 1.0), rough=0.05)
    glass_mat['sosies_glass'] = 1
    g = L.add_box('window_glass', (wx0, Y0 - 0.085, wz0), (wx1, Y0 - 0.08, wz1), glass_mat)
    L.nobake(g, cast_shadow=False)
    L.nocollide(g)
    curtain = L.simple_material('NM_IvyCurtain', (0.62, 0.42, 0.5), rough=0.9)
    for side in (-1, 1):
        x = side * 0.78
        L.add_box('curtain', (x - 0.2, Y0 + 0.05, 0.8), (x + 0.2, Y0 + 0.08, 2.2), curtain, 0.7)
    L.add_box('curtain_rod', (-1.05, Y0 + 0.07, 2.21), (1.05, Y0 + 0.09, 2.23), L.simple_material('NM_Brass', (0.62, 0.45, 0.2), rough=0.3, metal=1.0))

    # bed against the west wall: iron frame, mattress, quilt, pillow, and a rabbit on it
    bed = L.ph_model('old_bed_frame', (X0 + 0.5, 0.1, FLOOR), yaw_deg=0, name='ivy_bed')
    lo, hi = L.world_bbox(bed)
    springs = L.surface_z((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 1.5, FLOOR + 0.3)
    mz = springs + 0.16
    L.add_box('mattress', (lo.x + 0.05, lo.y + 0.08, springs + 0.005), (hi.x - 0.05, hi.y - 0.08, mz), wool('NM_Mattress', (0.7, 0.68, 0.64)), 0.8)
    quilt = L.add_box('quilt', (lo.x + 0.02, lo.y + 0.06, mz), (hi.x - 0.02, hi.y - 0.55, mz + 0.06), wool('NM_Quilt', (0.55, 0.32, 0.45)), 0.5)
    L.add_box('pillow', (lo.x + 0.12, hi.y - 0.5, mz), (hi.x - 0.12, hi.y - 0.12, mz + 0.12), wool('NM_Pillow', (0.82, 0.8, 0.78)), 0.5)

    # nightstand with the star night light
    ns = L.add_box('nightstand', (X0 + 1.05, 0.75, FLOOR), (X0 + 1.5, 1.15, FLOOR + 0.5), wood, 0.6)
    star_mat = L.simple_material('NM_StarLight', (0.9, 0.8, 0.5), rough=0.5, emission=(1.0, 0.8, 0.45), emission_strength=5.0)
    L.emissive('NM_StarLight', states=('on', 'moon'), color='#ffcf73', strength=5.0)
    bpy.ops.mesh.primitive_circle_add(vertices=10, radius=0.07, fill_type='NGON', location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
    star = bpy.context.active_object
    for i, v in enumerate(star.data.vertices):
        if i % 2:
            v.co *= 0.45
    sol = star.modifiers.new('solid', 'SOLIDIFY')
    sol.thickness = 0.03
    L.select_only([star])
    bpy.ops.object.modifier_apply(modifier=sol.name)
    star.location = (X0 + 1.27, 0.95, FLOOR + 0.58)
    star.rotation_euler = (0, 0, math.radians(20))
    star.data.materials.append(star_mat)
    star.name = 'night_light'
    L.nobake(star, cast_shadow=False)

    # toys: a basket, the duck, the elephant; a small bookshelf with a suitcase on top
    L.ph_model('wicker_basket_01', (X1 - 0.45, Y1 - 0.9, FLOOR), yaw_deg=15, name='toy_basket')
    duck = L.ph_model('rubber_duck_toy', (X0 + 1.36, 0.82, FLOOR + 0.5), yaw_deg=-40, name='duck')
    lo_d, hi_d = L.world_bbox(duck)
    k = 0.11 / max(hi_d.z - lo_d.z, 1e-3)  # a bath duck is about 11 cm tall
    duck.scale = (k, k, k)
    duck.location = (X0 + 1.36, 0.82, FLOOR + 0.5)
    L.apply_transforms(duck)
    L.ph_model('carved_wooden_elephant', (X1 - 0.35, Y0 + 0.6, FLOOR + 0.78), yaw_deg=120, scale=0.8, name='elephant')
    shelf = L.add_box('bookshelf', (X1 - 0.35, Y0 + 0.25, FLOOR), (X1 - 0.02, Y0 + 1.0, FLOOR + 0.75), wood, 0.6)
    L.ph_model('vintage_suitcase', (X1 - 0.6, Y1 - 0.25, FLOOR), yaw_deg=180, scale=0.8, name='suitcase')

    # drawings: the big one over the bed is the one you can look at ("ice")
    drawing_quad('drawing_big', 'ice', (X0 + 0.012, 0.15, 1.45), 0.62, '+x', 2)
    L.proxy('ivy_drawing', (X0 + 0.15, 0.15, 1.45), (0.3, 0.7, 0.5))
    drawing_quad('drawing_2', 'family', (X1 - 0.012, -0.2, 1.5), 0.42, '-x', -4)
    drawing_quad('drawing_3', 'family', (X1 - 0.012, 0.45, 1.35), 0.3, '-x', 6)

    # the mitten, under the window
    mitten((0.2, Y0 + 0.45, FLOOR), 35)
    L.proxy('mitten', (0.2, Y0 + 0.45, FLOOR + 0.12), (0.45, 0.45, 0.3))

    # ---- bake lights: a ceiling lamp; the night light (both states); moonlight through the window
    lamp = L.ph_model('modern_ceiling_lamp_01', (0, 0.2, H), name='ceiling_lamp')
    lo, hi = L.world_bbox(lamp)
    lamp.location.z -= hi.z - H
    L.nocollide(lamp)
    L.light('ceiling', 'POINT', (0, 0.2, H - 0.3), 55, '#ffe0c0', radius=0.15, states=('on',))
    L.light('night_light', 'POINT', (X0 + 1.27, 0.9, FLOOR + 0.62), 3.5, '#ffc46a', radius=0.05, states=('on', 'moon'))
    L.light('window_moon', 'AREA', (0, Y0 - 0.5, 1.6), 55, '#9fb4e6', states=('moon', 'on'), direction=(0, 1, -0.45))
    bpy.data.lights['window_moon'].size = 1.1
    L.set_world(color=(0.004, 0.005, 0.009))

    L.marker('centre', (0, 0, FLOOR), 0)
    return {
        'lightmap_size': 1024,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.004, 0.005, 0.009)}, 'moon': {'color': (0.004, 0.005, 0.009)}},
        'exposure': {'on': 1.0, 'moon': 2.6},
    }
