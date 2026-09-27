"""Living room: The White Room by Jay-Artist (CC BY 3.0) + the grandfather clock, a rocking chair and a door.

The room's own flat-screen TV above the fireplace becomes the TV that shows the lake camera. The empty
end of the room (where the original render camera stood) gets the clock, the rocking chair and the door
to the hall.
"""
import math
import os

import bpy
from mathutils import Matrix, Vector

import nm_lib as L

SCENE = os.path.join(L.ROOT, 'assets-src', 'work', 'living-room-2-import.blend')

FLOOR = 0.029
CEIL = 3.169
EAST, WEST, SOUTH = 3.01, -2.444, -8.183
CLOCK = Vector((1.35, SOUTH + 0.26, FLOOR))   # against the south wall, facing north (into the room)
CHAIR = Vector((-0.75, -5.45, FLOOR))


def clock_hand(hand, dial, face, name):
    """Makes one of the clock's own hands a moving part: its rest pose points at twelve, it turns about the
    middle of the dial (Fx sets the time), and it gets its own material (a moving part isn't lightmapped)."""
    pts = [hand.matrix_world @ v.co for v in hand.data.vertices]
    tip = max(pts, key=lambda p: ((p - dial) - face * (p - dial).dot(face)).length)
    along = tip - dial
    along = (along - face * along.dot(face)).normalized()
    up = Vector((0, 0, 1))
    angle = math.atan2(along.cross(up).dot(face), along.dot(up))
    hand.matrix_world = Matrix.Translation(dial) @ Matrix.Rotation(angle, 4, face) @ Matrix.Translation(-dial) @ hand.matrix_world
    L.select_only([hand])
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    L.set_origin(hand, dial)
    own = hand.data.materials[0].copy()
    own.name = 'NM_ClockHands'
    hand.data.materials[0] = own
    L.dynamic(hand, name)
    return hand


def clock():
    parts = L.ph_model('vintage_grandfather_clock_01', CLOCK, yaw_deg=180, join_meshes=False)
    meshes = [o for o in parts if o.type == 'MESH']
    for o in meshes:  # bake the hierarchy's transforms into the meshes
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    L.delete([o for o in parts if o.type != 'MESH'])
    hands = [o for o in meshes if '_hand' in o.name]
    body = L.join([o for o in meshes if o not in hands], 'grandfather_clock')
    L.select_only([body])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    body.rotation_mode = 'XYZ'
    # its glass comes out of glTF opaque and hid the dial
    L.clear_glass(body)
    # the hands turn about the middle of the dial (where the model puts their origins); the dial faces the
    # room (+Y) like the rest of the clock
    dial = hands[0].matrix_world.translation.copy() if hands else CLOCK + Vector((-0.063, 0.063, 1.732))
    face = Vector((0, 1, 0))
    for hand in hands:
        clock_hand(hand, dial, face, 'clock_minute' if 'minute' in hand.name else 'clock_hour')
    L.marker('clock_dial', dial, 0)  # faces +Y, the way the dial faces
    # its waist door becomes a real door that opens in chapter 4. The model faces -Y and is turned 180
    # degrees, so its door (model x -0.072..0.243, hinges at +0.243) lands at x0..x1, hinged at x0.
    x0, x1 = CLOCK.x - 0.245, CLOCK.x + 0.075
    door = L.split_faces_in_box(body, (x0, CLOCK.y + 0.035, FLOOR + 0.46), (x1, CLOCK.y + 0.14, FLOOR + 1.44), 'DYN_clock_door')
    if door:
        L.set_origin(door, (x0 + 0.005, CLOCK.y + 0.067, FLOOR + 0.95))
        L.dynamic(door)
        door['open_sign'] = 1.0  # swings out into the room
    else:
        L.log('WARNING: clock door not found')
    # the inside of the case: dark wood, a brass pendulum and the basement key on a hook
    inside = L.simple_material('NM_ClockInside', (0.035, 0.022, 0.015), rough=0.7)
    case = L.add_box('clock_case', (x0 + 0.01, CLOCK.y - 0.14, FLOOR + 0.47), (x1 - 0.01, CLOCK.y + 0.04, FLOOR + 1.43), inside,
                     faces={'+x', '-x', '-y', '+z', '-z'})
    L.flip_normals(case)
    brass = L.simple_material('NM_Brass', (0.62, 0.45, 0.2), rough=0.3, metal=1.0)
    pivot = Vector((CLOCK.x - 0.12, CLOCK.y - 0.03, FLOOR + 1.39))
    pend = bpy.data.objects.new('DYN_clock', None)  # an empty at the pivot; Fx swings its child "pendulum"
    pend.location = pivot
    L.link(pend)
    L.dynamic(pend)
    rod = L.add_box('clock_pendulum_rod', (-0.006, -0.004, -0.5), (0.006, 0.004, 0.0), brass)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.065, depth=0.012, vertices=32, location=(0, 0, -0.52), rotation=(math.pi / 2, 0, 0))
    bob = bpy.context.active_object
    bob.data.materials.append(brass)
    pendulum = L.join([rod, bob], 'clock_pendulum')
    pendulum.parent = pend
    pendulum.matrix_parent_inverse = Matrix.Identity(4)
    pendulum.location = (0, 0, 0)
    L.dynamic(pendulum)
    # the key hangs on a nail inside the case, left of the pendulum
    key_parts = []
    bpy.ops.mesh.primitive_torus_add(major_radius=0.016, minor_radius=0.004, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
    key_parts.append(bpy.context.active_object)
    key_parts.append(L.add_box('key_shaft', (-0.003, -0.003, -0.085), (0.003, 0.003, -0.015)))
    key_parts.append(L.add_box('key_bit', (0.0, -0.002, -0.085), (0.018, 0.002, -0.065)))
    for o in key_parts:
        o.data.materials.clear()
        o.data.materials.append(brass)
    key = L.join(key_parts, 'DYN_key')
    key.location = (CLOCK.x + 0.02, CLOCK.y - 0.02, FLOOR + 1.2)
    L.dynamic(key, 'key')
    L.proxy('key', (CLOCK.x + 0.0, CLOCK.y + 0.05, FLOOR + 1.16), (0.3, 0.3, 0.3))
    L.proxy('clock', (CLOCK.x - 0.06, CLOCK.y + 0.05, FLOOR + 1.1), (0.7, 0.5, 2.2))
    L.marker('clock', (CLOCK.x - 0.06, CLOCK.y + 0.15, FLOOR + 1.7), 0)
    return body


def rocking_chair():
    parts = L.ph_model('Rockingchair_01', (0, 0, 0), join_meshes=False)
    meshes = [o for o in parts if o.type == 'MESH']
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    L.delete([o for o in parts if o.type != 'MESH'])
    chair = L.join(meshes, 'DYN_rocking_chair')
    L.select_only([chair])
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    chair.data.transform(Matrix.Translation((0, 0, -0.102)))  # the model floats 10 cm up
    # pivot where the rockers touch the floor; it rocks about its own left-right axis (its local X)
    L.set_origin(chair, (0, -0.05, 0))
    chair.location = CHAIR
    # the model faces -Y; turn it to face the fireplace (north-west)
    chair.rotation_mode = 'XYZ'
    chair.rotation_euler = (0, 0, math.radians(200))
    L.dynamic(chair)
    L.tag(chair, nm_collide=1)
    L.proxy('rocking_chair', (CHAIR.x, CHAIR.y, FLOOR + 0.6), (0.8, 0.8, 1.2))
    return chair


def mend_walls():
    """The south wall has a hole where the scene's render lit it (a big area light for a window) and a strip
    of the east wall by the door is modelled inside out: both baked black. Face the one over, turn the other."""
    wall_s = SOUTH + 0.138
    # a new face over the whole wall, so it bakes as one surface with no seam round the hole, and a picture
    # rail the length of it. The old wall's face, the sides of the hole and the rail's two pieces go: left
    # behind, the compressed mesh puts them in the new face's plane and the hole's outline shows through
    L.remove_faces((WEST + 0.01, wall_s - 0.004, FLOOR - 0.01), (EAST - 0.01, wall_s + 0.002, CEIL + 0.01), 'Walls')
    L.remove_faces((WEST + 0.01, SOUTH + 0.02, FLOOR + 0.01), (EAST - 0.01, wall_s - 0.004, CEIL - 0.01), 'Walls')
    L.remove_faces((WEST + 0.01, wall_s - 0.001, 2.6), (EAST - 0.01, wall_s + 0.02, 2.68))
    L.add_box('south_wall_face', (WEST, wall_s + 0.0004, FLOOR), (EAST, wall_s + 0.0005, CEIL), L.material('Walls'), faces={'+y'})
    L.add_box('south_rail', (WEST, wall_s, 2.609), (EAST, wall_s + 0.0145, 2.669), L.material('WhitePaint'))
    L.face_into_room((EAST - 0.05, -6.45, -0.2), (EAST + 0.05, -5.28, CEIL + 0.1), (-1, 0, 0))


def decor():
    """The south end of the room, where the scene's camera stood, was bare: a chest of drawers under
    Hunters in the Snow, a reading corner with the Magpie, the chessboard mid-game, a low chest under
    the skaters, a plant, a rug."""
    wall_s = SOUTH + 0.138  # the south wall's surface
    # chest of drawers against the south wall, west of the clock, and what stands on it
    chest = L.ph_model('GothicCommode_01', (-0.45, wall_s + 0.295, FLOOR), yaw_deg=180, name='living_commode')
    top = L.world_bbox(chest)[1].z
    L.ornament('wooden_candlestick', (-0.98, wall_s + 0.25, top), yaw_deg=10, name='candlestick_l', budget=3000)
    L.ornament('wooden_candlestick', (0.07, wall_s + 0.25, top), yaw_deg=-20, name='candlestick_r', budget=3000)
    L.ornament('standing_picture_frame_02', (-0.72, wall_s + 0.3, top), yaw_deg=100, name='photo_commode')
    L.ornament('ceramic_vase_01', (-0.25, wall_s + 0.26, top), yaw_deg=0, name='vase_commode')
    L.picture('art_hunters', 'bruegel_hunters', (-0.45, wall_s, 1.98), 0, 1.0, frame='gilt')
    # reading corner in the south-west: armchair, tall side table with an oil lamp, the Magpie above
    L.ph_model('GreenChair_01', (-1.82, -6.95, FLOOR), yaw_deg=122, name='reading_chair')
    table = L.ph_model('side_table_tall_01', (WEST + 0.3, SOUTH + 0.52, FLOOR), yaw_deg=15, name='reading_table')
    ttop = L.world_bbox(table)[1].z
    lamp = L.ornament('vintage_oil_lamp', (WEST + 0.3, SOUTH + 0.52, ttop), yaw_deg=40, scale=0.62, name='reading_lamp')
    L.clear_glass(lamp)
    lamp_top = L.world_bbox(lamp)[1].z
    L.picture('art_magpie', 'monet_magpie', (WEST, -6.95, 1.72), -90, 0.9, frame='walnut')
    # the game in progress between the armchair and the rocking chair
    ctable = L.ph_model('side_table_01', (-1.3, -6.05, FLOOR), yaw_deg=25, name='chess_table')
    L.ornament('chess_set', (-1.3, -6.05, L.world_bbox(ctable)[1].z), yaw_deg=33, scale=0.72, name='chess_set', budget=12000)
    # east wall, north of the door: a low chest under the skaters on the ice
    L.ph_model('vintage_wooden_drawer_01', (EAST - 0.25, -5.4, FLOOR), yaw_deg=-90, name='living_low_chest')
    ltop = 0.545 + FLOOR
    L.ornament('antique_ceramic_vase_01', (EAST - 0.26, -5.12, ltop), yaw_deg=30, scale=0.85, name='vase_blue')
    # the set runs 0.44 m from its origin towards the door (-y): on the chest's top, clear of the vase
    L.ornament('book_encyclopedia_set_01', (EAST - 0.2, -5.33, ltop), yaw_deg=-90, scale=0.8, name='books_chest', budget=8000)
    L.picture('art_skaters', 'avercamp_skaters', (EAST, -5.4, 1.55), 90, 1.05, frame='gilt')
    # a plant in the corner south of the door, and a rug under the rocking chair
    plant = L.ph_model('potted_plant_02', (EAST - 0.4, SOUTH + 0.52, FLOOR), yaw_deg=200, name='plant_corner')
    L.decimate(plant, 16000)
    plant['nm_keep_detail'] = 1
    L.rug('rug_south', (0.05, -6.35, FLOOR), (2.5, 1.8), 0, 'quatrefoil_jacquard_fabric', tile=0.7, border_color=(0.05, 0.03, 0.03))
    return lamp_top


def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    wood, trim, brass = L.door_materials(L.material('WhitePaint'))

    L.make_door('hall', (EAST, -6.9, FLOOR), 90, wood, trim, brass)

    # the TV above the fireplace shows the lake camera (Fx turns DYN_tv_screen into a live screen)
    screen = bpy.data.objects.get('TvScreen')
    if screen:
        screen.name = 'DYN_tv_screen'
        L.screen_uvs(screen)  # the scene's quad has none
        L.dynamic(screen)
    L.proxy('tv', (-1.75, -2.88, 1.85), (0.35, 1.25, 0.85))
    L.marker('tv', (-1.8, -2.88, 1.85), -90)

    clock()
    rocking_chair()
    mend_walls()
    lamp_top = decor()

    plant = L.ph_model('potted_plant_04', (1.8, -1.45, FLOOR), yaw_deg=20, name='plant_living')
    L.proxy('plant_living', (1.8, -1.45, FLOOR + 0.5), (0.7, 0.7, 1.0))

    chandelier = L.ph_model('Chandelier_03', (0.3, -6.1, CEIL), name='south_chandelier')
    lo, hi = L.world_bbox(chandelier)
    chandelier.location.z -= hi.z - CEIL
    L.nocollide(chandelier)

    L.security_camera('cam_living', (EAST - 0.12, -1.65, CEIL - 0.2), 135)  # east wall by the bay, looking south-west

    # ---- bake lights
    L.light('pendant', 'POINT', (0.38, -2.9, 2.45), 120, '#ffd2a0', radius=0.35, states=('on',))
    L.light('floor_lamp', 'POINT', (2.72, -1.69, 1.42), 60, '#ffc07a', radius=0.12, states=('on',))
    L.light('south_chandelier', 'POINT', (0.3, -6.1, CEIL - 0.55), 110, '#ffcf9a', radius=0.7, states=('on',))  # soft: sharp shadows alias in the lightmap
    L.light('fire_glow', 'POINT', (-2.2, -2.9, 0.35), 8, '#ff8a3a', radius=0.2, states=('on',))
    # the oil lamp in the reading corner
    L.light('reading_lamp', 'POINT', (WEST + 0.3, SOUTH + 0.52, lamp_top - 0.24), 14, '#ffb86b', radius=0.05, states=('on',))
    L.emissive('vintage_oil_lamp_flame', states=('on',), color='#ffb45e', strength=4.0)
    # moonlight through the bay window
    L.light('bay_moon', 'AREA', (0.2, 0.2, 2.1), 70, '#9fb4e6', states=('moon', 'on'), direction=(0, -1, -0.35))
    bpy.data.lights['bay_moon'].size = 2.6
    for name in ('LampshaderOuter', 'LampshadeInner'):
        L.emissive(name, states=('on',), color='#ffb36b', strength=2.0)

    return {
        'lightmap_size': 2048,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.004, 0.005, 0.009)}, 'moon': {'color': (0.004, 0.005, 0.009)}},
        'exposure': {'on': 1.0, 'moon': 2.4},
    }
