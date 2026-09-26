"""
Imports a Mitsuba 3 scene (scene_v3.xml + OBJ meshes + textures), as published on
https://benedikt-bitterli.me/resources/, into Blender and saves it as a .blend file.

    blender --background --factory-startup --python tools/blender/import_mitsuba.py -- \
        --scene path/to/scene_v3.xml --output assets-src/work/hall.blend

What it converts:
  - shapes: obj, ply, rectangle, cube, sphere, disk (with their to_world transforms)
  - BSDFs -> Principled BSDF: diffuse, (rough)plastic, (rough)conductor, (thin/rough)dielectric,
    twosided, mask (alpha cut-out), bumpmap, normalmap, blendbsdf, principled
  - area emitters -> kept as hidden EMITTER_ objects (they mark the renderer's window lights)
  - the camera (sensor) -> a Blender camera named "ReferenceCamera"
Coordinates: Mitsuba is Y-up like glTF; objects are converted to Blender's Z-up.

Materials that are glass get the custom property sosies_glass = 1 (the game renders them itself and the
bake ignores them); objects with a glass material get sosies_nobake and don't cast baked shadows.
"""
import argparse
import math
import os
import sys
import time
import xml.etree.ElementTree as ET

import bpy
from mathutils import Matrix, Vector

Y_UP_TO_Z_UP = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

# Approximate linear-RGB reflectance at normal incidence for Mitsuba's named conductors.
NAMED_METALS = {
    'Al': (0.913, 0.922, 0.924), 'Ag': (0.972, 0.960, 0.915), 'Au': (1.0, 0.766, 0.336),
    'Cu': (0.955, 0.638, 0.538), 'Cr': (0.549, 0.556, 0.554), 'Fe': (0.562, 0.565, 0.578),
    'Ti': (0.542, 0.497, 0.449), 'Ni': (0.660, 0.609, 0.526), 'none': (1.0, 1.0, 1.0),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--scene', required=True)
    p.add_argument('--output', required=True)
    return p.parse_args(argv)


def floats(text):
    return [float(v) for v in text.replace(',', ' ').split()]


def child(el, name):
    for c in el:
        if c.get('name') == name:
            return c
    return None


def value(el, name, default=None):
    c = child(el, name)
    if c is None:
        return default
    if c.tag in ('float', 'integer'):
        return float(c.get('value'))
    if c.tag == 'boolean':
        return c.get('value') == 'true'
    if c.tag == 'string':
        return c.get('value')
    return default


def spectrum(el, name, base_dir, default=None):
    """Returns ('rgb', (r, g, b)) or ('tex', path, raw) or default."""
    c = child(el, name)
    if c is None:
        return default
    if c.tag == 'rgb':
        v = floats(c.get('value'))
        return ('rgb', tuple(v if len(v) == 3 else v * 3))
    if c.tag in ('float', 'spectrum'):
        v = floats(c.get('value'))[0]
        return ('rgb', (v, v, v))
    if c.tag == 'texture':
        if c.get('type') == 'bitmap':
            return ('tex', os.path.join(base_dir, value(c, 'filename')), bool(value(c, 'raw', False)))
        if c.get('type') == 'checkerboard':
            a = spectrum(c, 'color0', base_dir, ('rgb', (0.4, 0.4, 0.4)))
            b = spectrum(c, 'color1', base_dir, ('rgb', (0.2, 0.2, 0.2)))
            if a[0] == 'rgb' and b[0] == 'rgb':
                return ('rgb', tuple((x + y) / 2 for x, y in zip(a[1], b[1])))
    return default


def transform(el):
    """Composes a <transform name="to_world"> element into a 4x4 matrix (Mitsuba convention)."""
    m = Matrix.Identity(4)
    t = child(el, 'to_world')
    if t is None:
        return m
    for op in t:
        if op.tag == 'matrix':
            v = floats(op.get('value'))
            op_m = Matrix([v[0:4], v[4:8], v[8:12], v[12:16]])
        elif op.tag == 'translate':
            if op.get('value'):
                x, y, z = floats(op.get('value'))
            else:
                x, y, z = (float(op.get(k, 0)) for k in 'xyz')
            op_m = Matrix.Translation((x, y, z))
        elif op.tag == 'scale':
            if op.get('value'):
                v = floats(op.get('value'))
                s = v * 3 if len(v) == 1 else v
            else:
                s = [float(op.get(k, 1)) for k in 'xyz']
            op_m = Matrix.Diagonal((*s, 1.0))
        elif op.tag == 'rotate':
            if op.get('value'):
                axis = Vector(floats(op.get('value')))
            else:
                axis = Vector([float(op.get(k, 0)) for k in 'xyz'])
            op_m = Matrix.Rotation(math.radians(float(op.get('angle'))), 4, axis.normalized())
        elif op.tag == 'lookat':
            origin = Vector(floats(op.get('origin')))
            target = Vector(floats(op.get('target')))
            up = Vector(floats(op.get('up', '0 1 0')))
            d = (target - origin).normalized()
            left = up.normalized().cross(d).normalized()
            new_up = d.cross(left)
            op_m = Matrix((
                (left.x, new_up.x, d.x, origin.x),
                (left.y, new_up.y, d.y, origin.y),
                (left.z, new_up.z, d.z, origin.z),
                (0, 0, 0, 1)))
        else:
            continue
        m = op_m @ m
    return m


class MaterialFactory:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.images = {}
        self.cache = {}

    def image(self, path, raw):
        key = (path, raw)
        if key not in self.images:
            if not os.path.exists(path):
                print(f'  missing texture {path}')
                self.images[key] = None
            else:
                img = bpy.data.images.load(path, check_existing=True)
                if raw:
                    img.colorspace_settings.name = 'Non-Color'
                self.images[key] = img
        return self.images[key]

    def params(self, el, out):
        t = el.get('type')
        inner = el.find('bsdf')
        if t == 'twosided':
            out['twosided'] = True
            if inner is not None:
                self.params(inner, out)
        elif t == 'bumpmap':
            tex = el.find('texture')
            if tex is not None and tex.get('type') == 'bitmap':
                out['bump'] = os.path.join(self.base_dir, value(tex, 'filename'))
            if inner is not None:
                self.params(inner, out)
        elif t == 'normalmap':
            tex = el.find('texture')
            if tex is not None and tex.get('type') == 'bitmap':
                out['normal'] = os.path.join(self.base_dir, value(tex, 'filename'))
            if inner is not None:
                self.params(inner, out)
        elif t == 'mask':
            out['alpha'] = spectrum(el, 'opacity', self.base_dir, ('rgb', (0.5, 0.5, 0.5)))
            if inner is not None:
                self.params(inner, out)
        elif t == 'blendbsdf':
            kids = el.findall('bsdf')
            w = value(el, 'weight', 0.5)
            pick = kids[1] if (isinstance(w, float) and w > 0.5 and len(kids) > 1) else kids[0]
            self.params(pick, out)
        elif t in ('diffuse', 'roughdiffuse'):
            out['color'] = spectrum(el, 'reflectance', self.base_dir, ('rgb', (0.5, 0.5, 0.5)))
            out['rough'] = 0.9
            out['spec'] = 0.25
        elif t in ('plastic', 'roughplastic'):
            out['color'] = spectrum(el, 'diffuse_reflectance', self.base_dir, ('rgb', (0.5, 0.5, 0.5)))
            alpha = value(el, 'alpha', 0.1 if t == 'roughplastic' else 0.0)
            out['rough'] = max(0.06, math.sqrt(alpha)) if t == 'roughplastic' else 0.08
            out['spec'] = 0.5
        elif t in ('conductor', 'roughconductor'):
            eta = spectrum(el, 'eta', self.base_dir)
            k = spectrum(el, 'k', self.base_dir)
            name = value(el, 'material', None)
            if eta and k and eta[0] == 'rgb' and k[0] == 'rgb':
                f0 = tuple(((n - 1) ** 2 + kk ** 2) / ((n + 1) ** 2 + kk ** 2) for n, kk in zip(eta[1], k[1]))
            else:
                f0 = NAMED_METALS.get(name or 'Al', NAMED_METALS['Al'])
            spec = spectrum(el, 'specular_reflectance', self.base_dir, ('rgb', (1, 1, 1)))
            if spec[0] == 'rgb':
                out['color'] = ('rgb', tuple(a * b for a, b in zip(f0, spec[1])))
            else:
                out['color'] = spec
            out['metal'] = 1.0
            alpha = value(el, 'alpha', 0.0 if t == 'conductor' else 0.1)
            out['rough'] = max(0.04, math.sqrt(alpha)) if t == 'roughconductor' else 0.04
        elif t in ('dielectric', 'thindielectric', 'roughdielectric'):
            out['glass'] = True
            out['ior'] = value(el, 'int_ior', 1.5) if isinstance(value(el, 'int_ior', 1.5), float) else 1.5
            alpha = value(el, 'alpha', 0.0)
            out['rough'] = math.sqrt(alpha) if t == 'roughdielectric' else 0.0
            out['color'] = ('rgb', (1, 1, 1))
        elif t == 'principled':
            out['color'] = spectrum(el, 'base_color', self.base_dir, ('rgb', (0.5, 0.5, 0.5)))
            out['rough'] = value(el, 'roughness', 0.5)
            out['metal'] = value(el, 'metallic', 0.0)
            if value(el, 'spec_trans', 0.0) > 0.5:
                out['glass'] = True
        else:
            print(f'  unknown bsdf type {t}; using grey diffuse')
            out.setdefault('color', ('rgb', (0.5, 0.5, 0.5)))

    def material(self, name, el, emission=None):
        key = (name, emission)
        if key in self.cache:
            return self.cache[key]
        p = {}
        if el is not None:
            self.params(el, p)
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes['Principled BSDF']
        color = p.get('color', ('rgb', (0.5, 0.5, 0.5)))
        if color[0] == 'tex':
            img = self.image(color[1], color[2])
            if img is not None:
                tex = nt.nodes.new('ShaderNodeTexImage')
                tex.image = img
                tex.location = (-500, 250)
                nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        else:
            bsdf.inputs['Base Color'].default_value = (*[min(1.0, c) for c in color[1]], 1.0)
        bsdf.inputs['Roughness'].default_value = p.get('rough', 0.5)
        bsdf.inputs['Metallic'].default_value = p.get('metal', 0.0)
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = p.get('spec', 0.5)
        if p.get('glass'):
            bsdf.inputs['Transmission Weight'].default_value = 1.0
            bsdf.inputs['IOR'].default_value = p.get('ior', 1.5)
            bsdf.inputs['Roughness'].default_value = p.get('rough', 0.0)
            mat['sosies_glass'] = 1
        alpha = p.get('alpha')
        if alpha is not None:
            if alpha[0] == 'tex':
                img = self.image(alpha[1], True)
                if img is not None:
                    tex = nt.nodes.new('ShaderNodeTexImage')
                    tex.image = img
                    tex.location = (-700, -200)
                    cut = nt.nodes.new('ShaderNodeMath')
                    cut.operation = 'GREATER_THAN'
                    cut.inputs[1].default_value = 0.5
                    cut.location = (-300, -200)
                    nt.links.new(tex.outputs['Color'], cut.inputs[0])
                    nt.links.new(cut.outputs[0], bsdf.inputs['Alpha'])
            else:
                bsdf.inputs['Alpha'].default_value = sum(alpha[1]) / 3
        if p.get('normal'):
            img = self.image(p['normal'], True)
            if img is not None:
                tex = nt.nodes.new('ShaderNodeTexImage')
                tex.image = img
                tex.location = (-700, -450)
                nm = nt.nodes.new('ShaderNodeNormalMap')
                nm.location = (-300, -450)
                nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
                nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        elif p.get('bump'):
            img = self.image(p['bump'], True)
            if img is not None:
                tex = nt.nodes.new('ShaderNodeTexImage')
                tex.image = img
                tex.location = (-700, -450)
                bump = nt.nodes.new('ShaderNodeBump')
                bump.inputs['Strength'].default_value = 0.3
                bump.location = (-300, -450)
                nt.links.new(tex.outputs['Color'], bump.inputs['Height'])
                nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        if emission is not None:
            bsdf.inputs['Emission Color'].default_value = (1, 1, 1, 1)
            bsdf.inputs['Emission Strength'].default_value = emission
        mat.use_backface_culling = not p.get('twosided', False)
        self.cache[key] = mat
        return mat


def import_mesh_file(path):
    before = set(bpy.data.objects)
    if path.lower().endswith('.obj'):
        bpy.ops.wm.obj_import(filepath=path, forward_axis='Y', up_axis='Z', use_split_objects=False,
                              use_split_groups=False, validate_meshes=True)
    elif path.lower().endswith('.ply'):
        bpy.ops.wm.ply_import(filepath=path, forward_axis='Y', up_axis='Z')
    else:
        raise RuntimeError(f'Unsupported mesh file {path}')
    new = [o for o in bpy.data.objects if o not in before]
    if len(new) > 1:
        # Join multi-object files into one object.
        for o in bpy.context.selected_objects:
            o.select_set(False)
        for o in new:
            o.select_set(True)
        bpy.context.view_layer.objects.active = new[0]
        bpy.ops.object.join()
        new = [bpy.context.view_layer.objects.active]
    return new[0] if new else None


def primitive(kind):
    mesh = bpy.data.meshes.new(kind)
    if kind == 'rectangle':
        verts = [(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)]
        mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    elif kind == 'disk':
        n = 48
        verts = [(math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n), 0) for i in range(n)]
        mesh.from_pydata(verts, [], [tuple(range(n))])
    elif kind == 'cube':
        v = [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]
        f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        mesh.from_pydata(v, [], f)
    mesh.update()
    return bpy.data.objects.new(kind, mesh)


def main():
    args = parse_args()
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene_path = os.path.abspath(args.scene)
    base_dir = os.path.dirname(scene_path)
    root = ET.parse(scene_path).getroot()

    bsdfs = {}
    for el in root:
        if el.tag != 'bsdf':
            continue
        if el.get('id'):
            bsdfs[el.get('id')] = el
        else:
            for d in el.iter('bsdf'):
                if d.get('id'):
                    bsdfs[d.get('id')] = el
                    break

    factory = MaterialFactory(base_dir)
    coll = bpy.context.scene.collection
    counts = {}
    for i, sh in enumerate(root.iter('shape')):
        kind = sh.get('type')
        sid = sh.get('id') or f'{kind}_{i:04d}'
        ref = sh.find('ref')
        inline = sh.find('bsdf')
        emitter = sh.find('emitter')
        radiance = None
        if emitter is not None and emitter.get('type') == 'area':
            r = spectrum(emitter, 'radiance', base_dir, ('rgb', (1, 1, 1)))
            radiance = sum(r[1]) / 3 if r[0] == 'rgb' else 1.0
        if kind in ('obj', 'ply'):
            obj = import_mesh_file(os.path.join(base_dir, value(sh, 'filename')))
            if obj is None:
                continue
        elif kind in ('rectangle', 'disk', 'cube'):
            obj = primitive(kind)
            coll.objects.link(obj)
        elif kind == 'sphere':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=value(sh, 'radius', 1.0), segments=32, ring_count=16)
            obj = bpy.context.active_object
            c = child(sh, 'center')
            if c is not None:
                obj.location = [float(c.get(k, 0)) for k in 'xyz']
        else:
            print(f'  skipping shape type {kind}')
            continue
        obj.name = sid
        obj.matrix_world = Y_UP_TO_Z_UP @ transform(sh) @ obj.matrix_world
        mesh = obj.data
        mesh.materials.clear()
        bsdf_el = bsdfs.get(ref.get('id')) if ref is not None else inline
        mat_name = ref.get('id') if ref is not None else f'{sid}_mat'
        mat = factory.material(mat_name.replace('BSDF', ''), bsdf_el, radiance)
        mesh.materials.append(mat)
        if value(sh, 'face_normals', False):
            if mesh.has_custom_normals:
                with bpy.context.temp_override(object=obj, active_object=obj):
                    bpy.ops.mesh.customdata_custom_splitnormals_clear()
            for poly in mesh.polygons:
                poly.use_smooth = False
        if radiance is not None:
            obj.name = 'EMITTER_' + sid
            obj['sosies_emitter'] = radiance
            obj.hide_render = True
            obj.hide_set(True)
        if mat.get('sosies_glass'):
            obj['sosies_nobake'] = 1
            obj.visible_shadow = False
        counts[kind] = counts.get(kind, 0) + 1

    sensor = root.find('sensor')
    if sensor is not None:
        cam_data = bpy.data.cameras.new('ReferenceCamera')
        fov = value(sensor, 'fov', 45.0)
        cam_data.angle = math.radians(fov)
        cam = bpy.data.objects.new('ReferenceCamera', cam_data)
        coll.objects.link(cam)
        # Mitsuba cameras look along +Z; Blender cameras look along -Z (flip X and Z).
        flip = Matrix.Diagonal((-1, 1, -1, 1))
        cam.matrix_world = Y_UP_TO_Z_UP @ transform(sensor) @ flip
        bpy.context.scene.camera = cam

    env = root.find("emitter[@type='envmap']")
    if env is not None:
        bpy.context.scene['sosies_envmap'] = value(env, 'filename', '')

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.output), compress=True)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    tris = 0
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        if o.name.startswith('EMITTER_'):
            continue
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    print(f'IMPORTED {len(meshes)} objects {counts}, {len(bpy.data.materials)} materials, '
          f'{len(bpy.data.images)} images, {tris:,} triangles, bounds {tuple(round(v, 2) for v in lo)} .. '
          f'{tuple(round(v, 2) for v in hi)} in {time.time() - t0:.1f}s -> {args.output}')


main()
