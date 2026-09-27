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


def bunting(y0, y1, z, x=X0 + 0.02, flags=11, sag=0.12):
    """Paper bunting along the west wall over the bed: little triangles on a sagging string."""
    colours = ((0.82, 0.3, 0.42), (0.95, 0.78, 0.3), (0.35, 0.6, 0.85), (0.5, 0.78, 0.45), (0.95, 0.55, 0.28))
    mats = [L.simple_material(f'NM_Bunting_{i}', c, rough=0.85) for i, c in enumerate(colours)]
    parts = []
    for i in range(flags):
        t0, t1 = (i + 0.08) / flags, (i + 0.92) / flags
        a = Vector((x, y0 + (y1 - y0) * t0, z - sag * 4 * t0 * (1 - t0)))
        b = Vector((x, y0 + (y1 - y0) * t1, z - sag * 4 * t1 * (1 - t1)))
        tip = (a + b) / 2 - Vector((0, 0, 0.15))
        me = bpy.data.meshes.new(f'flag_{i}')
        me.from_pydata([tuple(a), tuple(b), tuple(tip)], [], [(0, 2, 1)])  # facing +X, into the room
        me.validate()
        me.update()
        me.materials.append(mats[i % len(mats)])
        parts.append(L.link(bpy.data.objects.new(f'flag_{i}', me)))
    # the string: one thin ribbon along the sag
    string = L.simple_material('NM_BuntingString', (0.85, 0.82, 0.75), rough=0.9)
    verts, faces, n = [], [], 32
    for i in range(n + 1):
        t = i / n
        y, zc = y0 + (y1 - y0) * t, z - sag * 4 * t * (1 - t)
        verts += [(x + 0.001, y, zc - 0.002), (x + 0.001, y, zc + 0.002)]
        if i:
            faces.append((2 * i - 2, 2 * i, 2 * i + 1, 2 * i - 1))  # facing +X
    me = bpy.data.meshes.new('bunting_string')
    me.from_pydata(verts, [], faces)
    me.validate()
    me.update()
    me.materials.append(string)
    parts.append(L.link(bpy.data.objects.new('bunting_string', me)))
    return L.nocollide(L.join(parts, 'bunting'))


def glow_stars(count=16, seed=7):
    """Glow-in-the-dark stars stuck on the ceiling: pale plastic by day, a soft green glow when the lights
    are out."""
    import random
    rnd = random.Random(seed)
    mat = L.simple_material('NM_GlowStars', (0.86, 0.93, 0.74), rough=0.6, emission=(0.62, 1.0, 0.56), emission_strength=1.2)
    L.emissive('NM_GlowStars', states=('moon',), color='#b8ffae', strength=1.2)
    parts = []
    for i in range(count):
        r = rnd.uniform(0.035, 0.065)
        cx, cy = rnd.uniform(X0 + 0.25, X1 - 0.25), rnd.uniform(Y0 + 0.25, Y1 - 0.25)
        spin = rnd.uniform(0, math.tau)
        # a fan of triangles round the middle
        pts = [(cx, cy, H - 0.002)]
        for k in range(10):
            rr = r if k % 2 == 0 else r * 0.42
            ang = spin + k * math.pi / 5
            pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang), H - 0.002))
        me = bpy.data.meshes.new(f'star_{i}')
        me.from_pydata(pts, [], [(0, 1 + (k + 1) % 10, 1 + k) for k in range(10)])  # facing down
        me.validate()
        me.update()
        me.materials.append(mat)
        parts.append(L.link(bpy.data.objects.new(f'star_{i}', me)))
    return L.nocollide(L.join(parts, 'glow_stars'))


def decor(bed_lo):
    """A small desk south of the bed, prints, bunting, glow stars on the ceiling, a ukulele, a shelf of
    toys and a soft rug: the room she left."""
    # the desk against the west wall past the foot of the bed; she sat facing the wall
    dy = bed_lo.y - 0.42
    L.ph_model('SchoolDesk_01', (X0 + 0.29, dy, FLOOR), yaw_deg=90, name='ivy_desk')
    top = L.surface_z(X0 + 0.29, dy, 1.4, FLOOR + 0.8)
    L.ph_model('SchoolChair_01', (X0 + 0.78, dy + 0.05, FLOOR), yaw_deg=-80, name='ivy_chair')
    L.ornament('book_encyclopedia_set_01', (X0 + 0.12, dy - 0.3, top), yaw_deg=90, scale=0.55, name='ivy_books', budget=5000)
    L.ornament('alarm_clock_01', (X0 + 0.2, dy + 0.22, top), yaw_deg=100, name='ivy_alarm_clock', budget=4000)
    # prints: Peter Rabbit and Mrs. Tiggy-Winkle over the desk, children reading by the door, lanterns
    L.picture('art_peter', 'potter_peter', (X0, dy - 0.2, FLOOR + 1.35), -90, 0.2, frame='white', mount=0.035, glazed=True)
    L.picture('art_tiggy', 'potter_tiggy', (X0, dy + 0.22, FLOOR + 1.38), -90, 0.25, frame='white', mount=0.035, glazed=True)
    L.picture('art_rhymes', 'willcox_rhymes', (-0.85, Y1, FLOOR + 1.45), 180, 0.36, frame='oak')
    L.picture('art_lanterns', 'sargent_carnation', (X1, -1.08, FLOOR + 1.42), 90, 0.45, frame='walnut')
    bunting(-0.75, 0.95, 2.02)
    glow_stars()
    # the ukulele hangs on the east wall; a narrow shelf of books and toys behind the head of the bed
    uke = L.ornament('Ukulele_01', (X1 - 0.03, 1.2, FLOOR + 1.0), yaw_deg=-90, name='ukulele', budget=6000)
    L.nocollide(uke)
    L.ph_model('painted_wooden_shelves', (X0 + 0.34, Y1 - 0.01, FLOOR), yaw_deg=0, name='ivy_shelves')
    for z, (asset, scale, yaw) in ((FLOOR + 1.2, ('book_encyclopedia_set_01', 0.45, 0)), (FLOOR + 0.8, ('carved_wooden_elephant', 1.0, 20))):
        sz = L.surface_z(X0 + 0.34, Y1 - 0.18, z, FLOOR + 0.4)
        L.ornament(asset, (X0 + (0.2 if asset.startswith('book') else 0.34), Y1 - 0.2, sz), yaw_deg=yaw, scale=scale, name=f'shelf_{asset}', budget=5000)
    L.rug('ivy_rug', (0.35, -0.15, FLOOR), (1.5, 1.1), 0, 'curly_teddy_checkered', tile=0.5, border_color=(0.7, 0.55, 0.62))


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

    decor(lo)

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
    # its cord is made for a tall ceiling: here the globe would hang at head height, so the top of the
    # cord goes up through the ceiling and the globe's bottom stays above 2 m
    lamp.location.z -= hi.z - H - max(0.0, (H - 0.55) - (lo.z - (hi.z - H)))
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
