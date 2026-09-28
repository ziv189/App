#!/usr/bin/env python3
"""The dialogue coverage lint passes on the real data and names each kind of damage done to a copy of it."""
import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'lint'))
import dialogue_coverage  # noqa: E402

DATA = ROOT / 'game' / 'data' / 'dialogue'
SCENE = 'scene_05.json'  # Hale's room: several speakers, directions and an examine line


def damaged_copy(mutate):
    tmp = Path(tempfile.mkdtemp())
    for path in DATA.glob('*.json'):
        shutil.copy(path, tmp / path.name)
    doc = json.loads((tmp / SCENE).read_text())
    mutate(tmp, doc['lines'])
    if (tmp / SCENE).exists():
        (tmp / SCENE).write_text(json.dumps(doc))
    return tmp


def alter(tmp, lines):
    lines[0]['script_text'] = lines[0]['script_text'].replace('Morning', 'Evening')


def swap(tmp, lines):
    lines[1], lines[2] = lines[2], lines[1]


def misattribute(tmp, lines):
    lines[0]['speaker'] = 'RUTH'


def drop_line(tmp, lines):
    del lines[3]


def drop_scene(tmp, lines):
    (tmp / SCENE).unlink()


CASES = [(alter, 'altered'), (swap, 'reordered'), (misattribute, 'wrong speaker'),
         (drop_line, 'missing:'), (drop_scene, 'missing scene file')]


def main():
    failures = []
    clean = dialogue_coverage.check(DATA)
    if clean:
        failures.append(f'real data should pass, got: {clean[:3]}')
    for mutate, expected in CASES:
        problems = dialogue_coverage.check(damaged_copy(mutate))
        if not any(expected in p for p in problems):
            failures.append(f'{mutate.__name__}: expected a "{expected}" problem, got: {problems[:3]}')
    for f in failures:
        print(f'test_dialogue_coverage: FAIL: {f}')
    print(f'test_dialogue_coverage: {"PASS" if not failures else f"{len(failures)} failure(s)"}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
