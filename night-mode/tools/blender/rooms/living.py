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


def clock():
    body = L.ph_model('vintage_grandfather_clock_01', CLOCK, yaw_deg=180, name='grandfather_clock')
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


def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    wood, trim, brass = L.door_materials(L.material('WhitePaint'))

    L.make_door('hall', (EAST, -6.9, FLOOR), 90, wood, trim, brass)

    # the TV above the fireplace shows the lake camera (Fx turns DYN_tv_screen into a live screen)
    screen = bpy.data.objects.get('TvScreen')
    if screen:
        screen.name = 'DYN_tv_screen'
        L.dynamic(screen)
    L.proxy('tv', (-1.75, -2.88, 1.85), (0.35, 1.25, 0.85))
    L.marker('tv', (-1.8, -2.88, 1.85), -90)

    clock()
    rocking_chair()

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
