"""Basement: built for the game from Poly Haven props and textures (CC0).

Stairs come down from the kitchen door along the north wall. A bare bulb, pipes under the joists,
boxes marked IVY - KEEP, a water heater, Wren's computer with Ivy's face on the monitor, the main
breaker, and in the north-west corner the old coal chute door that Jordan climbed out of.
"""
import math
import os

import bpy
from mathutils import Matrix, Vector

import nm_lib as L

TEX = os.path.join(L.ROOT, 'assets-src', 'work', 'tex')

X0, X1, Y0, Y1 = -4.0, 4.0, -3.0, 3.0
FLOOR, CEIL = 0.0, 2.35
STAIR_Y0, STAIR_Y1 = 2.0, 3.0          # the stairwell runs along the north wall
STAIR_X0, RISE, RUN, STEPS = -0.6, CEIL / 12, 0.27, 12
LANDING_X = STAIR_X0 + RUN * STEPS     # 2.64: top step; landing from here to the east wall
SHAFT_TOP = CEIL + 2.45


def label(name, variant, centre, width, facing):
    mat = L.image_material(f'NM_Label_{variant}', os.path.join(TEX, f'label_{variant}.png'), rough=0.9)
    h = width / 2
    c = Vector(centre)
    right = {'+y': Vector((-1, 0, 0)), '-y': Vector((1, 0, 0)), '+x': Vector((0, 1, 0)), '-x': Vector((0, -1, 0))}[facing]
    up = Vector((0, 0, 1))
    q = L.add_quad(name, [c - right * width / 2 - up * h / 2, c + right * width / 2 - up * h / 2,
                          c + right * width / 2 + up * h / 2, c - right * width / 2 + up * h / 2], mat)
    uv = q.data.uv_layers[0]
    for li, (a, b) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = (a, b)
    L.nocollide(q)
    return q


def cylinder(name, a, b, radius, mat, verts=16):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    o.name = name
    o.data.materials.append(mat)
    L.apply_transforms(o)
    return o


def shell(concrete_wall, concrete_floor, planks):
    # floor and walls; the north wall and the east wall rise with the stairwell
    L.add_box('floor', (X0, Y0, FLOOR), (X1, Y1, FLOOR), concrete_floor, 2.0, faces={'+z'})
    walls = [
        L.add_box('wall_s', (X0, Y0 - 0.2, FLOOR), (X1, Y0, CEIL), concrete_wall, 2.0, faces={'+y'}),
        L.add_box('wall_w', (X0 - 0.2, Y0, FLOOR), (X0, Y1, CEIL), concrete_wall, 2.0, faces={'+x'}),
        L.add_box('wall_n', (X0, Y1, FLOOR), (X1, Y1 + 0.2, SHAFT_TOP), concrete_wall, 2.0, faces={'-y'}),
        L.add_box('wall_e', (X1, Y0, FLOOR), (X1 + 0.2, Y1, SHAFT_TOP), concrete_wall, 2.0, faces={'-x'}),
    ]
    # ceiling: dark planks with joists, open over the stairs; the stairwell's own walls and top
    L.add_box('ceiling_main', (X0, Y0, CEIL), (X1, STAIR_Y0, CEIL), planks, 1.5, faces={'-z'})
    L.add_box('ceiling_nw', (X0, STAIR_Y0, CEIL), (STAIR_X0 - 0.3, Y1, CEIL), planks, 1.5, faces={'-z'})
    L.add_box('shaft_s', (STAIR_X0 - 0.3, STAIR_Y0 - 0.15, CEIL), (X1, STAIR_Y0, SHAFT_TOP), concrete_wall, 2.0, faces={'+y', '-z'})
    L.add_box('shaft_w', (STAIR_X0 - 0.45, STAIR_Y0, CEIL), (STAIR_X0 - 0.3, Y1, SHAFT_TOP), concrete_wall, 2.0, faces={'+x', '-z'})
    L.add_box('shaft_top', (STAIR_X0 - 0.3, STAIR_Y0, SHAFT_TOP), (X1, Y1, SHAFT_TOP), planks, 1.5, faces={'-z'})
    joist = L.simple_material('NM_Joist', (0.16, 0.11, 0.07), rough=0.8)
    x = X0 + 0.2
    while x < X1:
        y1 = STAIR_Y0 if x > STAIR_X0 - 0.35 else Y1
        L.add_box('joist', (x - 0.03, Y0, CEIL - 0.2), (x + 0.03, y1, CEIL), joist, 0.5)
        x += 0.45
    return walls


def stairs(wood, rail_mat):
    for i in range(STEPS):
        x0 = STAIR_X0 + i * RUN
        top = (i + 1) * RISE
        L.add_box(f'step_{i}', (x0, STAIR_Y0, FLOOR), (x0 + RUN + 0.02, STAIR_Y1, top), wood, 0.6)
    L.add_box('landing', (LANDING_X, STAIR_Y0, FLOOR), (X1, STAIR_Y1, CEIL), wood, 0.6)
    # handrail on the open side, and posts
    for i in range(0, STEPS + 1, 3):
        x = STAIR_X0 + i * RUN + 0.1
        z = (i + 1) * RISE if i < STEPS else CEIL
        L.add_box('post', (x - 0.03, STAIR_Y0 - 0.06, z), (x + 0.03, STAIR_Y0, z + 0.9), rail_mat, 0.5)
    a = Vector((STAIR_X0 + 0.1, STAIR_Y0 - 0.03, RISE + 0.9))
    b = Vector((LANDING_X, STAIR_Y0 - 0.03, CEIL + 0.9))
    cylinder('handrail', a, b, 0.025, rail_mat, 12)
    cylinder('handrail_top', b, (X1, STAIR_Y0 - 0.03, CEIL + 0.9), 0.025, rail_mat, 12)


def wren_computer():
    """Wren lives here: a desk, a monitor (Ivy's face), a tower and a humming rack."""
    desk_at = Vector((0.4, Y0 + 0.5, FLOOR))
    L.ph_model('metal_office_desk', desk_at, yaw_deg=180, name='wren_desk')
    top = L.surface_z(desk_at.x, desk_at.y, 2.0, 0.79)
    black = L.simple_material('NM_BlackPlastic', (0.015, 0.015, 0.017), rough=0.35)
    mx, my, mz = desk_at.x, desk_at.y - 0.1, top
    L.add_box('monitor_stand', (mx - 0.1, my - 0.08, mz), (mx + 0.1, my + 0.08, mz + 0.02), black)
    L.add_box('monitor_neck', (mx - 0.025, my + 0.01, mz), (mx + 0.025, my + 0.05, mz + 0.2), black)
    L.add_box('monitor', (mx - 0.3, my - 0.03, mz + 0.16), (mx + 0.3, my + 0.01, mz + 0.53), black)
    screen = L.add_quad('DYN_monitor_screen', [(mx + 0.28, my + 0.0105, mz + 0.18), (mx - 0.28, my + 0.0105, mz + 0.18),
                                               (mx - 0.28, my + 0.0105, mz + 0.51), (mx + 0.28, my + 0.0105, mz + 0.51)])
    uv = screen.data.uv_layers[0]
    for li, (a, b) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = (a, b)
    L.dynamic(screen)
    L.marker('monitor_screen', (mx, my + 0.05, mz + 0.345), 180)
    L.add_box('keyboard', (mx - 0.22, my + 0.18, mz), (mx + 0.22, my + 0.33, mz + 0.02), black)
    # tower and rack with status lights
    leds = L.simple_material('NM_Leds', (0.02, 0.05, 0.08), rough=0.4, emission=(0.2, 0.55, 1.0), emission_strength=4.0)
    L.emissive('NM_Leds', states=('on', 'moon'), color='#3f8cff', strength=4.0)
    L.add_box('tower', (mx + 0.55, my - 0.3, mz), (mx + 0.75, my + 0.15, mz + 0.45), black)
    L.nobake(L.add_box('tower_led', (mx + 0.6, my + 0.151, mz + 0.38), (mx + 0.7, my + 0.155, mz + 0.39), leds), cast_shadow=False)
    rx, ry = X1 - 0.45, Y0 + 0.45
    L.add_box('rack', (rx - 0.3, ry - 0.3, FLOOR), (rx + 0.3, ry + 0.3, FLOOR + 1.25), black)
    for i in range(6):
        z = FLOOR + 0.2 + i * 0.17
        L.nobake(L.add_box(f'rack_led_{i}', (rx - 0.22, ry + 0.301, z), (rx - 0.22 + 0.04 + (i % 3) * 0.05, ry + 0.305, z + 0.012), leds), cast_shadow=False)
    # an upturned crate to sit on
    L.ph_model('plastic_crate_01', (mx, my + 0.95, FLOOR), yaw_deg=10, name='crate_seat')
    L.proxy('stay', (mx, my + 0.9, FLOOR + 0.45), (0.8, 0.8, 0.9))


def breaker(metal):
    """The main breaker: a grey box on the west wall with a big knife switch (DYN_breaker_lever)."""
    bx, by, bz = X0 + 0.05, -0.9, 1.4
    box = L.ph_model('power_box_01', (bx + 0.047, by, bz), yaw_deg=90, name='breaker_box')  # front faces the room (+X)
    red = L.simple_material('NM_RedGrip', (0.4, 0.02, 0.02), rough=0.5)
    # the lever pivots on a boss beside the box; up = on. Fx turns it about X (along the wall) to pull it.
    px, py, pz = X0 + 0.12, by + 0.3, bz - 0.05
    L.add_box('lever_boss', (X0, py - 0.05, pz - 0.05), (px, py + 0.05, pz + 0.05), metal)
    arm = L.add_box('lever_arm', (-0.015, -0.015, 0), (0.015, 0.015, 0.32), metal)
    grip = L.add_box('lever_grip', (-0.03, -0.03, 0.28), (0.03, 0.03, 0.4), red)
    lever = L.join([arm, grip], 'DYN_breaker_lever')
    lever.location = (px + 0.02, py, pz)
    L.dynamic(lever)
    L.proxy('breaker', (X0 + 0.25, by + 0.1, bz), (0.5, 0.9, 0.9))
    L.marker('breaker', (X0 + 0.3, by + 0.1, bz), -90)
    return box


def coal_door(wood, concrete, metal):
    """Four concrete steps up to a low wooden hatch in the north wall: the old coal chute."""
    cx0, cx1 = X0 + 0.25, X0 + 1.35
    for i in range(4):
        y = Y1 - 1.3 + i * 0.28
        L.add_box(f'coal_step_{i}', (cx0, y, FLOOR), (cx1, Y1, FLOOR + (i + 1) * 0.2), concrete, 0.6)
    hz0, hz1 = FLOOR + 0.8, FLOOR + 1.95
    frame = [L.add_box('coal_frame_l', (cx0 + 0.05, Y1 - 0.1, hz0), (cx0 + 0.15, Y1, hz1), wood, 0.6),
             L.add_box('coal_frame_r', (cx1 - 0.15, Y1 - 0.1, hz0), (cx1 - 0.05, Y1, hz1), wood, 0.6),
             L.add_box('coal_frame_t', (cx0 + 0.05, Y1 - 0.1, hz1 - 0.1), (cx1 - 0.05, Y1, hz1), wood, 0.6)]
    planks = L.image_material('NM_CoalHatch', os.path.join(L.BITTERLI, 'staircase', 'staircase', 'textures', 'WoodPanel.jpg'),
                              rough=0.7, tint=(0.25, 0.2, 0.16))
    L.add_box('coal_hatch', (cx0 + 0.15, Y1 - 0.06, hz0), (cx1 - 0.15, Y1 - 0.02, hz1 - 0.1), planks, 0.5)
    for z in (hz0 + 0.2, hz1 - 0.35):
        L.add_box('coal_strap', (cx0 + 0.15, Y1 - 0.075, z), (cx1 - 0.15, Y1 - 0.06, z + 0.06), metal, 0.5)
    L.add_box('coal_bolt', ((cx0 + cx1) / 2 + 0.2, Y1 - 0.1, hz0 + 0.5), ((cx0 + cx1) / 2 + 0.3, Y1 - 0.06, hz0 + 0.56), metal, 0.5)
    cx = (cx0 + cx1) / 2
    L.proxy('door_coal', (cx, Y1 - 0.35, hz0 + 0.5), (1.1, 0.6, 1.2), door='coal')
    L.marker('door_coal', (cx, Y1 - 1.6, FLOOR), 0, door='coal')


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    concrete_wall = L.ph_texture_material('NM_BasementWall', 'concrete_wall_006', res='2k', tint=(0.62, 0.6, 0.58))
    concrete_floor = L.ph_texture_material('NM_BasementFloor', 'concrete_floor_worn_001', res='2k', tint=(0.6, 0.58, 0.56))
    concrete = L.ph_texture_material('NM_Concrete', 'rough_concrete', res='1k', tint=(0.55, 0.54, 0.52))
    planks = L.ph_texture_material('NM_Planks', 'old_wooden_floor_02', res='1k', tint=(0.35, 0.3, 0.26))
    wood = L.ph_texture_material('NM_StairWood', 'old_wooden_floor_02', res='1k', tint=(0.55, 0.45, 0.36))
    metal = L.simple_material('NM_DarkMetal', (0.05, 0.05, 0.055), rough=0.45, metal=0.8)
    shell(concrete_wall, concrete_floor, planks)
    stairs(wood, L.simple_material('NM_RailWood', (0.2, 0.13, 0.08), rough=0.6))

    dwood, trim, brass = L.door_materials(L.simple_material('NM_BasementTrim', (0.35, 0.3, 0.26), rough=0.7))
    L.make_door('kitchen', (X1, (STAIR_Y0 + STAIR_Y1) / 2, CEIL), 90, dwood, trim, brass, width=0.82)

    wren_computer()
    breaker(metal)
    coal_door(L.simple_material('NM_CoalFrame', (0.12, 0.09, 0.06), rough=0.8), concrete, metal)

    # boxes of Ivy's things along the east wall, some labelled
    boxes = [(X1 - 0.35, -1.6, 0, 0, 'ivy_keep'), (X1 - 0.35, -1.0, 0, 5, None), (X1 - 0.35, -1.3, 0.34, -4, 'ivy_keep'),
             (X1 - 0.35, -0.3, 0, -8, 'ivy_toys'), (X1 - 0.95, -1.9, 0, 80, None), (X1 - 0.35, 0.3, 0, 3, 'xmas'),
             (X1 - 0.35, 0.0, 0.34, 12, None)]
    for i, (x, y, z, yaw, lab) in enumerate(boxes):
        L.ph_model('cardboard_box_01', (x, y, FLOOR + z), yaw_deg=90 + yaw, name=f'box_{i}')
        if lab:
            label(f'label_{i}', lab, (x - 0.232 - abs(yaw) * 0.002, y, FLOOR + z + 0.2), 0.3, '-x')

    # water heater, shelves, pipes
    enamel = L.simple_material('NM_HeaterEnamel', (0.6, 0.6, 0.57), rough=0.35)
    heater = cylinder('water_heater', (X0 + 0.45, Y0 + 0.45, FLOOR), (X0 + 0.45, Y0 + 0.45, FLOOR + 1.55), 0.28, enamel, 24)
    shelf_wood = L.simple_material('NM_ShelfWood', (0.3, 0.22, 0.14), rough=0.7)
    for i, z in enumerate((0.25, 0.75, 1.25, 1.75)):
        L.add_box(f'shelf_{i}', (X0 + 1.0, Y0, z), (X0 + 2.4, Y0 + 0.4, z + 0.03), shelf_wood, 0.6)
    for x in (X0 + 1.0, X0 + 2.37):
        L.add_box('shelf_side', (x, Y0, FLOOR), (x + 0.03, Y0 + 0.4, 1.8), shelf_wood, 0.6)
    pipe = L.simple_material('NM_Pipe', (0.28, 0.2, 0.14), rough=0.4, metal=0.9)
    cylinder('pipe_1', (X0, Y0 + 0.3, CEIL - 0.28), (X1, Y0 + 0.3, CEIL - 0.28), 0.05, pipe)
    cylinder('pipe_2', (X0, Y0 + 0.5, CEIL - 0.32), (X1, Y0 + 0.5, CEIL - 0.32), 0.03, pipe)
    cylinder('pipe_3', (X0 + 0.45, Y0 + 0.45, FLOOR + 1.55), (X0 + 0.45, Y0 + 0.45, CEIL - 0.28), 0.04, pipe)

    # the bare bulb on a pull chain
    socket = L.ph_model('pull_chain_light_socket', (0.2, -0.3, CEIL - 0.2), name='bulb_socket')
    L.nocollide(socket)
    bulb = L.ph_model('lightbulb_01', (0.2, -0.3, CEIL - 0.25), yaw_deg=0, tilt=(180, 0), name='bulb')
    L.nocollide(bulb)
    L.emissive('lightbulb_01_glass', states=('on', 'moon'), color='#ffd28a', strength=12.0)

    # a small high window in the south wall: snow against the glass, a little moonlight
    frost = L.simple_material('NM_FrostGlass', (0.6, 0.65, 0.72), rough=0.6, emission=(0.2, 0.26, 0.4), emission_strength=0.4)
    L.emissive('NM_FrostGlass', states=('on', 'moon'), color='#5a6f9c', strength=0.4)
    w = L.add_box('high_window', (-2.2, Y0 - 0.001, CEIL - 0.55), (-1.4, Y0 + 0.002, CEIL - 0.25), frost)
    L.nobake(w, cast_shadow=False)

    # ---- bake lights (the bulb is on in both states: Wren leaves it on for you)
    L.light('bulb', 'POINT', (0.2, -0.3, CEIL - 0.33), 55, '#ffc98a', radius=0.03, states=('on', 'moon'))
    L.light('monitor_glow', 'AREA', (0.4, Y0 + 0.55, 1.15), 6, '#8fb4ff', states=('on', 'moon'), direction=(0, 1, -0.1))
    bpy.data.lights['monitor_glow'].size = 0.5
    # a weak bulb over the top of the stairs, so coming down from the kitchen isn't a black screen
    L.light('stair_light', 'POINT', (3.3, 2.5, CEIL + 2.1), 14, '#ffd0a0', radius=0.05, states=('on', 'moon'))
    L.light('window_moon', 'AREA', (-1.8, Y0 + 0.05, CEIL - 0.4), 6, '#9fb4e6', states=('on', 'moon'), direction=(0, 1, -0.6))
    bpy.data.lights['window_moon'].size = 0.7
    L.set_world(color=(0.002, 0.0025, 0.004))
    return {
        'lightmap_size': 2048,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.002, 0.0025, 0.004)}, 'moon': {'color': (0.002, 0.0025, 0.004)}},
        'exposure': {'on': 1.3, 'moon': 1.5},
    }
