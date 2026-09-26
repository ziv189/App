"""Exterior: Hale House from outside, the snowy yard, the dock and frozen Lake Ellery.

Victorian Style House by MrChimp2313 (CC0, via Benedikt Bitterli's Rendering Resources) + Poly Haven
trees (as cards), pier, rocks, lamp and snow textures (CC0). The interior of the house model is removed:
its windows become glowing panes, since the rooms the player visits are separate scenes.

Layout (Blender, Z-up, metres): the house faces south (-Y). The front walk runs from the road (y = -30)
to the porch steps; the driveway comes in from the west. Split-rail fences divide the front yard from
the back garden, which slopes down to the lake shore at y ~ 27. The dock points north onto the ice.
"""
import json
import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector, noise

import nm_lib as L

SCENE = os.path.join(L.ROOT, 'assets-src', 'work', 'house-import.blend')
TREES = os.path.join(L.ROOT, 'assets-src', 'work', 'trees')
TEXOUT = os.path.join(L.ROOT, 'assets-src', 'work', 'tex')

GROUND = -1.15      # the model's ground plane
PORCH = -0.40       # front porch floor
BACK_PORCH = -0.34  # back porch floor
ICE = -1.45         # the frozen lake
ROAD_Y = -30.0
DOOR_X = -5.555     # front door centre
COAL_X = -8.1       # the old coal chute (bulkhead doors) on the back wall
BACK_WALL = 12.5

random.seed(1894)


# ------------------------------------------------------------------------------------------ terrain

def shore_y(x):
    """The lake shore curves north at the sides: the house sits at the head of a bay."""
    return 27.0 + 0.0016 * x * x + 1.2 * noise.noise(Vector((x * 0.05, 0.3, 0.0)))


def far_shore_y(x):
    return 165.0 - 0.0012 * x * x + 6.0 * noise.noise(Vector((x * 0.02, 4.1, 0.0)))


def ground_height(x, y):
    """Snow height at (x, y): flat around the house, rolling further out, under the ice in the lake."""
    hx, hy = -4.5, 3.5  # house centre
    d = math.hypot((x - hx) * 0.9, (y - hy) * 1.1)
    k = min(1.0, max(0.0, (d - 17.0) / 30.0))
    n = noise.noise(Vector((x * 0.035, y * 0.035, 0.7))) * 1.4 + noise.noise(Vector((x * 0.11, y * 0.11, 2.3))) * 0.25
    h = GROUND + n * k * k
    # far away the land rises into wooded hills
    h += max(0.0, d - 55.0) * 0.035
    # the road is plowed flat, with snowbanks either side
    dr = abs(y - ROAD_Y)
    if dr < 7.0 and d > 12.0:
        bank = max(0.0, 1.0 - abs(dr - 4.8) / 1.4) * 0.45
        h = GROUND - 0.12 + bank if dr < 3.6 else max(h, GROUND + bank)
    # the lake: the ground drops under the ice past the shore, and rises again on the far side
    s = shore_y(x)
    if y > s - 3.0:
        t = min(1.0, (y - (s - 3.0)) / 6.0)
        h = h * (1 - t) + (ICE - 0.5) * t
        fs = far_shore_y(x)
        if y > fs - 6.0:
            u = min(1.0, (y - (fs - 6.0)) / 10.0)
            h = h * (1 - u) + (GROUND + 2.0 + noise.noise(Vector((x * 0.04, y * 0.04, 5.0))) * 2.0) * u
    return h


def grid_terrain(name, x0, x1, y0, y1, step, mat, skip=None, drop=0.0):
    nx, ny = int(round((x1 - x0) / step)), int(round((y1 - y0) / step))
    bm = bmesh.new()
    verts = {}
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, y = x0 + i * step, y0 + j * step
            verts[i, j] = bm.verts.new((x, y, ground_height(x, y) - drop))
    for j in range(ny):
        for i in range(nx):
            cx, cy = x0 + (i + 0.5) * step, y0 + (j + 0.5) * step
            if skip and skip(cx, cy):
                continue
            bm.faces.new((verts[i, j], verts[i + 1, j], verts[i + 1, j + 1], verts[i, j + 1]))
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = L.link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    L.cube_uv(o, 4.0)
    return o


def ribbon(name, points, width, mat, lift=0.015, step=0.8, uv_tile=4.0):
    """A strip that follows the ground along a polyline (paths, the driveway, the road)."""
    pts = []
    for a, b in zip(points[:-1], points[1:]):
        a, b = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0))
        n = max(1, int((b - a).length / step))
        pts += [a.lerp(b, i / n) for i in range(n)]
    pts.append(Vector((points[-1][0], points[-1][1], 0)))
    bm = bmesh.new()
    rows = []
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = Vector((-d.y, d.x, 0)) * (width / 2)
        row = []
        for s in (-1, 1):
            q = p + side * s
            row.append(bm.verts.new((q.x, q.y, ground_height(q.x, q.y) + lift)))
        rows.append(row)
    for r0, r1 in zip(rows[:-1], rows[1:]):
        bm.faces.new((r0[0], r1[0], r1[1], r0[1]))  # counter-clockwise from above: facing up
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = L.link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    L.cube_uv(o, uv_tile)
    return o


# ------------------------------------------------------------------------------------------ house

def cull_hidden(objs, centre, samples=48):
    """Deletes objects that can't be seen from anywhere outside the house (the model's furnished
    interior): face samples ray-cast towards viewpoints around it. The windows count as opaque, which
    they are once they glow."""
    view = []
    for i in range(28):
        a = 2 * math.pi * i / 28
        for r, z in ((26.0, 0.3), (18.0, 1.2), (30.0, 7.0)):
            view.append(Vector((centre.x + math.cos(a) * r, centre.y + math.sin(a) * r, z)))
    view += [Vector((centre.x + dx, centre.y + dy, 25.0)) for dx in (-12, 0, 12) for dy in (-12, 0, 12)]
    dg = bpy.context.evaluated_depsgraph_get()
    scene = bpy.context.scene
    rng = random.Random(7)
    doomed = []
    for o in objs:
        me = o.data
        if not me.polygons:
            doomed.append(o)
            continue
        mw = o.matrix_world
        nmat = mw.to_3x3().inverted().transposed()
        polys = list(me.polygons)
        picks = polys if len(polys) <= samples else rng.sample(polys, samples)
        seen = False
        for p in picks:
            c = mw @ p.center
            n = (nmat @ p.normal).normalized()
            for v in view:
                to = v - c
                dist = to.length
                to.normalize()
                # sample both sides: thin parts (railings) have faces pointing every way
                start = c + (n if n.dot(to) > 0 else -n) * 0.02
                hit, loc, *_ = scene.ray_cast(dg, start, to, distance=dist)
                if not hit:
                    seen = True
                    break
            if seen:
                break
        if not seen:
            doomed.append(o)
    n_tris = sum(L.tris(o) for o in doomed)
    L.log(f'culled {len(doomed)} hidden objects ({n_tris:,} triangles) of {len(objs)}')
    L.delete(doomed)


def window_glow_texture():
    """Curtains lit from behind: soft vertical folds, tiled on the window panes."""
    os.makedirs(TEXOUT, exist_ok=True)
    path = os.path.join(TEXOUT, 'window_glow.png')
    w = h = 256
    x = np.linspace(0, 1, w, endpoint=False)
    y = np.linspace(0, 1, h, endpoint=False)
    xx, yy = np.meshgrid(x, y)
    folds = 0.72 + 0.28 * (0.5 + 0.5 * np.sin(xx * 2 * np.pi * 7 + 0.6 * np.sin(xx * 2 * np.pi * 2)))
    folds *= 0.9 + 0.1 * (0.5 + 0.5 * np.sin(yy * 2 * np.pi))
    rgb = np.stack([folds * 1.0, folds * 0.74, folds * 0.46], axis=-1)
    img = bpy.data.images.new('window_glow', w, h, alpha=True)
    px = np.concatenate([rgb, np.ones((h, w, 1))], axis=-1).astype(np.float32)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img


def window_materials(groups=4):
    tex = window_glow_texture()
    mats = []
    for i in range(groups):
        name = f'NM_WindowGlow_{i + 1}'
        mat = L.simple_material(name, (0.02, 0.018, 0.015), rough=0.18)
        nt = mat.node_tree
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = tex
        nt.links.new(t.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 4.0
        L.emissive(name, states=('on',), color='#ffffff', strength=4.0)
        mats.append(mat)
    return mats


def dress_house():
    # the model's own ground, driveway and privacy fences make way for the snow, the paths and our fences
    L.delete(L.by_material('Ground', 'DrivewayBase', 'FenceWoodBase'))
    # interior-only materials (kitchen chrome, bathroom, furniture)
    L.delete(L.by_material('Chrome', 'Chrome2', 'StainlessSteel', 'None', 'BrassOld', 'BlueGlossy', 'PaleYellow',
                           'YellowDiffuse', 'Red', 'Blue', 'StepBase', 'ShowerFloorBase', 'MirrorMaterial', 'TileBase',
                           'Grey', 'Floorboards'))
    glass = L.by_material('Glass')
    solid = [o for o in L.mesh_objects() if o not in glass]
    cull_hidden(solid, Vector((-4.5, 3.5, 0)))
    names = [o.name for o in glass]
    cull_hidden(glass, Vector((-4.5, 3.5, 0)))  # the oven door, the shower screen...
    glass = [bpy.data.objects[n] for n in names if n in bpy.data.objects]
    house = [o for o in L.mesh_objects() if o not in glass]
    for o in house:
        o['nm_keep_detail'] = 1  # ~190k triangles in all: fine as it is, and the siding needs its grooves
    rows = sorted(((L.tris(o), o.name, o.data.materials[0].name if o.data.materials else '-') for o in house), reverse=True)
    L.log(f'house after culling: {sum(r[0] for r in rows):,} triangles in {len(rows)} objects')
    for r in rows[:25]:
        L.log(f'   {r[0]:8,d} {r[1]} ({r[2]})')

    # colours of a white-painted Victorian: warm white siding, cream trim, grey porch, dark roof
    def set_colour(name, rgb, rough):
        try:
            m = L.material(name)
        except KeyError:
            return
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (*rgb, 1)
        b.inputs['Roughness'].default_value = rough
    set_colour('WhiteDiffuse', (0.58, 0.58, 0.56), 0.75)
    set_colour('WhitePaint', (0.66, 0.64, 0.6), 0.55)
    set_colour('DeckWoodBase', (0.3, 0.29, 0.28), 0.8)
    set_colour('WallMaterial', (0.3, 0.26, 0.22), 0.8)
    set_colour('DarkerGrey', (0.05, 0.05, 0.05), 0.6)
    set_colour('BrickTextureBase', (0.28, 0.22, 0.2), 0.9)
    roof = L.material('RoofTiles')
    rb = next(n for n in roof.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    rt = next((n for n in roof.node_tree.nodes if n.type == 'TEX_IMAGE'), None)
    if rt:
        mix = roof.node_tree.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = (0.42, 0.42, 0.46, 1)
        roof.node_tree.links.new(rt.outputs['Color'], mix.inputs[6])
        roof.node_tree.links.new(mix.outputs[2], rb.inputs['Base Color'])

    # glowing windows, in four groups that can light up one after another
    mats = window_materials()
    glass.sort(key=lambda o: (L.world_bbox(o)[0].x, L.world_bbox(o)[0].y))
    for i, o in enumerate(glass):
        o.data.materials.clear()
        o.data.materials.append(mats[i % len(mats)])
        L.cube_uv(o, 1.1)
        o['nm_nobake'] = 1
        o['nm_nocollide'] = 1
    return glass


# ------------------------------------------------------------------------------------------ trees

def tree_atlas():
    """Packs the tree card renders into one texture: a column per tree, two rows (the two views)."""
    meta = json.load(open(os.path.join(TREES, 'trees.json')))
    names = sorted(meta)
    cw, ch = 512, 1024
    atlas = np.zeros((2 * ch, len(names) * cw, 4), dtype=np.float32)
    rects = {}
    for col, name in enumerate(names):
        for row, view in enumerate(('0', '90')):
            img = bpy.data.images.load(os.path.join(TREES, meta[name]['views'][view]))
            w, h = img.size
            px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
            if (w, h) != (cw, ch):
                raise RuntimeError(f'tree card {name} is {w}x{h}, expected {cw}x{ch}')
            # bleed colour into the transparent pixels so filtering doesn't draw black outlines
            rgb, a = px[..., :3].copy(), px[..., 3:4].copy()
            filled = a[..., 0] > 0.5
            for _ in range(10):
                acc = np.zeros_like(rgb)
                cnt = np.zeros(filled.shape, dtype=np.float32)
                for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                    sh = np.roll(np.roll(filled, dy, 0), dx, 1)
                    acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * sh[..., None]
                    cnt += sh
                grow = (~filled) & (cnt > 0)
                rgb[grow] = acc[grow] / cnt[grow][:, None]
                filled = filled | grow
            px = np.concatenate([rgb, a], axis=-1)
            # images are stored bottom row first; row 0 = view 0 at the bottom of the atlas
            atlas[row * ch:(row + 1) * ch, col * cw:(col + 1) * cw] = px
            rects[name, view] = (col / len(names), row / 2, (col + 1) / len(names), (row + 1) / 2)
            bpy.data.images.remove(img)
    img = bpy.data.images.new('tree_atlas', atlas.shape[1], atlas.shape[0], alpha=True)
    img.pixels.foreach_set(atlas.ravel())
    os.makedirs(TEXOUT, exist_ok=True)
    img.filepath_raw = os.path.join(TEXOUT, 'tree_atlas.png')
    img.file_format = 'PNG'
    img.save()
    return img, meta, rects


def tree_material(img):
    mat = bpy.data.materials.new('NM_TreeCards')
    b = L._principled(mat)
    nt = mat.node_tree
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    t.interpolation = 'Linear'
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    rnd = nt.nodes.new('ShaderNodeMath')
    rnd.operation = 'ROUND'  # exported as glTF alphaMode MASK
    nt.links.new(t.outputs['Alpha'], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 0.9
    mat.use_backface_culling = False
    return mat


def forest(mat, meta, rects, spots):
    """All the trees as one mesh of crossed quads. spots: list of (x, y, kind, scale, yaw)."""
    verts, faces, uvs, normals = [], [], [], []
    for (x, y, kind, s, yaw) in spots:
        m = meta[kind]
        w, h, bottom = m['width'] * s, m['height'] * s, m['bottom'] * s - 0.25
        z = ground_height(x, y)
        R = Matrix.Rotation(yaw, 3, 'Z')
        for view, axis in (('0', Vector((1, 0, 0))), ('90', Vector((0, 1, 0)))):
            u0, v0, u1, v1 = rects[kind, view]
            a = R @ axis
            base = len(verts)
            for (du, dv) in ((0, 0), (1, 0), (1, 1), (0, 1)):
                p = Vector((x, y, z + bottom)) + a * (w * (du - 0.5)) + Vector((0, 0, h * dv))
                verts.append(p)
                uvs.append((u0 + (u1 - u0) * du, v0 + (v1 - v0) * dv))
            faces.append((base, base + 1, base + 2, base + 3))
    me = bpy.data.meshes.new('forest')
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[me.loops[li].vertex_index]
    # needles lit from the sky: every card's normal points up, so lighting doesn't depend on its angle
    me.normals_split_custom_set([(0.0, 0.0, 1.0)] * len(me.loops))
    me.materials.append(mat)
    o = L.link(bpy.data.objects.new('forest', me))
    L.nobake(o, cast_shadow=True)
    L.nocollide(o)
    return o


def tree_spots():
    kinds_big = ['fir_a', 'fir_b', 'fir_c']
    kinds = kinds_big + ['sapling_a', 'sapling_b']
    spots = []
    cells = {}

    def free(x, y, r):
        cx, cy = int(x // 5), int(y // 5)
        for i in range(cx - 1, cx + 2):
            for j in range(cy - 1, cy + 2):
                for (a, b) in cells.get((i, j), ()):
                    if (x - a) ** 2 + (y - b) ** 2 < r * r:
                        return False
        return True

    def add(x, y, kind=None, s=None):
        kind = kind or random.choice(kinds_big if random.random() < 0.75 else kinds)
        s = s or random.uniform(0.75, 1.2)
        spots.append((x, y, kind, s, random.uniform(0, math.pi)))
        cells.setdefault((int(x // 5), int(y // 5)), []).append((x, y))

    # a few trees in the garden, placed by hand
    for (x, y, k, s) in ((-21, -9, 'fir_a', 1.0), (-24, -3, 'fir_b', 0.9), (13, -6, 'fir_b', 1.05), (17, 2, 'fir_a', 0.95),
                         (11, 20, 'fir_c', 1.0), (16, 23, 'sapling_a', 1.0), (-19, 19, 'fir_a', 1.0), (-25, 23, 'fir_b', 1.1),
                         (-14, -17, 'sapling_b', 0.9), (6, -18, 'sapling_a', 0.85), (19, -20, 'fir_c', 1.0),
                         (-33, 12, 'fir_a', 1.1), (26, 12, 'fir_b', 1.0)):
        add(x, y, k, s)
    # the woods around the property and along the shores, thicker further out
    tries = 0
    while len(spots) < 520 and tries < 60000:
        tries += 1
        x = random.uniform(-190, 190)
        y = random.uniform(-150, 230)
        on_lake = shore_y(x) - 2.0 < y < far_shore_y(x) + 3.0
        if on_lake:
            continue
        yard = (-41.5 < x < 33.5 and -27 < y < 9.8) or (-26.5 < x < 20.5 and 7.5 < y < 30)
        road = abs(y - ROAD_Y) < 7.5
        if yard or road:
            continue
        d = math.hypot(x + 4.5, y - 3.5)
        if random.random() > min(1.0, 0.25 + (d - 30) / 45):
            continue
        if free(x, y, 3.2 if d < 70 else 4.5):
            add(x, y)
    L.log(f'forest: {len(spots)} trees')
    return spots


# --------------------------------------------------------------------------------------- props

def split_rail_fence(name, points, mat, height=1.15, gap=2.4):
    """Posts every `gap` metres with three rails between them (a lake-house fence)."""
    parts = []
    for a, b in zip(points[:-1], points[1:]):
        a, b = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0))
        n = max(1, int(round((b - a).length / gap)))
        for i in range(n + 1):
            p = a.lerp(b, i / n)
            z = ground_height(p.x, p.y)
            post = L.add_box('post', (p.x - 0.07, p.y - 0.07, z - 0.3), (p.x + 0.07, p.y + 0.07, z + height), mat, 0.5)
            parts.append(post)
        d = (b - a).normalized()
        yaw = math.atan2(d.y, d.x)
        for i in range(n):
            p0, p1 = a.lerp(b, i / n), a.lerp(b, (i + 1) / n)
            z0, z1 = ground_height(p0.x, p0.y), ground_height(p1.x, p1.y)
            length = (p1 - p0).length
            for hz in (0.32, 0.68, 1.02):
                r = L.add_box('rail', (0, -0.035, -0.045), (length, 0.035, 0.045), mat, 0.5)
                r.data.transform(Matrix.Rotation(math.atan2(z1 - z0, length), 4, 'Y').inverted())
                r.matrix_world = Matrix.Translation((p0.x, p0.y, z0 + hz)) @ Matrix.Rotation(yaw, 4, 'Z')
                parts.append(r)
    for o in parts:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
    return L.join(parts, name)


def prism_x(name, xa, xb, profile, mat):
    """A solid made by sweeping a (y, z) outline from x = xa to x = xb."""
    bm = bmesh.new()
    a = [bm.verts.new((xa, y, z)) for (y, z) in profile]
    b = [bm.verts.new((xb, y, z)) for (y, z) in profile]
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    n = len(profile)
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = L.link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    L.cube_uv(o, 0.6)
    return o


def bulkhead(mat_wood, mat_stone, mat_metal):
    """The old coal chute: slanted cellar doors against the back wall."""
    x0, x1 = COAL_X - 0.75, COAL_X + 0.75
    y0, y1 = BACK_WALL, BACK_WALL + 1.55
    z_top, z_low = GROUND + 0.75, GROUND + 0.22
    profile = [(y0, GROUND - 0.1), (y1 + 0.12, GROUND - 0.1), (y1 + 0.12, z_low + 0.02), (y0, z_top + 0.02)]
    parts = [prism_x('coal_side_l', x0 - 0.18, x0, profile, mat_stone), prism_x('coal_side_r', x1, x1 + 0.18, profile, mat_stone),
             L.add_box('coal_front', (x0 - 0.18, y1, GROUND - 0.1), (x1 + 0.18, y1 + 0.12, z_low), mat_stone, 0.6)]
    # the two leaves (slanted), hinged at the sides, with a gap and hasp in the middle
    slope = math.atan2(z_top - z_low, y1 - y0)
    length = math.hypot(z_top - z_low, y1 - y0)
    for i, (a, b) in enumerate(((x0, COAL_X - 0.008), (COAL_X + 0.008, x1))):
        leaf = L.add_box(f'coal_leaf_{i}', (a, 0, 0), (b, length, 0.05), mat_wood, 0.8)
        leaf.data.transform(Matrix.Rotation(-slope, 4, 'X'))
        leaf.matrix_world = Matrix.Translation((0, y0, z_top))
        parts.append(leaf)
        for k in (0.25, 0.75):
            strap = L.add_box('strap', (a + 0.03, length * k - 0.03, 0.05), (b - 0.03, length * k + 0.03, 0.058), mat_metal, 0.5)
            strap.data.transform(Matrix.Rotation(-slope, 4, 'X'))
            strap.matrix_world = Matrix.Translation((0, y0, z_top))
            parts.append(strap)
    handle = L.add_box('hasp', (COAL_X - 0.05, length * 0.6, 0.05), (COAL_X + 0.05, length * 0.66, 0.1), mat_metal, 0.5)
    handle.data.transform(Matrix.Rotation(-slope, 4, 'X'))
    handle.matrix_world = Matrix.Translation((0, y0, z_top))
    parts.append(handle)
    for o in parts:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
    return L.join(parts, 'coal_door')


def keypad():
    """The smart lock's keypad beside the front door (Wren's first 'hello')."""
    body = L.simple_material('NM_KeypadBody', (0.015, 0.015, 0.018), rough=0.35)
    glow = L.simple_material('NM_KeypadGlow', (0.02, 0.03, 0.05), rough=0.3, emission=(0.35, 0.6, 1.0), emission_strength=3.0)
    L.emissive('NM_KeypadGlow', states=('on', 'moon'), color='#5f9dff', strength=3.0)
    x, y, z = -4.38, -1.02, PORCH + 1.18
    b = L.add_box('keypad_body', (x - 0.04, y - 0.028, z - 0.075), (x + 0.04, y, z + 0.075), body)
    g = L.add_box('keypad_glow', (x - 0.028, y - 0.031, z - 0.05), (x + 0.028, y - 0.028, z + 0.055), glow)
    L.nobake(g, cast_shadow=False)
    L.proxy('keypad', (x, y - 0.15, z), (0.45, 0.35, 0.5))
    L.marker('keypad', (x, y - 0.05, z), 180)
    return b


def mailbox(mat_wood, mat_metal):
    x, y = DOOR_X - 2.3, ROAD_Y + 3.6
    z = ground_height(x, y)
    parts = [L.add_box('mb_post', (x - 0.05, y - 0.05, z - 0.3), (x + 0.05, y + 0.05, z + 1.05), mat_wood, 0.5),
             L.add_box('mb_box', (x - 0.12, y - 0.25, z + 1.05), (x + 0.12, y + 0.25, z + 1.3), mat_metal, 0.5),
             L.add_box('mb_flag', (x + 0.12, y + 0.05, z + 1.12), (x + 0.14, y + 0.09, z + 1.42), L.simple_material('NM_MailFlag', (0.5, 0.04, 0.03), 0.5), 0.5)]
    return L.join(parts, 'mailbox')


# ------------------------------------------------------------------------------------------ build

def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    glass = dress_house()

    snow = L.ph_texture_material('NM_Snow', 'snow_02', res='2k', tint=(0.92, 0.95, 1.0))
    snow_far = L.ph_texture_material('NM_SnowFar', 'snow_02', res='2k', tint=(0.92, 0.95, 1.0))
    trodden = L.ph_texture_material('NM_SnowPath', 'snow_03', res='2k', tint=(0.85, 0.87, 0.9))
    road = L.ph_texture_material('NM_SnowRoad', 'snow_03', res='2k', tint=(0.7, 0.72, 0.76))
    ice = L.ph_texture_material('NM_Ice', 'snow_03', res='2k', rough=0.3, tint=(0.34, 0.42, 0.5))
    ice_far = L.ph_texture_material('NM_IceFar', 'snow_03', res='2k', rough=0.3, tint=(0.34, 0.42, 0.5))
    wood = L.ph_texture_material('NM_FenceWood', 'wood_floor_worn', res='2k', tint=(0.5, 0.46, 0.42))
    stone = L.ph_texture_material('NM_Stone', 'rough_concrete', res='1k', tint=(0.55, 0.55, 0.58))
    metal = L.simple_material('NM_BlackMetal', (0.02, 0.02, 0.022), rough=0.45, metal=0.7)

    # ---- ground: detailed around the house, coarse far away (and under the lake)
    NEAR = (-46.0, 40.0, -46.0, 36.0)

    def in_near(x, y):
        return NEAR[0] + 1.0 < x < NEAR[1] - 1.0 and NEAR[2] + 1.0 < y < NEAR[3] - 1.0

    YARD = (-25.75, 20.75, -28.0, 32.0)  # on the same 0.75 m grid, so the seam has no cracks

    def in_yard(x, y):
        return YARD[0] < x < YARD[1] and YARD[2] < y < YARD[3]

    L.tag(grid_terrain('ground_yard', NEAR[0], NEAR[1], NEAR[2], NEAR[3], 0.75, snow, skip=lambda x, y: not in_yard(x, y)), nm_keep_detail=1)
    snow_outer = L.ph_texture_material('NM_SnowOuter', 'snow_02', res='2k', tint=(0.92, 0.95, 1.0))
    L.tag(grid_terrain('ground_near', NEAR[0], NEAR[1], NEAR[2], NEAR[3], 0.75, snow_outer, skip=in_yard), nm_keep_detail=1)
    L.tag(grid_terrain('ground_far', -240, 240, -200, 260, 5.0, snow_far, skip=in_near, drop=0.04), nm_keep_detail=1)

    # ---- the frozen lake: one sheet of ice; the land rises through it at the shores
    L.add_box('lake_near', (-70, 18, ICE), (60, 110, ICE), ice, 7.0, faces={'+z'})
    L.add_box('lake_far_w', (-240, 18, ICE), (-70, 260, ICE), ice_far, 9.0, faces={'+z'})
    L.add_box('lake_far_e', (60, 18, ICE), (240, 260, ICE), ice_far, 9.0, faces={'+z'})
    L.add_box('lake_far_n', (-70, 110, ICE), (60, 260, ICE), ice_far, 9.0, faces={'+z'})

    # ---- paths
    ribbon('front_walk', [(DOOR_X, -6.6), (DOOR_X, -14), (DOOR_X - 0.6, -22), (DOOR_X - 0.6, ROAD_Y + 2.6)], 1.7, trodden)
    ribbon('driveway', [(-13.8, 5.8), (-23.5, 5.8), (-29.5, 1.5), (-31.5, -6), (-31.5, ROAD_Y + 2.6)], 4.2, trodden)
    ribbon('road', [(-130, ROAD_Y), (130, ROAD_Y)], 7.2, road, lift=0.02, step=3.0, uv_tile=6.0)
    ribbon('back_path', [(COAL_X, BACK_WALL + 1.8), (COAL_X + 0.6, 20), (-6.0, 26.0)], 1.2, trodden)

    # ---- fences: the front of the garden, both sides, and the back garden's divide at the house
    fence = [
        split_rail_fence('fence_front_w', [(-41, -26.2), (-33.8, -26.2)], wood),
        split_rail_fence('fence_front_m', [(-29.2, -26.2), (DOOR_X - 1.6, -26.2)], wood),
        split_rail_fence('fence_front_e', [(DOOR_X + 0.6, -26.2), (33, -26.2)], wood),
        split_rail_fence('fence_west', [(-41, -26.2), (-41, 9.2)], wood),
        split_rail_fence('fence_east', [(33, -26.2), (33, 8.2)], wood),
        split_rail_fence('fence_divide_w', [(-41, 9.2), (-14.3, 9.2)], wood),
        split_rail_fence('fence_divide_e', [(4.45, 8.2), (33, 8.2)], wood),
    ]
    for f in fence:
        L.tag(f, nm_collide=1)

    # ---- the dock (Poly Haven modular pier: sections 1-5, deck ~0.45 m above the ice)
    pier_parts = L.ph_model('modular_wooden_pier', (0, 0, 0), join_meshes=False)
    for o in list(pier_parts):
        if o.type == 'MESH' and o.name.startswith(('modular_wooden_pier_planks', 'modular_wooden_pier_poles')):
            pier_parts.remove(o)
            L.delete([o])
    meshes = [o for o in pier_parts if o.type == 'MESH']
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    L.delete([o for o in pier_parts if o.type != 'MESH'])
    pier = L.join(meshes, 'dock')
    L.select_only([pier])
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    pier.data.transform(Matrix.Translation((-6.0, shore_y(-6.0) - 2.6 + 0.43, ICE + 0.45 - 2.63)))
    L.decimate(pier, 30000)
    pier['nm_keep_detail'] = 1

    # ---- the coal door, the keypad, lamps
    bulkhead(wood, stone, metal)
    keypad()
    street = L.ph_model('street_lamp_01', (DOOR_X - 3.4, ROAD_Y + 4.2, ground_height(DOOR_X - 3.4, ROAD_Y + 4.2) - 0.05), yaw_deg=180, name='street_lamp')
    L.decimate(street, 9000)
    street['nm_keep_detail'] = 1
    mailbox(wood, metal)

    # ---- the security camera watching the lake (its picture is the TV's "lake cam")
    cam = L.ph_model('security_camera_01', (-11.9, BACK_WALL + 0.12, GROUND + 3.35), yaw_deg=-12, name='lake_camera')
    L.nocollide(cam)
    L.marker('lakecam', (-11.9, BACK_WALL + 0.35, GROUND + 3.25), -12)
    # the outside speaker Wren shouts from
    spk = L.add_box('house_speaker', (-5.3, BACK_WALL + 0.02, GROUND + 2.9), (-4.9, BACK_WALL + 0.2, GROUND + 3.2), metal)
    L.nocollide(spk)
    L.marker('house_speaker', (-5.1, BACK_WALL + 0.3, GROUND + 3.05), 0)

    # ---- rocks, stumps and a picnic table half buried in the snow
    for (asset, x, y, yaw, s) in (('boulder_01', 9.5, 26.5, 40, 1.1), ('boulder_01', -18.5, 27.5, 190, 0.8),
                                  ('tree_stump_01', 7.5, 17.0, 20, 1.0), ('tree_stump_01', -27.0, 8.0, 80, 1.1),
                                  ('dead_tree_trunk', -14.0, 25.4, 25, 1.0), ('wooden_picnic_table', 4.5, 19.5, 12, 1.0)):
        o = L.ph_model(asset, (x, y, ground_height(x, y) - 0.12), yaw_deg=yaw, scale=s, name=asset)
        L.decimate(o, {'boulder_01': 6000, 'tree_stump_01': 5000, 'dead_tree_trunk': 12000}.get(asset, 8000))
        o['nm_keep_detail'] = 1
        if asset == 'dead_tree_trunk':
            L.nocollide(o)

    # ---- the forest
    img, meta, rects = tree_atlas()
    forest(tree_material(img), meta, rects, tree_spots())

    # ---- invisible walls: the garden, and a long way out onto the lake
    L.wall('wall_south', (-60, -27.2, -3), (60, -26.6, 4))
    L.wall('wall_gate', (DOOR_X - 1.8, -26.8, -3), (DOOR_X + 0.8, -26.4, 4))
    L.wall('wall_drive', (-34.2, -26.8, -3), (-28.8, -26.4, 4))
    L.wall('lake_w', (-26.0, 9.0, -3), (-25.4, 90, 4))
    L.wall('lake_e', (20.0, 8.0, -3), (20.6, 90, 4))
    L.wall('lake_n', (-26.0, 88.0, -3), (20.6, 88.6, 4))

    # ---- doors and story places
    L.proxy('door_front', (DOOR_X, -1.0, PORCH + 1.05), (1.0, 0.3, 2.1), door='front')
    L.marker('door_front', (DOOR_X, -2.2, PORCH), 180, door='front')
    L.proxy('door_back', (2.3, 8.75, BACK_PORCH + 1.05), (1.4, 0.3, 2.1), door='back')
    L.marker('door_back', (2.3, 10.1, BACK_PORCH), 0, door='back')
    L.proxy('door_coal', (COAL_X, BACK_WALL + 0.8, GROUND + 0.5), (1.6, 1.6, 1.0), door='coal')
    L.marker('door_coal', (COAL_X, BACK_WALL + 2.6, ground_height(COAL_X, BACK_WALL + 2.6)), 5, door='coal')
    L.marker('spawn', (DOOR_X - 0.6, ROAD_Y + 5.0, ground_height(DOOR_X - 0.6, ROAD_Y + 5.0)), 0)
    L.marker('title_cam', (-13.0, 40.0, ICE + 1.7), 0)
    L.marker('title_target', (-15.5, 9.0, 1.2), 0)
    L.marker('lakefigure', (-2.5, 49.0, ICE), 188)
    L.marker('ice_1', (-6.5, 38.5, ICE), 0)
    L.marker('jordan', (-5.5, 52.0, ICE), 0)

    # ---- bake lights: moonlight from the south-east, the house lights on, the street lamp
    moon_dir = Vector((-0.55, 0.62, -0.5)).normalized()
    L.light('moon', 'SUN', (0, 0, 30), 0.55, '#aebfff', states=('on', 'moon'), direction=moon_dir, angle_deg=1.2)
    # the house's own lanterns: either side of the front door, the back door and the garage
    for n, (x, y, z) in (('front_l', (-6.96, -1.19, 1.9)), ('front_r', (-4.5, -1.19, 1.9)), ('back_l', (0.8, 9.26, 1.9)),
                         ('back_r', (2.92, 9.04, 1.9)), ('garage_n', (-14.24, 8.5, 1.9)), ('garage_s', (-14.24, 3.05, 1.9))):
        L.light(f'lamp_{n}', 'POINT', (x, y, z), 22, '#ffb872', radius=0.05, states=('on',))
    L.light('porch_fill', 'POINT', (DOOR_X, -3.2, PORCH + 2.6), 14, '#ffc890', radius=0.4, states=('on',))
    sx, sy = DOOR_X - 3.4, ROAD_Y + 4.2
    L.light('street_lamp', 'POINT', (sx, sy, ground_height(sx, sy) + 3.45), 160, '#ffcf8a', radius=0.12, states=('on', 'moon'))

    return {
        'lightmap_size': 2048,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.018, 0.025, 0.05)}, 'moon': {'color': (0.018, 0.025, 0.05)}},
        'exposure': {'on': 1.6, 'moon': 1.8},
        'collision_tris': 150000,
        'lightmap_density': {'NM_SnowFar': 0.08, 'NM_IceFar': 0.05, 'NM_Ice': 0.3, 'NM_SnowRoad': 0.4, 'NM_SnowOuter': 0.45},
        'lightmap_margin': 2,
        'nobake_small_parts': 0.02,
        # the woods keep their detail; ground and dock textures tile, props are small
        'texture_caps': [('tree_atlas', 2048), ('(snow_0[23]|pier|wood_floor)', 1024), ('Rough|arm', 512), ('.', 512)],
        'sky': {'hdri': 'snowy_forest_path_01', 'intensity': 0.05, 'tint': [0.42, 0.55, 1.0]},
    }
