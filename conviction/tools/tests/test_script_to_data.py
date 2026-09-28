#!/usr/bin/env python3
"""script_to_data keeps hand-filled production fields and keeps line IDs stable when other lines change."""
import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'pipeline'))
import script_to_data  # noqa: E402

SCENE = 'scene_05.json'


def test_production_fields_survive(failures):
    tmp = Path(tempfile.mkdtemp())
    for path in script_to_data.OUT_DIR.glob('*.json'):
        shutil.copy(path, tmp / path.name)
    doc = json.loads((tmp / SCENE).read_text())
    target = doc['lines'][2]
    target['voice_file'] = 'res://audio/dialogue/scene_05/recorded_take_3.ogg'
    target['subtitle_timing'] = [0.0, 2.4]
    (tmp / SCENE).write_text(json.dumps(doc))

    real_out = script_to_data.OUT_DIR
    script_to_data.OUT_DIR = tmp
    try:
        documents = script_to_data.build(script_to_data.SCRIPT.read_text())
        script_to_data.merge_production_fields(documents)
    finally:
        script_to_data.OUT_DIR = real_out
    kept = next(l for l in documents[SCENE]['lines'] if l['id'] == target['id'])
    if kept['voice_file'] != target['voice_file'] or kept['subtitle_timing'] != [0.0, 2.4]:
        failures.append(f'production fields were not kept: {kept["voice_file"]}, {kept["subtitle_timing"]}')


def test_ids_stable_when_a_line_is_added(failures):
    md = script_to_data.SCRIPT.read_text()
    anchor = '**WARD:** They didn\'t.'
    if md.count(anchor) != 1:
        failures.append(f'test anchor {anchor!r} not unique in the script')
        return
    before = script_to_data.build(md)[SCENE]['lines']
    after = script_to_data.build(md.replace(anchor, anchor + '\n\n**RUTH:** A line that was added later.'))[SCENE]['lines']
    added = [l for l in after if l['script_text'] == 'A line that was added later.']
    unchanged = {l['id'] for l in before} <= {l['id'] for l in after}
    if len(added) != 1 or not unchanged or len(after) != len(before) + 1:
        failures.append('adding one line changed other line IDs or line counts')


def main():
    failures = []
    test_production_fields_survive(failures)
    test_ids_stable_when_a_line_is_added(failures)
    for f in failures:
        print(f'test_script_to_data: FAIL: {f}')
    print(f'test_script_to_data: {"PASS" if not failures else f"{len(failures)} failure(s)"}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
