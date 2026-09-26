"""
SOSIES lightmap baker (Blender 4.5 LTS, Cycles).

Bakes a room's lighting - direct light plus bounced light (global illumination) - into one lightmap
atlas that the game applies at runtime, and exports the room with the extra UV set it needs.

Run headless (npm run assets:test-room does this for the test room):
    blender --background --factory-startup --python tools/blender/bake_lightmaps.py -- \
        --input room.glb --output room-baked.glb --lightmap room-lightmap.exr \
        [--rig rig.json] [--size 2048] [--samples 128] [--device CPU|CUDA|OPTIX|HIP|METAL] [--no-denoise]
        [--keep-uvs]   (use the model's own "Lightmap" UV maps instead of unwrapping automatically)

--input may be a .glb/.gltf or a .blend. In a .blend, lights and world set up by the artist are used
as they are; a rig (JSON, see tools/blender/rigs/) can add lights to files that have none.

Conventions:
  * Rig "noBake" materials, and objects with the custom property sosies_nobake = 1, get no lightmap
    (glowing lampshades, glass, anything that moves).
  * Lightmap UVs are the mesh's 2nd UV map, "Lightmap"; the glTF exporter writes it as TEXCOORD_1.
  * The lightmap stores diffuse light without surface colour (Cycles DIFFUSE, direct + indirect).
    The game multiplies it by pi to match three.js's physically based lighting.
"""

import argparse
import math
import os
import sys
import time

import bpy
from mathutils import Vector

LIGHTMAP_UV = "Lightmap"
BAKE_NODE = "SOSIES_LightmapTarget"


def log(message):
    print(f"[bake] {message}", flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description="Bake lightmaps for SOSIES")
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True, help="Baked .glb to write")
    p.add_argument("--lightmap", required=True, help="Lightmap .exr to write")
    p.add_argument("--rig", help="Optional JSON light rig")
    p.add_argument("--size", type=int, default=2048, help="Lightmap width/height in pixels")
    p.add_argument("--samples", type=int, default=128)
    p.add_argument("--margin", type=int, default=6, help="Gap between UV islands, in pixels")
    p.add_argument("--device", default="CPU")
    p.add_argument("--no-denoise", action="store_true")
    p.add_argument("--keep-uvs", action="store_true", help="Use existing 'Lightmap' UV maps")
    return p.parse_args(argv)


# ---------------------------------------------------------------------------------------------- utils


def game_to_blender(v):
    """Game / glTF space (+Y up, -Z forward) to Blender space (+Z up)."""
    x, y, z = v
    return Vector((x, -z, y))


def srgb_hex_to_linear(hex_color):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i : i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def base_name(name):
    """Blender renames duplicates to 'Name.001'; rigs refer to the original name."""
    head, _, tail = name.rpartition(".")
    return head if head and tail.isdigit() else name


def mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def objects_using(material_name):
    return [
        o
        for o in mesh_objects()
        if any(s.material and base_name(s.material.name) == material_name for s in o.material_slots)
    ]


def world_bbox_centre(objects):
    points = [o.matrix_world @ Vector(corner) for o in objects for corner in o.bound_box]
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return (lo + hi) / 2


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0] if objects else None


# ---------------------------------------------------------------------------------------------- steps


def load(path):
    if path.lower().endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=path)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
    log(f"loaded {path}: {len(mesh_objects())} mesh objects")


def split_by_material():
    """One material per object makes per-material rules (no-bake, emissive) simple and exact."""
    objs = [o for o in mesh_objects() if len(o.material_slots) > 1]
    if not objs:
        return
    select_only(objs)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="MATERIAL")
    bpy.ops.object.mode_set(mode="OBJECT")
    log(f"split multi-material objects -> {len(mesh_objects())} objects")


def apply_rig(rig, rig_dir):
    scene = bpy.context.scene
    world_def = rig.get("world")
    if world_def:
        world = scene.world or bpy.data.worlds.new("World")
        scene.world = world
        world.use_nodes = True
        nt = world.node_tree
        nt.nodes.clear()
        coord = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(os.path.join(rig_dir, world_def["hdri"]))
        background = nt.nodes.new("ShaderNodeBackground")
        output = nt.nodes.new("ShaderNodeOutputWorld")
        mapping.inputs["Rotation"].default_value[2] = math.radians(world_def.get("rotationDeg", 0))
        background.inputs["Strength"].default_value = world_def.get("strength", 1.0)
        nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
        nt.links.new(env.outputs["Color"], background.inputs["Color"])
        nt.links.new(background.outputs["Background"], output.inputs["Surface"])
        log(f"world: {world_def['hdri']} x{background.inputs['Strength'].default_value}")

    for spec in rig.get("lights", []):
        kind = spec["type"].upper()
        data = bpy.data.lights.new(spec.get("name", kind.title()), kind)
        data.color = srgb_hex_to_linear(spec.get("color", "#ffffff"))
        if kind == "SUN":
            data.energy = spec.get("strength", 1.0)
            data.angle = math.radians(spec.get("angleDeg", 1.0))
        else:
            data.energy = spec.get("power", 100.0)
            data.shadow_soft_size = spec.get("radius", 0.05)
            if kind == "SPOT":
                data.spot_size = math.radians(spec.get("coneDeg", 90))
                data.spot_blend = spec.get("blend", 0.5)
        obj = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(obj)
        at = spec.get("at")
        if at:
            anchors = objects_using(at["material"])
            if not anchors:
                raise RuntimeError(f"Rig light '{data.name}': no object uses material {at['material']}")
            obj.location = world_bbox_centre(anchors) + game_to_blender(at.get("offset", [0, 0, 0]))
        else:
            obj.location = game_to_blender(spec.get("position", [0, 3, 0]))
        if "direction" in spec:
            direction = game_to_blender(spec["direction"]).normalized()
            obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        log(f"light {data.name}: {kind} at {tuple(round(c, 2) for c in obj.location)}")

    for name, emissive in rig.get("emissive", {}).items():
        for mat in {s.material for o in objects_using(name) for s in o.material_slots if s.material}:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if bsdf is None:
                continue
            bsdf.inputs["Emission Color"].default_value = (*srgb_hex_to_linear(emissive["color"]), 1.0)
            bsdf.inputs["Emission Strength"].default_value = emissive.get("strength", 1.0)
            log(f"emissive: {mat.name}")

    # Objects light shines through during the bake (e.g. fabric lampshades around a bulb).
    for name in rig.get("noShadow", []):
        for o in objects_using(name):
            o.visible_shadow = False

    for name in rig.get("noBake", []):
        for o in objects_using(name):
            o["sosies_nobake"] = 1


def bake_objects():
    return [o for o in mesh_objects() if not o.get("sosies_nobake") and len(o.data.polygons) > 0]


def join_static(objects):
    """Joins everything that gets lightmapped into one object: Cycles then prepares the scene once
    instead of once per object (minutes saved), and the UV packer sees every island at once."""
    if len(objects) == 1:
        return objects[0]
    select_only(objects)
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = "SOSIES_Static"
    log(f"joined {len(objects)} objects into one ({len(joined.data.polygons)} faces)")
    return joined


def make_lightmap_uvs(objects, size, margin_px, density=None):
    """Adds a 2nd UV map and packs every object's islands into one shared atlas.
    density: {material name: factor} gives surfaces of those materials fewer (factor < 1) lightmap
    pixels per metre, e.g. a lake or far-away ground that would otherwise take most of the atlas."""
    for o in objects:
        mesh = o.data
        if len(mesh.uv_layers) == 0:
            mesh.uv_layers.new(name="UVMap")  # keep the lightmap as the 2nd set (TEXCOORD_1)
        for extra in [l for l in list(mesh.uv_layers)[1:] if l.name != LIGHTMAP_UV]:
            log(f"removing extra UV map {extra.name} from {o.name} (the lightmap must be TEXCOORD_1)")
            mesh.uv_layers.remove(extra)
        first = mesh.uv_layers[0]
        layer = mesh.uv_layers.get(LIGHTMAP_UV) or mesh.uv_layers.new(name=LIGHTMAP_UV)
        first.active_render = True  # materials keep sampling their textures with the 1st set
        mesh.uv_layers.active = layer  # unwrapping and baking use the active set
    select_only(objects)
    t0 = time.time()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # scenes converted from renderers split every face's vertices; welded, connected faces unwrap as one
    # island instead of hundreds (the sharp edges keep their shading)
    bpy.ops.mesh.remove_doubles(threshold=0.0005, use_sharp_edge_from_normals=True)
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(66), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False
    )
    if density:
        scale_islands_by_material(objects, density)
    # UV operators only touch selected UVs; with sync on, the mesh selection (everything) counts. Without it
    # the packer silently does nothing in background mode and smart_project's own layout is kept.
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(rotate=True, margin_method="FRACTION", margin=margin_px / size, shape_method="CONCAVE")
    bpy.ops.object.mode_set(mode="OBJECT")
    fill_unit_square(objects, margin_px / size)
    faces = sum(len(o.data.polygons) for o in objects)
    log(f"lightmap UVs: {len(objects)} objects, {faces} faces packed in {time.time() - t0:.1f} s")


def scale_islands_by_material(objects, density):
    """Scales the lightmap UVs of faces by their material's density factor (in edit mode, before packing).
    Faces of one material form whole islands (the scenes use one material per object), so islands keep
    their shape; the packer then gives them proportionally less room."""
    import bmesh

    scaled = 0
    for o in objects:
        bm = bmesh.from_edit_mesh(o.data)
        layer = bm.loops.layers.uv.get(LIGHTMAP_UV)
        factors = [density.get(base_name(s.material.name), 1.0) if s.material else 1.0 for s in o.material_slots]
        for f in bm.faces:
            k = factors[f.material_index] if f.material_index < len(factors) else 1.0
            if k != 1.0:
                for loop in f.loops:
                    loop[layer].uv *= k
                scaled += 1
        bmesh.update_edit_mesh(o.data)
    log(f"lightmap density: scaled {scaled} faces ({density})")


def fill_unit_square(objects, margin):
    """With tens of thousands of small islands the packer can leave a band of the atlas empty;
    scale the packed layout up evenly so it fills the square (more lightmap pixels per metre)."""
    import numpy as np

    layers = [o.data.uv_layers[LIGHTMAP_UV] for o in objects]
    coords = []
    for layer in layers:
        buffer = np.empty(len(layer.data) * 2, dtype=np.float32)
        layer.data.foreach_get("uv", buffer)
        coords.append(buffer)
    stacked = np.concatenate(coords).reshape(-1, 2)
    lo = stacked.min(axis=0)
    hi = stacked.max(axis=0)
    scale = (1.0 - 2 * margin) / float(max(hi - lo))
    for layer, buffer in zip(layers, coords):
        uv = buffer.reshape(-1, 2)
        uv[:] = (uv - lo) * scale + margin
        layer.data.foreach_set("uv", buffer)
    log(f"atlas used {100 * (hi - lo)[0]:.0f}% x {100 * (hi - lo)[1]:.0f}%; scaled x{scale:.2f} to fill")


def setup_cycles(samples, device):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 6
    scene.cycles.glossy_bounces = 2
    scene.cycles.transparent_max_bounces = 8
    scene.cycles.device = "CPU"
    if device.upper() != "CPU":
        prefs = bpy.context.preferences.addons["cycles"].preferences
        try:
            prefs.compute_device_type = device.upper()
            prefs.get_devices()
            usable = [d for d in prefs.devices if d.type == device.upper()]
            for d in prefs.devices:
                d.use = d in usable
            if usable:
                scene.cycles.device = "GPU"
        except TypeError:
            log(f"device {device} not available, using CPU")
    log(f"cycles: {samples} samples on {scene.cycles.device}")


def bake(objects, size, margin_px):
    image = bpy.data.images.new("SOSIES_Lightmap", size, size, alpha=False, float_buffer=True)
    image.colorspace_settings.name = "Linear Rec.709"
    for o in objects:
        for slot in o.material_slots:
            mat = slot.material
            if mat is None:
                continue
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            node = nodes.get(BAKE_NODE) or nodes.new("ShaderNodeTexImage")
            node.name = BAKE_NODE
            node.image = image
            nodes.active = node
    # Normal maps are left out of the bake: the lightmap holds smooth light, and fine bumps baked in at
    # lightmap resolution read as speckle (the game applies the normal maps on top at full resolution).
    muted = []
    for mat in bpy.data.materials:
        if mat.use_nodes and mat.node_tree:
            for n in mat.node_tree.nodes:
                if n.type in ("NORMAL_MAP", "BUMP") and not n.mute:
                    n.mute = True
                    muted.append(n)
    select_only(objects)
    scene = bpy.context.scene
    scene.render.bake.margin = margin_px
    scene.render.bake.margin_type = "EXTEND"
    t0 = time.time()
    bpy.ops.object.bake(
        type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=margin_px, use_clear=True, target="IMAGE_TEXTURES"
    )
    log(f"baked {size}x{size} in {time.time() - t0:.1f} s")
    for n in muted:
        n.mute = False
    for o in objects:  # the target node isn't needed in the exported materials
        for slot in o.material_slots:
            if slot.material and BAKE_NODE in slot.material.node_tree.nodes:
                slot.material.node_tree.nodes.remove(slot.material.node_tree.nodes[BAKE_NODE])
    return image


def save_lightmap(image, path, denoise):
    """Writes a half-float EXR (DWAA compressed), denoised with OpenImageDenoise when possible."""
    size_x, size_y = image.size
    scene = bpy.data.scenes.new("SOSIES_LightmapOutput")
    scene.render.resolution_x = size_x
    scene.render.resolution_y = size_y
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    settings = scene.render.image_settings
    settings.file_format = "OPEN_EXR"
    settings.color_mode = "RGB"
    settings.color_depth = "16"
    settings.exr_codec = "DWAA"
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    if denoise:
        scene.use_nodes = True
        tree = scene.node_tree
        tree.nodes.clear()
        src = tree.nodes.new("CompositorNodeImage")
        src.image = image
        den = tree.nodes.new("CompositorNodeDenoise")
        den.prefilter = "ACCURATE"
        den.use_hdr = True
        out = tree.nodes.new("CompositorNodeComposite")
        tree.links.new(src.outputs["Image"], den.inputs["Image"])
        tree.links.new(den.outputs["Image"], out.inputs["Image"])
        camera = bpy.data.objects.new("SOSIES_OutputCamera", bpy.data.cameras.new("SOSIES_OutputCamera"))
        scene.collection.objects.link(camera)
        scene.camera = camera
        scene.render.engine = "BLENDER_WORKBENCH"  # nothing to render; the compositor does the work
        scene.render.filepath = path
        t0 = time.time()
        bpy.ops.render.render(write_still=True, scene=scene.name)
        log(f"denoised lightmap written to {path} ({time.time() - t0:.1f} s)")
    else:
        image.save_render(path, scene=scene)
        log(f"lightmap written to {path}")


def export(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_extras=True,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_image_format="AUTO",
    )
    log(f"exported {path}")


def main():
    args = parse_args()
    load(args.input)
    split_by_material()
    if args.rig:
        import json

        with open(args.rig, encoding="utf-8") as f:
            rig = json.load(f)
        apply_rig(rig, os.path.dirname(os.path.abspath(args.rig)))
    if not bake_objects():
        raise RuntimeError("Nothing to bake")
    if args.keep_uvs:
        missing = [o.name for o in bake_objects() if LIGHTMAP_UV not in o.data.uv_layers]
        if missing:
            raise RuntimeError(f"--keep-uvs: no '{LIGHTMAP_UV}' UV map on {', '.join(missing[:5])}")
    objects = [join_static(bake_objects())]
    if args.keep_uvs:
        for o in objects:
            o.data.uv_layers[0].active_render = True
            o.data.uv_layers.active = o.data.uv_layers[LIGHTMAP_UV]
        log("using the model's own lightmap UVs")
    else:
        make_lightmap_uvs(objects, args.size, args.margin)
    setup_cycles(args.samples, args.device)
    image = bake(objects, args.size, args.margin)
    save_lightmap(image, args.lightmap, denoise=not args.no_denoise)
    export(args.output)
    log("done")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # make failures visible and non-zero for the calling script
        import traceback

        traceback.print_exc()
        log(f"FAILED: {error}")
        sys.exit(1)
