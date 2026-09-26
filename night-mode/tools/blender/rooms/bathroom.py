"""Bathroom: Contemporary Bathroom by Mareck (CC0) + a door, Ivy's tablet and the mirror scare.

No security camera here ("bathrooms are private"): the one safe place in hide and seek, if the door would
open. The long mirror over the basins becomes a live reflection in the game (Fx.setupMirror).
"""
import math
import os

import bpy
from mathutils import Vector

import nm_lib as L

SCENE = os.path.join(L.ROOT, 'assets-src', 'work', 'bathroom-import.blend')

FLOOR = 0.0
CEIL = 2.792
EAST, NORTH = 2.5, 2.5


def build():
    bpy.ops.wm.open_mainfile(filepath=SCENE)
    wood, trim, brass = L.door_materials()
    L.make_door('hall', (EAST, 1.25, FLOOR), 90, wood, trim, brass, hinge='right')

    # the mirror: its reflection is rendered live, 2 mm in front of the glass
    L.marker('mirror', (-1.365, 2.428, 1.5), 180, width=1.6, height=0.84)
    L.marker('tap', (-1.72, 2.36, 1.0), 180)

    # Ivy's tablet: a kid's tablet in a pink rubber case, left on the floor by the bath
    case = L.simple_material('NM_KidCase', (0.55, 0.12, 0.25), rough=0.7)
    glass = L.simple_material('NM_TabletGlass', (0.01, 0.01, 0.012), rough=0.08)
    body = L.add_box('ivy_tablet_case', (-0.13, -0.095, 0), (0.13, 0.095, 0.014), case)
    screen = L.add_box('ivy_tablet_glass', (-0.105, -0.075, 0.014), (0.105, 0.075, 0.0155), glass)
    tab = L.join([body, screen], 'DYN_ivy_tablet')
    tab.location = (-0.55, 0.62, FLOOR + 0.002)
    tab.rotation_euler = (0, 0, math.radians(-25))
    L.dynamic(tab, 'ivy_tablet')
    L.proxy('ivy_tablet', (-0.55, 0.62, FLOOR + 0.12), (0.5, 0.5, 0.3))

    lamp = L.ph_model('modern_ceiling_lamp_01', (1.3, 1.3, CEIL), name='ceiling_lamp')
    lo, hi = L.world_bbox(lamp)
    lamp.location.z -= hi.z - CEIL
    L.nocollide(lamp)

    # ---- bake lights: the bulbs over the basins, a ceiling lamp, moonlight through the blinds
    for i, x in enumerate((-1.73, -1.49, -1.24, -0.99)):
        L.light(f'bulb_{i}', 'POINT', (x, 2.2, 1.88), 9, '#ffcf96', radius=0.04, states=('on',))
    L.light('ceiling', 'POINT', (1.3, 1.3, CEIL - 0.25), 60, '#ffe6c8', radius=0.15, states=('on',))
    L.light('window_moon', 'AREA', (-2.85, 1.4, 1.5), 40, '#9fb4e6', states=('moon', 'on'), direction=(1, 0, -0.25))
    bpy.data.lights['window_moon'].size = 0.9
    for m in ('BulbGlass', 'Light.001'):
        try:
            L.emissive(m, states=('on',), color='#ffd2a0', strength=4.0)
        except KeyError:
            pass
    return {
        'lightmap_size': 1024,
        'states': ['on', 'moon'],
        'world': {'on': {'color': (0.004, 0.005, 0.009)}, 'moon': {'color': (0.004, 0.005, 0.009)}},
        'exposure': {'on': 1.0, 'moon': 2.4},
    }
