"""
Helpers shared by the NIGHT MODE room build scripts (tools/blender/rooms/*.py), run inside Blender 4.5.

Conventions of the exported rooms (read by src/world/Cell.ts):
  M_<name>        empty: a marker (spawn points, door arrival points, sound and light positions)
  I_<id>          invisible box: something the player can interact with (extras.interact = id)
  DYN_<name>      mesh that moves or hides at runtime (not lightmapped; lit by real-time lights)
  COL_static      invisible collision mesh generated from the room
  everything else static, joined and lightmapped
Custom properties become glTF extras. Blender is Z-up; the glTF exporter converts to Y-up.
Yaw angles here are degrees about +Z; 0 faces +Y (the game's forward after export).
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DOWNLOADS = os.path.join(ROOT, 'assets-src', 'downloads')
POLYHAVEN = os.path.join(DOWNLOADS, 'polyhaven')
BITTERLI = os.path.join(DOWNLOADS, 'bitterli')


def log(msg):
    print(f'[room] {msg}', flush=True)


# ------------------------------------------------------------------------------------------ objects

def mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']


def base_name(name):
    head, _, tail = name.rpartition('.')
    return head if head and tail.isdigit() else name


def by_material(*names):
    names = set(names)
    return [o for o in mesh_objects() if any(s.material and base_name(s.material.name) in names for s in o.material_slots)]


def by_prefix(prefix):
    return [o for o in bpy.context.scene.objects if o.name.startswith(prefix)]


def world_bbox(objs):
    if not isinstance(objs, (list, tuple, set)):
        objs = [objs]
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def in_box(lo, hi, objs=None):
    """Objects whose bounding-box centre lies inside the box (lo, hi)."""
    lo, hi = Vector(lo), Vector(hi)
    out = []
    for o in objs if objs is not None else mesh_objects():
        a, b = world_bbox(o)
        c = (a + b) / 2
        if all(lo[i] <= c[i] <= hi[i] for i in range(3)):
            out.append(o)
    return out


def delete_faces_in_box(objs, lo, hi):
    """Deletes the faces (of the given objects) whose centre lies inside the world-space box."""
    lo, hi = Vector(lo), Vector(hi)
    total = 0
    for o in objs:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        mw = o.matrix_world
        doomed = [f for f in bm.faces if all(lo[i] <= (mw @ f.calc_center_median())[i] <= hi[i] for i in range(3))]
        if doomed:
            bmesh.ops.delete(bm, geom=doomed, context='FACES')
            bm.to_mesh(o.data)
            o.data.update()
            total += len(doomed)
        bm.free()
    return total


def select_only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0] if objs else None


def delete(objs):
    for o in list(objs):
        bpy.data.objects.remove(o, do_unlink=True)


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def tag(obj, **props):
    for k, v in props.items():
        obj[k] = v
    return obj


def nobake(obj, cast_shadow=True):
    obj['nm_nobake'] = 1
    obj.visible_shadow = cast_shadow
    return obj


def dynamic(obj, name=None):
    """Moves or hides at runtime: kept as its own node, never joined or lightmapped."""
    if name:
        obj.name = name if name.startswith('DYN_') else f'DYN_{name}'
    obj['nm_nobake'] = 1
    obj['nm_dynamic'] = 1
    return obj


def wall(name, lo, hi):
    """An invisible wall: part of the collision mesh only (deleted after the collision is built)."""
    o = add_box(name, lo, hi)
    o['nm_nobake'] = 1
    o['nm_collide'] = 1
    o['nm_collision_only'] = 1
    o.hide_render = True
    return o


def screen_from_material(obj, material_name, name, offset=0.002, inset=0.0):
    """A flat quad (UVs 0..1, u to the right as seen from the front) over the faces of obj that use a
    material: the display of a laptop or monitor, ready to become a live screen (DYN_*_screen)."""
    mw = obj.matrix_world
    rot = mw.to_3x3()
    faces = [p for p in obj.data.polygons
             if p.material_index < len(obj.material_slots) and obj.material_slots[p.material_index].material
             and base_name(obj.material_slots[p.material_index].material.name) == material_name]
    if not faces:
        log(f'WARNING: no faces with material {material_name} on {obj.name}')
        return None
    n = Vector()
    for p in faces:
        n += (rot @ p.normal) * p.area
    n.normalize()
    pts = [mw @ obj.data.vertices[v].co for p in faces for v in p.vertices]
    c = sum(pts, Vector()) / len(pts)
    up = Vector((0, 0, 1))
    up = (up - n * up.dot(n)).normalized()
    r = up.cross(n)
    us = [(q - c).dot(r) for q in pts]
    vs = [(q - c).dot(up) for q in pts]
    u0, u1, v0, v1 = min(us) + inset, max(us) - inset, min(vs) + inset, max(vs) - inset
    depth = max((q - c).dot(n) for q in pts)
    base = c + n * (depth + offset)
    corners = [base + r * u0 + up * v0, base + r * u1 + up * v0, base + r * u1 + up * v1, base + r * u0 + up * v1]
    q = add_quad(name, corners)
    uv = q.data.uv_layers[0]
    for li, (u, v) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = (u, v)
    return q


def surface_z(x, y, z_from=3.0, default=0.0):
    """Height of the first surface below (x, y, z_from): for standing props on tables and counters."""
    dg = bpy.context.evaluated_depsgraph_get()
    hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((x, y, z_from)), Vector((0, 0, -1)))
    return loc.z if hit else default


def hidden(obj):
    """Starts invisible in the game (the story shows it later)."""
    obj['hidden'] = 1
    return obj


def nocollide(obj):
    obj['nm_nocollide'] = 1
    return obj


def join(objs, name):
    objs = [o for o in objs if o.type == 'MESH']
    if not objs:
        return None
    select_only(objs)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def apply_transforms(obj):
    select_only([obj])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def set_origin(obj, point):
    """Moves the object's origin (pivot) to a world-space point without moving its geometry."""
    point = Vector(point)
    inv = obj.matrix_world.inverted()
    local = inv @ point
    obj.data.transform(Matrix.Translation(-local))
    obj.matrix_world = obj.matrix_world @ Matrix.Translation(local)


def decimate(obj, target_tris):
    n = tris(obj)
    if n <= target_tris:
        return n
    mod = obj.modifiers.new('nm_decimate', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = max(0.005, target_tris / n)
    mod.use_collapse_triangulate = True
    select_only([obj])
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return tris(obj)


# ---------------------------------------------------------------------------------------- materials

def material(name):
    mats = [m for m in bpy.data.materials if base_name(m.name) == name]
    if not mats:
        raise KeyError(f'no material {name}')
    return mats[0]


def _principled(mat):
    mat.use_nodes = True
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def simple_material(name, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    b = _principled(mat)
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emission is not None:
        b.inputs['Emission Color'].default_value = (*emission, 1.0)
        b.inputs['Emission Strength'].default_value = emission_strength
    return mat


def image_material(name, color_path, normal_path=None, rough_path=None, rough=0.6, tint=None, normal_strength=1.0):
    """PBR material from image files (UVs come from the mesh, e.g. cube_uv for built geometry)."""
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    b = _principled(mat)
    nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(color_path, check_existing=True)
    tex.location = (-600, 300)
    if tint:
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = (*tint, 1.0)
        nt.links.new(tex.outputs['Color'], mix.inputs[6])
        nt.links.new(mix.outputs[2], b.inputs['Base Color'])
    else:
        nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    if rough_path and os.path.exists(rough_path):
        rt = nt.nodes.new('ShaderNodeTexImage')
        rt.image = bpy.data.images.load(rough_path, check_existing=True)
        rt.image.colorspace_settings.name = 'Non-Color'
        rt.location = (-600, 0)
        nt.links.new(rt.outputs['Color'], b.inputs['Roughness'])
    else:
        b.inputs['Roughness'].default_value = rough
    if normal_path and os.path.exists(normal_path):
        nm_tex = nt.nodes.new('ShaderNodeTexImage')
        nm_tex.image = bpy.data.images.load(normal_path, check_existing=True)
        nm_tex.image.colorspace_settings.name = 'Non-Color'
        nm_tex.location = (-600, -300)
        nmap = nt.nodes.new('ShaderNodeNormalMap')
        nmap.inputs['Strength'].default_value = normal_strength
        nt.links.new(nm_tex.outputs['Color'], nmap.inputs['Color'])
        nt.links.new(nmap.outputs['Normal'], b.inputs['Normal'])
    return mat


def ph_texture_material(name, tex_id, res='2k', rough=None, tint=None, normal_strength=1.0):
    d = os.path.join(POLYHAVEN, 'textures', tex_id)
    color = os.path.join(d, f'{tex_id}_Diffuse_{res}.jpg')
    if not os.path.exists(color):
        color = os.path.join(d, f'{tex_id}_Diffuse_1k.jpg')
        res = '1k'
    return image_material(name, color, os.path.join(d, f'{tex_id}_nor_gl_{res}.jpg'),
                          None if rough is not None else os.path.join(d, f'{tex_id}_Rough_{res}.jpg'),
                          rough=rough if rough is not None else 0.6, tint=tint, normal_strength=normal_strength)


# --------------------------------------------------------------------------------------- geometry

def cube_uv(obj, metres_per_tile=1.0):
    """Box-projects UVs from world coordinates: textures tile every `metres_per_tile` metres."""
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    mw = obj.matrix_world
    rot = mw.to_3x3()
    for f in bm.faces:
        n = (rot @ f.normal).normalized()
        ax = max(range(3), key=lambda i: abs(n[i]))
        for loop in f.loops:
            p = mw @ loop.vert.co
            if ax == 0:
                u, v = (p.y if n.x > 0 else -p.y), p.z
            elif ax == 1:
                u, v = (-p.x if n.y > 0 else p.x), p.z
            else:
                u, v = p.x, (p.y if n.z > 0 else -p.y)
            loop[uv].uv = (u / metres_per_tile, v / metres_per_tile)
    bm.to_mesh(me)
    bm.free()


def add_box(name, lo, hi, mat=None, uv_tile=1.0, faces='all'):
    """Axis-aligned box from world corner lo to hi. faces: 'all' or a set of '+x','-x','+y','-y','+z','-z'
    to keep (e.g. only the inward faces of a room)."""
    lo, hi = Vector(lo), Vector(hi)
    me = bpy.data.meshes.new(name)
    v = [(lo.x, lo.y, lo.z), (hi.x, lo.y, lo.z), (hi.x, hi.y, lo.z), (lo.x, hi.y, lo.z),
         (lo.x, lo.y, hi.z), (hi.x, lo.y, hi.z), (hi.x, hi.y, hi.z), (lo.x, hi.y, hi.z)]
    all_faces = {'-z': (0, 3, 2, 1), '+z': (4, 5, 6, 7), '-y': (0, 1, 5, 4), '+x': (1, 2, 6, 5),
                 '+y': (2, 3, 7, 6), '-x': (3, 0, 4, 7)}
    keep = all_faces if faces == 'all' else {k: all_faces[k] for k in faces}
    me.from_pydata(v, [], list(keep.values()))
    me.update()
    o = link(bpy.data.objects.new(name, me))
    if mat:
        me.materials.append(mat)
    cube_uv(o, uv_tile)
    return o


def add_quad(name, corners, mat=None, uv_tile=1.0):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(c) for c in corners], [], [(0, 1, 2, 3)])
    me.update()
    o = link(bpy.data.objects.new(name, me))
    if mat:
        me.materials.append(mat)
    cube_uv(o, uv_tile)
    return o


def room_shell(name, lo, hi, wall_mat, floor_mat, ceiling_mat, uv_wall=1.0, uv_floor=1.0):
    """Walls, floor and ceiling of a rectangular room, facing inwards."""
    lo, hi = Vector(lo), Vector(hi)
    walls = add_box(f'{name}_walls', lo, hi, wall_mat, uv_wall, faces={'+x', '-x', '+y', '-y'})
    flip_normals(walls)  # box faces point outwards; a room is seen from inside
    floor = add_box(f'{name}_floor', lo, (hi.x, hi.y, lo.z), floor_mat, uv_floor, faces={'+z'})
    ceil = add_box(f'{name}_ceiling', (lo.x, lo.y, hi.z), hi, ceiling_mat, uv_wall, faces={'-z'})
    return walls, floor, ceil


def flip_normals(o):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()


def yaw_matrix(yaw_deg):
    return Matrix.Rotation(math.radians(yaw_deg), 4, 'Z')


# ------------------------------------------------------------------------------------ imported props

def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def ph_model(asset_id, location, yaw_deg=0.0, scale=1.0, name=None, join_meshes=True, tilt=(0.0, 0.0)):
    """Imports a Poly Haven model at a world position. Returns one joined mesh object (join_meshes)
    or the list of imported objects (for rigged/animated assets)."""
    path = os.path.join(POLYHAVEN, 'models', asset_id, f'{asset_id}.gltf')
    new = import_gltf(path)
    roots = [o for o in new if o.parent is None]
    m = Matrix.Translation(Vector(location)) @ yaw_matrix(yaw_deg) @ \
        Matrix.Rotation(math.radians(tilt[0]), 4, 'X') @ Matrix.Rotation(math.radians(tilt[1]), 4, 'Y') @ \
        Matrix.Diagonal((scale, scale, scale, 1.0))
    for r in roots:
        r.matrix_world = m @ r.matrix_world
    bpy.context.view_layer.update()
    if not join_meshes:
        return new
    meshes = [o for o in new if o.type == 'MESH']
    for o in meshes:  # bake the hierarchy's transforms into the meshes
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    delete([o for o in new if o.type != 'MESH'])
    obj = join(meshes, name or asset_id)
    select_only([obj])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


# ------------------------------------------------------------------------------ markers and proxies

def marker(name, location, yaw_deg=0.0, **props):
    """An empty the game reads by name (M_<name>). It faces +Y rotated by yaw."""
    e = bpy.data.objects.new(name if name.startswith('M_') else f'M_{name}', None)
    e.empty_display_type = 'ARROWS'
    e.empty_display_size = 0.3
    e.location = Vector(location)
    e.rotation_euler = (0, 0, math.radians(yaw_deg))
    for k, v in props.items():
        e[k] = v
    return link(e)


def proxy(interact_id, center, size, yaw_deg=0.0, **props):
    """Invisible interaction volume I_<id> (the game ray-casts against these)."""
    sx, sy, sz = size
    o = add_box(f'I_{interact_id}', (-sx / 2, -sy / 2, -sz / 2), (sx / 2, sy / 2, sz / 2))
    o.location = Vector(center)
    o.rotation_euler = (0, 0, math.radians(yaw_deg))
    o['interact'] = interact_id
    for k, v in props.items():
        o[k] = v
    o['nm_nobake'] = 1
    o['nm_nocollide'] = 1
    o.display_type = 'WIRE'
    o.hide_render = True
    return o


# ---------------------------------------------------------------------------------------------- doors

def cut_trim(T, w, h, depth=0.25):
    """Removes wall trim (chair rails, skirting boards) inside a doorway. T: door frame matrix (origin at
    the wall surface, bottom centre, +Y into the room). Geometry is split at the doorway edges and the
    faces in front of the wall inside the doorway are deleted; the wall surface itself (y = 0) stays."""
    lo = Vector((-w / 2, 0.002, 0.005))
    hi = Vector((w / 2, depth, h))
    corners = [T @ Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    wlo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    whi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    cut = 0
    for o in mesh_objects():
        if o.get('nm_dynamic') or o.name.startswith(('I_', 'door_', 'DYN_')):
            continue
        blo, bhi = world_bbox(o)
        if any(bhi[i] < wlo[i] or blo[i] > whi[i] for i in range(3)):
            continue
        M = T.inverted() @ o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bm.transform(M)
        for co, no in (((lo.x, 0, 0), (1, 0, 0)), ((hi.x, 0, 0), (1, 0, 0)), ((0, 0, hi.z), (0, 0, 1))):
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
        inside = []
        for f in bm.faces:
            c = f.calc_center_median()
            if all(lo[i] <= c[i] <= hi[i] for i in range(3)):
                inside.append(f)
        if inside:
            bmesh.ops.delete(bm, geom=inside, context='FACES')
            cut += 1
        bm.transform(M.inverted())
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    return cut


def door_materials(trim=None):
    """The house's doors all match the hall's: stained panel doors, painted trim, brass knobs."""
    tex = os.path.join(BITTERLI, 'staircase', 'staircase', 'textures', 'WoodPanel.jpg')
    wood = image_material('NM_DoorWood', tex, rough=0.42, tint=(0.62, 0.5, 0.42))
    trim = trim or simple_material('NM_DoorTrim', (0.7, 0.68, 0.64), rough=0.45)
    brass = simple_material('NM_Brass', (0.62, 0.45, 0.2), rough=0.3, metal=1.0)
    return wood, trim, brass


def split_faces_in_box(obj, lo, hi, name):
    """Separates the faces of obj whose centres lie inside a world box into a new object."""
    lo, hi = Vector(lo), Vector(hi)
    select_only([obj])
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(obj.data)
    mw = obj.matrix_world
    n = 0
    for f in bm.faces:
        c = mw @ f.calc_center_median()
        f.select = all(lo[i] <= c[i] <= hi[i] for i in range(3))
        n += f.select
    bmesh.update_edit_mesh(obj.data)
    if n:
        bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = [o for o in bpy.context.selected_objects if o is not obj]
    if not parts:
        return None
    parts[0].name = name
    return parts[0]


def make_door(door_id, bottom_center, yaw_deg, wood, trim, brass, width=0.86, height=2.05, hinge='left',
              dark=None, locked_look=False):
    """A Victorian four-panel door mounted on a wall. bottom_center: the wall surface at floor level,
    centre of the doorway; yaw: direction the door faces (into the room).
    Produces: static casing (lightmapped), DYN_door_<id> leaf (pivot at the hinge), a dark plane behind
    the leaf (seen when it opens), I_door_<id> proxy and M_door_<id> arrival marker."""
    T = Matrix.Translation(Vector(bottom_center)) @ yaw_matrix(yaw_deg)
    w, h, t = width, height, 0.045
    n_cut = cut_trim(T, w + 0.21, h + 0.2)
    if n_cut:
        log(f'door {door_id}: cut trim from {n_cut} object(s)')
    front = 0.014  # leaf front face sits this far off the wall; casing protrudes further
    parts = []

    def box(name, lo, hi, mat):
        o = add_box(name, lo, hi, mat, uv_tile=1.0)
        parts.append(o)
        return o

    # --- casing (architrave), plinth blocks and head
    cw, ct = 0.095, 0.024
    casing = []
    for side in (-1, 1):
        x0 = side * (w / 2) + (0 if side > 0 else -cw)
        casing.append(box(f'casing_{side}', (x0, 0, 0.12), (x0 + cw, ct, h + 0.02), trim))
        casing.append(box(f'plinth_{side}', (x0 - 0.008, 0, 0), (x0 + cw + 0.008, ct + 0.008, 0.2), trim))
    casing.append(box('head', (-w / 2 - cw - 0.02, 0, h + 0.02), (w / 2 + cw + 0.02, ct + 0.006, h + 0.15), trim))
    casing.append(box('head_cap', (-w / 2 - cw - 0.04, 0, h + 0.15), (w / 2 + cw + 0.04, ct + 0.03, h + 0.18), trim))
    for o in casing:
        o.data.transform(T)
        o.matrix_world = Matrix.Identity(4)
    casing_obj = join(casing, f'door_{door_id}_casing')
    bev = casing_obj.modifiers.new('bevel', 'BEVEL')
    bev.width = 0.004
    bev.segments = 2
    select_only([casing_obj])
    bpy.ops.object.modifier_apply(modifier=bev.name)

    # --- dark doorway behind the leaf
    dark_mat = dark or simple_material('NM_Doorway', (0.0, 0.0, 0.0), rough=1.0)
    gap = add_quad(f'door_{door_id}_gap', [(-w / 2, 0.003, 0), (w / 2, 0.003, 0), (w / 2, 0.003, h), (-w / 2, 0.003, h)], dark_mat)
    gap.data.transform(T)
    nobake(gap, cast_shadow=False)
    gap.name = f'door_{door_id}_gap'

    # --- leaf: stiles, rails, muntin, recessed panels, mouldings (local: hinge at x=0)
    lw = w - 0.006
    lp = []

    def lbox(name, lo, hi, mat):
        o = add_box(name, lo, hi, mat, uv_tile=1.0)
        lp.append(o)
        return o

    y0, y1 = front - t + 0.004, front + 0.004
    st, rt, rl, rb, mu = 0.115, 0.115, 0.19, 0.23, 0.1
    lbox('stile_l', (0, y0, 0.004), (st, y1, h - 0.004), wood)
    lbox('stile_r', (lw - st, y0, 0.004), (lw, y1, h - 0.004), wood)
    lbox('rail_top', (st, y0, h - rt), (lw - st, y1, h - 0.004), wood)
    lock_z = 0.93
    lbox('rail_lock', (st, y0, lock_z - rl / 2), (lw - st, y1, lock_z + rl / 2), wood)
    lbox('rail_bottom', (st, y0, 0.004), (lw - st, y1, rb), wood)
    mid = lw / 2
    lbox('muntin_up', (mid - mu / 2, y0, lock_z + rl / 2), (mid + mu / 2, y1, h - rt), wood)
    lbox('muntin_lo', (mid - mu / 2, y0, rb), (mid + mu / 2, y1, lock_z - rl / 2), wood)
    pt = 0.012
    for (x_a, x_b) in ((st, mid - mu / 2), (mid + mu / 2, lw - st)):
        for (z_a, z_b) in ((lock_z + rl / 2, h - rt), (rb, lock_z - rl / 2)):
            lbox('panel', (x_a, y1 - t / 2 - pt, z_a), (x_b, y1 - t / 2 + pt, z_b), wood)
            m = 0.014
            lbox('mould_b', (x_a, y1 - 0.012, z_a), (x_b, y1 - 0.002, z_a + m), wood)
            lbox('mould_t', (x_a, y1 - 0.012, z_b - m), (x_b, y1 - 0.002, z_b), wood)
            lbox('mould_l', (x_a, y1 - 0.012, z_a), (x_a + m, y1 - 0.002, z_b), wood)
            lbox('mould_r', (x_b - m, y1 - 0.012, z_a), (x_b, y1 - 0.002, z_b), wood)
    # knob side is opposite the hinge
    kx = lw - 0.075
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.027, segments=20, ring_count=12, location=(kx, y1 + 0.058, lock_z))
    knob = bpy.context.active_object
    knob.name = 'knob'
    knob.data.materials.append(brass)
    lp.append(knob)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.009, depth=0.05, location=(kx, y1 + 0.028, lock_z), rotation=(math.pi / 2, 0, 0))
    stem = bpy.context.active_object
    stem.data.materials.append(brass)
    lp.append(stem)
    lbox('plate', (kx - 0.022, y1, lock_z - 0.09), (kx + 0.022, y1 + 0.006, lock_z + 0.05), brass)
    lbox('keyhole', (kx - 0.004, y1 + 0.006, lock_z - 0.07), (kx + 0.004, y1 + 0.008, lock_z - 0.045), dark_mat)
    for hz in (0.25, 1.05, h - 0.3):
        lbox('hinge', (-0.004, y1 - 0.01, hz), (0.02, y1 + 0.004, hz + 0.1), brass)
    leaf = join(lp, f'DYN_door_{door_id}')
    for p in leaf.data.polygons:
        p.use_smooth = False
    bev = leaf.modifiers.new('bevel', 'BEVEL')
    bev.width = 0.003
    bev.segments = 1
    bev.limit_method = 'ANGLE'
    select_only([leaf])
    bpy.ops.object.modifier_apply(modifier=bev.name)
    # leaf local frame -> world. Hinge 'left' = the doorway's local -X edge; 'right' mirrors the leaf.
    if hinge == 'left':
        leaf.matrix_world = T @ Matrix.Translation((-w / 2 + 0.003, 0, 0))
        leaf['open_sign'] = -1.0  # rotating about +Z by a negative angle swings it away from the room
    else:
        leaf.data.transform(Matrix.Diagonal((-1, 1, 1, 1)))
        flip_normals(leaf)
        leaf.matrix_world = T @ Matrix.Translation((w / 2 - 0.003, 0, 0))
        leaf['open_sign'] = 1.0
    dynamic(leaf)
    leaf['door'] = door_id
    leaf['hinge'] = hinge

    fwd = (T.to_3x3() @ Vector((0, 1, 0))).normalized()
    centre = Vector(bottom_center) + fwd * 0.08 + Vector((0, 0, h / 2))
    proxy(f'door_{door_id}', centre, (w, 0.2, h), yaw_deg, door=door_id)
    arrive = Vector(bottom_center) + fwd * 0.85
    marker(f'M_door_{door_id}', (arrive.x, arrive.y, bottom_center[2]), yaw_deg, door=door_id)
    return casing_obj, leaf


# ------------------------------------------------------------------------------------------ lights

def srgb(hex_color):
    h = hex_color.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def light(name, kind, location, power, color='#ffffff', radius=0.05, states=('on',), direction=None, spot_deg=90,
          angle_deg=2.0, runtime=None):
    """A bake light, active in the given lighting states. runtime={'intensity':..,'distance':..} also
    exports a marker so the game adds a matching real-time light (for flicker / moving objects)."""
    data = bpy.data.lights.new(name, kind)
    data.color = srgb(color)
    if kind == 'SUN':
        data.energy = power
        data.angle = math.radians(angle_deg)
    else:
        data.energy = power
        data.shadow_soft_size = radius
        if kind == 'SPOT':
            data.spot_size = math.radians(spot_deg)
            data.spot_blend = 0.6
    o = link(bpy.data.objects.new(name, data))
    o.location = Vector(location)
    if direction is not None:
        o.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
    o['nm_states'] = ','.join(states)
    if runtime:
        marker(f'M_light_{name}', location, 0, light=kind.lower(), color=color, states=','.join(states), **runtime)
    return o


def emissive(material_name, states=('on',), color='#ffd7a0', strength=6.0):
    """Marks a material as glowing in the given states (lampshades, bulbs, screens)."""
    for m in [m for m in bpy.data.materials if base_name(m.name) == material_name]:
        m['nm_emit_states'] = ','.join(states)
        m['nm_emit_color'] = color
        m['nm_emit_strength'] = strength


def set_world(color=(0.01, 0.012, 0.02), strength=1.0, hdri=None, hdri_strength=1.0, rotation_deg=0.0, tint=(1, 1, 1)):
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    bg = nt.nodes.new('ShaderNodeBackground')
    out = nt.nodes.new('ShaderNodeOutputWorld')
    if hdri:
        coord = nt.nodes.new('ShaderNodeTexCoord')
        mapping = nt.nodes.new('ShaderNodeMapping')
        env = nt.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(hdri, check_existing=True)
        mapping.inputs['Rotation'].default_value[2] = math.radians(rotation_deg)
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = (*tint, 1)
        nt.links.new(coord.outputs['Generated'], mapping.inputs['Vector'])
        nt.links.new(mapping.outputs['Vector'], env.inputs['Vector'])
        nt.links.new(env.outputs['Color'], mix.inputs[6])
        nt.links.new(mix.outputs[2], bg.inputs['Color'])
        bg.inputs['Strength'].default_value = hdri_strength
    else:
        bg.inputs['Color'].default_value = (*color, 1)
        bg.inputs['Strength'].default_value = strength
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    return world


def hdri_path(asset_id, res='2k'):
    return os.path.join(POLYHAVEN, 'hdris', f'{asset_id}_{res}.hdr')
