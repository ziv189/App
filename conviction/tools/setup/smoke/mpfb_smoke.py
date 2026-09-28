# Creates an MPFB base human in a fresh Blender scene and prints what it made.
# Usage: blender -b --factory-startup -P tools/setup/smoke/mpfb_smoke.py
import sys
import time

import addon_utils

start = time.time()
module = next((m.__name__ for m in addon_utils.modules() if m.__name__.endswith('.mpfb')), None)
if module is None:
    sys.exit('mpfb_smoke: MPFB is not installed')
addon_utils.enable(module, default_set=True)
HumanService = sys.modules[module + '.services.humanservice'].HumanService
human = HumanService.create_human()
keys = len(human.data.shape_keys.key_blocks) if human.data.shape_keys else 0
print(f'mpfb_smoke: created "{human.name}" with {len(human.data.vertices)} vertices and {keys} shape keys '
      f'in {time.time() - start:.1f}s')
