"""Master bedroom: Bedroom by SlykDrako (CC0) + Dana's desk (laptop, realtor's folder) and the music box.

The bed, nightstands, wardrobe and dresser are the scene's own. The empty half of the room gets Dana's
work desk against the south wall and the door to the landing on the east wall.
"""
import math
import os

import bpy
from mathutils import Matrix, Vector

import nm_lib as L

SCENE = os.path.join(L.ROOT, 'assets-src', 'work', 'bedroom-import.blend')

FLOOR = 0.0
CEIL = 2.381
EAST, SOUTH = 4.023, -3.895
DESK = Vector((1.55, SOUTH + 0.33, FLOOR))
DRESSER_TOP = 0.594


def music_box(at, yaw_deg):
    """A small walnut music box. Its lid (DYN_musicbox_lid) is hinged along the back edge and opens by
    turning about its own X axis (Fx.musicBoxOpen)."""
    walnut = L.simple_material('NM_Walnut', (0.12, 0.06, 0.03), rough=0.35)
    velvet = L.simple_material('NM_Velvet', (0.28, 0.02, 0.05), rough=0.9)
    brass = L.simple_material('NM_Brass', (0.62, 0.45, 0.2), rough=0.3, metal=1.0)
    w, d, h = 0.17, 0.12, 0.075
    body = [L.add_box('mb_base', (-w / 2, -d / 2, 0), (w / 2, d / 2, 0.006), walnut)]
    for (a, b) in (((-w / 2, -d / 2), (w / 2, -d / 2 + 0.008)), ((-w / 2, d / 2 - 0.008), (w / 2, d / 2)),
                   ((-w / 2, -d / 2), (-w / 2 + 0.008, d / 2)), ((w / 2 - 0.008, -d / 2), (w / 2, d / 2))):
        body.append(L.add_box('mb_side', (a[0], a[1], 0), (b[0], b[1], h), walnut))
    body.append(L.add_box('mb_lining', (-w / 2 + 0.008, -d / 2 + 0.008, 0.006), (w / 2 - 0.008, d / 2 - 0.008, 0.012), velvet))
    body.append(L.add_box('mb_key', (w / 2, -0.008, 0.02), (w / 2 + 0.02, 0.008, 0.05), brass))
    box = L.join(body, 'music_box')
    lid_parts = [L.add_box('mb_lid', (-w / 2, -d, 0), (w / 2, 0, 0.014), walnut),
                 L.add_box('mb_lid_plate', (-0.03, -d + 0.03, 0.014), (0.03, -d + 0.07, 0.016), brass)]
    lid = L.join(lid_parts, 'DYN_musicbox_lid')  # local origin on the hinge; the lid lies towards -Y
    T = Matrix.Translation(at) @ L.yaw_matrix(yaw_deg)
    box.data.transform(T)
    lid.location = T @ Vector((0, d / 2, h))
    lid.rotation_euler = (0, 0, math.radians(yaw_deg))
    L.dynamic(lid)
    return box, lid


def desk():
    table = L.ph_model('WoodenTable_03', DESK + Vector((0, 0.0, 0)), yaw_deg=180, name='dana_desk')
    top = L.surface_z(DESK.x, DESK.y, 2.0, 0.83)
    # the laptop faces the room (north): the model's screen is at its +Y edge facing -Y, so turn it 180
    laptop = L.ph_model('classic_laptop', (DESK.x - 0.12, DESK.y - 0.02, top), yaw_deg=180, name='dana_laptop')
    # a live screen over the model's own display
    screen = L.screen_from_material(laptop, 'classic_laptop_screen', 'DYN_laptop_screen', offset=0.002, inset=0.004)
    sx, sy = DESK.x - 0.12, DESK.y - 0.2
    L.dynamic(screen)
    L.proxy('laptop', (sx, DESK.y - 0.1, top + 0.25), (0.7, 0.5, 0.55))
    L.marker('laptop_screen', (sx, sy + 0.01, top + 0.3), 0)
    parts = L.ph_model('binder_notebook', (DESK.x + 0.2, DESK.y - 0.05, top), yaw_deg=195, join_meshes=False)
    folder = next((o for o in parts if o.type == 'MESH' and o.name.startswith('binder_notebook_closed')), None)
    L.delete([o for o in parts if o.type == 'MESH' and o is not folder])
    if folder:
        folder.name = 'realtor_folder'
    L.proxy('folder', (DESK.x + 0.1, DESK.y - 0.05, top + 0.1), (0.9, 0.45, 0.25))
    return folder


def face_uvs(obj):
    """UVs spread over the object's biggest face as seen from its front (a photo in a standing frame)."""
    me = obj.data
    mw = obj.matrix_world
    big = max(me.polygons, key=lambda p: p.area)
    n = (mw.to_3x3() @ big.normal).normalized()
    up = Vector((0, 0, 1))
    up = (up - n * up.dot(n)).normalized()
    right = (-n).cross(up)
    corners = [mw @ me.vertices[i].co for i in big.vertices]
    us = [c.dot(right) for c in corners]
    vs = [c.dot(up) for c in corners]
    uv = me.uv_layers[0] if me.uv_layers else me.uv_layers.new(name='UVMap')
    for loop in me.loops:
        p = mw @ me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((p.dot(right) - min(us)) / (max(us) - min(us)), (p.dot(up) - min(vs)) / (max(vs) - min(vs)))


def decor():
    """The scene's three black canvases over the bed and its blank photo become pictures, and the bare
    half of the room gets a reading corner, Almond Blossom over Dana's desk and an ottoman."""
    L.delete([o for o in bpy.data.objects if o.name.startswith('Painting_')])
    for x, art in ((0.47, 'redoute_regalis'), (-0.02, 'redoute_foliacea'), (-0.51, 'redoute_burgundiaca')):
        L.picture(f'art_{art}', art, (x, 1.1, 1.42), 180, 0.3, frame='black', mount=0.045, glazed=True)
    photo = bpy.data.objects.get('Picture')
    if photo:
        photo.data.materials.clear()
        photo.data.materials.append(L.image_material('NM_Art_nightstand', os.path.join(L.ART, 'monet_parasol.jpg'), rough=0.25))
        face_uvs(photo)
    L.picture('art_almond', 'vangogh_almond', (DESK.x, SOUTH, FLOOR + 1.72), 0, 0.8, frame='oak')  # clear of the laptop's lid
    # a reading corner on the east wall, north of the door
    L.ph_model('ArmChair_01', (EAST - 0.58, -0.55, FLOOR), yaw_deg=-63, name='bedroom_armchair')
    table = L.ph_model('side_table_tall_01', (EAST - 0.27, 0.2, FLOOR), yaw_deg=10, name='bedroom_side_table')
    clock = L.ornament('mantel_clock_01', (EAST - 0.27, 0.2, L.world_bbox(table)[1].z), yaw_deg=-80, name='mantel_clock', budget=8000)
    L.clear_glass(clock)
    L.picture('art_nook', 'larsson_nook', (EAST, -0.55, FLOOR + 1.5), 90, 0.8, frame='walnut')
    # an ottoman at the foot of the bed
    L.ph_model('Ottoman_01', (0.02, -1.13, FLOOR), yaw_deg=0, name='bedroom_ottoman')


def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    wood, trim, brass = L.door_materials()
    L.make_door('hall', (EAST, -2.35, FLOOR), 90, wood, trim, brass)

    desk()
    decor()

    music_box(Vector((-1.95, -1.25, DRESSER_TOP)), 0)  # facing south; its lid hinges along X
    L.proxy('musicbox', (-1.9, -1.25, DRESSER_TOP + 0.1), (0.45, 0.45, 0.3))
    L.marker('musicbox', (-1.9, -1.25, DRESSER_TOP + 0.1), -90)

    L.security_camera('cam_bedroom', (EAST - 0.12, SOUTH + 0.12, CEIL - 0.18), 45)  # south-east corner, looking north-west

    # ---- bake lights: the ceiling lamp, both bedside lamps, a little desk light; moonlight at the curtains
    L.light('ceiling', 'POINT', (1.0, -1.54, 1.95), 70, '#ffd8b0', radius=0.12, states=('on',))
    L.light('bedside_l', 'POINT', (-1.3, 0.82, 0.62), 16, '#ffb86b', radius=0.05, states=('on',))
    L.light('bedside_r', 'POINT', (1.35, 0.82, 0.62), 16, '#ffb86b', radius=0.05, states=('on',))
    L.light('curtain_moon', 'AREA', (0.5, 1.15, 1.4), 45, '#9fb4e6', states=('moon', 'on'), direction=(0, -1, -0.2))
    bpy.data.lights['curtain_moon'].size = 4.0
    return {
        'lightmap_size': 2048,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.004, 0.005, 0.009)}, 'moon': {'color': (0.004, 0.005, 0.009)}},
        'exposure': {'on': 1.0, 'moon': 2.4},
    }
