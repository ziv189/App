"""Kitchen: Country Kitchen by Jay-Artist (CC BY 3.0) + fridge, answering machine, Wren's panel and doors.

The kitchen units, dining table and window are the scene's own. The empty half of the room (where the
render camera stood) gets the fridge with Ivy's drawings, a sideboard with the answering machine and the
phone charger, Wren's wall panel, and the doors: hall and cellar on the south wall, back door on the east.
"""
import math
import os

import bpy
from mathutils import Vector

import nm_lib as L

SCENE = os.path.join(L.ROOT, 'assets-src', 'work', 'kitchen-import.blend')
TEX = os.path.join(L.ROOT, 'assets-src', 'work', 'tex')

FLOOR = -0.021
CEIL = 3.228
EAST, WEST, SOUTH, NORTH = 3.429, -2.491, -5.012, 2.78


def fridge():
    """A tall enamel fridge-freezer with two of Ivy's drawings held up by magnets."""
    enamel = L.simple_material('NM_FridgeEnamel', (0.78, 0.78, 0.76), rough=0.22)
    chrome = L.simple_material('NM_Chrome', (0.8, 0.8, 0.82), rough=0.15, metal=1.0)
    gap = L.simple_material('NM_FridgeGap', (0.02, 0.02, 0.02), rough=0.6)
    x0, x1 = EAST - 0.7, EAST - 0.01
    y0, y1 = -1.35, -0.6
    parts = [
        L.add_box('fridge_body', (x0 + 0.03, y0, FLOOR), (x1, y1, FLOOR + 1.86), enamel),
        L.add_box('fridge_freezer', (x0, y0 + 0.005, FLOOR + 0.03), (x0 + 0.035, y1 - 0.005, FLOOR + 0.66), enamel),
        L.add_box('fridge_door', (x0, y0 + 0.005, FLOOR + 0.675), (x0 + 0.035, y1 - 0.005, FLOOR + 1.85), enamel),
        L.add_box('fridge_seam', (x0 + 0.005, y0 + 0.01, FLOOR + 0.66), (x0 + 0.03, y1 - 0.01, FLOOR + 0.675), gap),
        L.add_box('fridge_handle_hi', (x0 - 0.03, y1 - 0.07, FLOOR + 0.95), (x0 - 0.01, y1 - 0.05, FLOOR + 1.35), chrome),
        L.add_box('fridge_handle_lo', (x0 - 0.03, y1 - 0.07, FLOOR + 0.42), (x0 - 0.01, y1 - 0.05, FLOOR + 0.6), chrome),
    ]
    L.join(parts, 'fridge')
    # the drawings (their full-size versions are shown in the game's reader)
    for i, (name, y, z, w) in enumerate((('family', -0.97, 1.28, 0.36), ('ice', -1.12, 0.3, 0.3))):
        mat = L.image_material(f'NM_Drawing_{name}', os.path.join(TEX, f'drawing_{name}.png'), rough=0.9)
        h = w * 338 / 512
        tilt = math.radians(4 if i == 0 else -6)
        c = Vector((x0 - 0.002, y, FLOOR + z))
        corners = []
        for (du, dv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            dy = du * w / 2 * math.cos(tilt) - dv * h / 2 * math.sin(tilt)
            dz = du * w / 2 * math.sin(tilt) + dv * h / 2 * math.cos(tilt)
            corners.append(c + Vector((0, -dy, dz)))  # seen from -X: the drawing's right is -Y
        q = L.add_quad(f'drawing_{name}', corners, mat)
        uv = q.data.uv_layers[0]
        for li, (u, v) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
            uv.data[li].uv = (u, v)
        magnet = L.add_box(f'magnet_{name}', (x0 - 0.012, y - 0.012, FLOOR + z + h / 2 - 0.03), (x0 - 0.002, y + 0.012, FLOOR + z + h / 2 - 0.006),
                           L.simple_material('NM_MagnetRed', (0.5, 0.03, 0.02), rough=0.4))
        L.nocollide(magnet)
    L.proxy('fridge', ((x0 + x1) / 2 - 0.2, (y0 + y1) / 2, FLOOR + 1.0), (0.9, 0.8, 1.9))


def sideboard():
    """Sideboard by the east wall: the answering machine (blinking) and the phone charger."""
    wood = L.ph_texture_material('NM_SideboardWood', 'wood_floor_worn', res='2k', tint=(0.45, 0.33, 0.24), rough=0.5)
    black = L.simple_material('NM_BlackPlastic', (0.015, 0.015, 0.017), rough=0.35)
    x0, x1 = EAST - 0.45, EAST - 0.01
    y0, y1 = -3.95, -2.6
    top = FLOOR + 0.86
    L.add_box('sideboard', (x0, y0, FLOOR), (x1, y1, top - 0.03), wood)
    L.add_box('sideboard_top', (x0 - 0.02, y0 - 0.02, top - 0.03), (x1, y1 + 0.02, top), wood)
    # answering machine: body, cassette window, a red message light
    ax, ay = EAST - 0.24, -3.45
    L.add_box('answering_body', (ax - 0.1, ay - 0.13, top), (ax + 0.1, ay + 0.13, top + 0.055), black)
    tape = L.simple_material('NM_TapeWindow', (0.05, 0.05, 0.06), rough=0.1)
    L.add_box('answering_tape', (ax - 0.05, ay - 0.06, top + 0.055), (ax + 0.03, ay + 0.06, top + 0.058), tape)
    led = L.simple_material('NM_LedRed', (0.3, 0.0, 0.0), rough=0.3, emission=(1.0, 0.05, 0.02), emission_strength=8.0)
    L.emissive('NM_LedRed', states=('on', 'moon'), color='#ff1a08', strength=8.0)
    l = L.add_box('answering_led', (ax - 0.075, ay + 0.085, top + 0.055), (ax - 0.06, ay + 0.1, top + 0.062), led)
    L.nobake(l, cast_shadow=False)
    L.proxy('answering', (ax, ay, top + 0.1), (0.4, 0.45, 0.3))
    L.marker('answering', (ax, ay, top + 0.08), 90)
    # charger: a little dock with a cable; Jordan's phone appears on it in chapter 2
    cx, cy = EAST - 0.22, -2.95
    L.add_box('charger_dock', (cx - 0.05, cy - 0.09, top), (cx + 0.05, cy + 0.09, top + 0.012), black)
    phone_mat = L.simple_material('NM_PhoneBlack', (0.02, 0.02, 0.025), rough=0.25)
    phone = L.add_box('jordan_phone_charging', (-0.037, -0.08, 0), (0.037, 0.08, 0.008), phone_mat)
    phone.location = (cx, cy, top + 0.013)
    L.dynamic(phone, 'jordan_phone_charging')
    L.hidden(phone)
    L.proxy('charger', (cx, cy, top + 0.08), (0.35, 0.35, 0.25))


def wren_panel():
    """Wren's wall panel between the doors: a black glass tablet whose screen shows her (or Ivy)."""
    frame = L.simple_material('NM_PanelFrame', (0.01, 0.01, 0.012), rough=0.2)
    x, z = 0.2, FLOOR + 1.45
    L.add_box('wren_panel', (x - 0.17, SOUTH, z - 0.12), (x + 0.17, SOUTH + 0.018, z + 0.12), frame)
    # facing +Y (into the kitchen); seen from there, u runs towards -X
    screen = L.add_quad('DYN_tablet_screen', [(x + 0.15, SOUTH + 0.0195, z - 0.1), (x - 0.15, SOUTH + 0.0195, z - 0.1),
                                              (x - 0.15, SOUTH + 0.0195, z + 0.1), (x + 0.15, SOUTH + 0.0195, z + 0.1)])
    uv = screen.data.uv_layers[0]
    for li, (u, v) in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = (u, v)
    L.dynamic(screen)
    L.proxy('tablet', (x, SOUTH + 0.12, z), (0.5, 0.3, 0.4))
    L.marker('tablet_front', (x, SOUTH + 1.05, FLOOR), 180)


def decor():
    """The door half of the kitchen was bare: pictures either side of Wren's panel, a painted dresser in the
    corner, the old wall telephone, a bench by the back door, and food on the island and the table."""
    # a strip of the south wall between the doors is modelled inside out (it baked black)
    L.face_into_room((-1.75, SOUTH - 0.05, FLOOR - 0.1), (0.75, SOUTH + 0.05, CEIL + 0.1), (0, 1, 0))
    L.picture('art_apples', 'cezanne_apples', (-0.43, SOUTH, FLOOR + 1.58), 0, 0.62, frame='walnut')
    L.picture('art_christmas', 'larsson_christmas', (0.9, SOUTH, FLOOR + 1.58), 0, 0.76, frame='oak')
    # a painted dresser in the south-east corner, the tea set on its counter
    dresser = L.ph_model('painted_wooden_cabinet_02', (2.9, SOUTH + 0.328, FLOOR), yaw_deg=180, name='kitchen_dresser')
    counter = L.surface_z(2.9, SOUTH + 0.45, FLOOR + 1.25, FLOOR + 0.9)
    L.ornament('tea_set_01', (2.9, SOUTH + 0.42, counter), yaw_deg=180, scale=0.85, name='tea_set', budget=12000)
    L.ornament('jug_01', (2.55, SOUTH + 0.2, L.world_bbox(dresser)[1].z), yaw_deg=160, name='jug_top')
    # the east wall: the Milkmaid over the sideboard, the wall telephone, a bench by the back door
    L.picture('art_milkmaid', 'vermeer_milkmaid', (EAST, -3.3, FLOOR + 1.65), 90, 0.5, frame='walnut')
    phone = L.ornament('vintage_telephone_wall_clock', (EAST - 0.002, -2.0, FLOOR + 1.42), yaw_deg=-90, name='wall_telephone', budget=8000)
    L.clear_glass(phone)
    bench = L.ph_model('painted_wooden_bench', (EAST - 0.26, 0.1, FLOOR), yaw_deg=-90, name='back_door_bench')
    seat = L.surface_z(EAST - 0.3, 0.3, FLOOR + 0.7, FLOOR + 0.45)
    L.ornament('wicker_basket_02', (EAST - 0.3, 0.3, seat), yaw_deg=-70, name='bench_basket')
    # a runner between the doors and the island
    L.rug('kitchen_runner', (0.25, -3.35, FLOOR), (2.4, 0.95), 0, 'poly_wool_herringbone', tint=(0.85, 0.72, 0.6), tile=0.5,
          border_color=(0.3, 0.12, 0.08))
    # fruit: bananas on the island, apples in a bowl on the table
    L.ornament('bananas', (0.3, -0.62, L.surface_z(0.3, -0.62, 1.6, 0.99)), yaw_deg=35, scale=0.7, name='bananas', budget=6000)
    tz = L.surface_z(0.42, 1.42, 2.0, 0.78)
    L.ornament('wooden_bowl_01', (0.42, 1.42, tz), yaw_deg=0, name='fruit_bowl')
    for i, (dx, dy, yaw) in enumerate(((-0.04, -0.03, 10), (0.05, -0.01, 80), (0.0, 0.05, 150))):
        L.ornament('food_apple_01', (0.42 + dx, 1.42 + dy, tz + 0.012), yaw_deg=yaw, scale=0.85, name=f'apple_{i}', budget=1500)


def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    wood, trim, brass = L.door_materials()

    L.make_door('hall', (-1.35, SOUTH, FLOOR), 0, wood, trim, brass)
    cellar_wood = L.image_material('NM_CellarWood', os.path.join(L.BITTERLI, 'staircase', 'staircase', 'textures', 'WoodPanel.jpg'),
                                   rough=0.55, tint=(0.36, 0.3, 0.26))
    L.make_door('basement', (1.85, SOUTH, FLOOR), 0, cellar_wood, trim, brass, hinge='right')
    L.make_door('back', (EAST, 1.25, FLOOR), 90, wood, trim, brass, width=0.9)

    fridge()
    sideboard()
    wren_panel()
    decor()

    # Dana's list on the table
    paper = L.simple_material('NM_Paper', (0.8, 0.78, 0.72), rough=0.9)
    tz = L.surface_z(-0.45, -0.72, 2.0, 0.95)
    note = L.add_box('danas_list', (-0.105, -0.14, 0), (0.105, 0.14, 0.002), paper)
    note.location = (-0.45, -0.72, tz)
    note.rotation_euler = (0, 0, math.radians(12))
    L.nocollide(note)
    L.proxy('list', (-0.45, -0.72, tz + 0.1), (0.45, 0.45, 0.25))

    # the watering can on the counter top at the window end of the units (probe from below the wall
    # cabinets, or the ray lands on a cabinet shelf)
    cz = L.surface_z(-1.75, 2.2, 1.3, 0.985)
    can = L.ph_model('watering_can_metal_01', (-1.75, 2.2, cz), yaw_deg=60, name='DYN_watering_can')
    L.dynamic(can, 'watering_can')
    L.proxy('watering_can', (-1.75, 2.2, cz + 0.15), (0.5, 0.5, 0.4))

    plant = L.ph_model('potted_plant_01', (1.6, 2.25, FLOOR), yaw_deg=10, name='plant_kitchen')
    L.proxy('plant_kitchen', (1.6, 2.25, FLOOR + 0.45), (0.6, 0.6, 0.9))

    lamp = L.ph_model('modern_ceiling_lamp_01', (0.5, -2.6, CEIL), name='ceiling_lamp')
    lo, hi = L.world_bbox(lamp)
    lamp.location.z -= hi.z - CEIL
    L.nocollide(lamp)

    L.security_camera('cam_kitchen', (EAST - 0.12, NORTH - 0.35, CEIL - 0.2), 135)  # north-east corner, looking south-west

    # ---- bake lights
    L.light('pendant', 'POINT', (0.19, 1.62, 2.36), 90, '#ffd2a0', radius=0.1, states=('on',))
    for i, y in enumerate((1.05, 1.6, 2.15)):
        L.light(f'under_cabinet_{i}', 'AREA', (-2.39, y, 1.6), 12, '#ffdcb0', states=('on',), direction=(0, 0, -1))
        bpy.data.lights[f'under_cabinet_{i}'].size = 0.45
    L.light('ceiling_lamp', 'POINT', (0.5, -2.6, CEIL - 0.25), 110, '#ffe0bd', radius=0.2, states=('on',))
    L.light('window_moon', 'AREA', (0.06, 3.1, 1.95), 60, '#9fb4e6', states=('moon', 'on'), direction=(0, -1, -0.3))
    bpy.data.lights['window_moon'].size = 1.5
    for m in ('Bulb', 'LampInside'):
        try:
            L.emissive(m, states=('on',), color='#ffd2a0', strength=3.0)
        except KeyError:
            pass

    return {
        'lightmap_size': 2048,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.004, 0.005, 0.009)}, 'moon': {'color': (0.004, 0.005, 0.009)}},
        'exposure': {'on': 1.0, 'moon': 2.4},
    }
