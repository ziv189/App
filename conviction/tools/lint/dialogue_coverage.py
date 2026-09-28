#!/usr/bin/env python3
"""Fail if any spoken line in the script is missing, altered, reordered or given to the wrong speaker in
game/data/dialogue/ (brief §10: every word ships exactly as written).

Re-parses docs/directors_script.md with tools/pipeline/script_to_data.py and compares each scene's lines,
in order, by speaker, qualifier and exact text.

Usage:
    dialogue_coverage.py [--data-dir DIR]
"""
import argparse
import difflib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'pipeline'))
import script_to_data  # noqa: E402  (needs the path above)


def _key(line):
    return (line['speaker'], line['qualifier'], line['script_text'])


def _show(line):
    who = line['speaker'] + (f" ({line['qualifier']})" if line['qualifier'] else '')
    return f'{who}: "{line["script_text"]}"'


def compare_scene(name, expected, actual):
    problems = []
    exp_keys, act_keys = [_key(l) for l in expected], [_key(l) for l in actual]
    if exp_keys != act_keys:
        matcher = difflib.SequenceMatcher(a=exp_keys, b=act_keys, autojunk=False)
        deleted = [expected[i] for tag, i1, i2, _, _ in matcher.get_opcodes() if tag in ('delete', 'replace') for i in range(i1, i2)]
        inserted = [actual[j] for tag, _, _, j1, j2 in matcher.get_opcodes() if tag in ('insert', 'replace') for j in range(j1, j2)]
        moved = {_key(l) for l in deleted} & {_key(l) for l in inserted}
        for line in deleted:
            if _key(line) in moved:
                problems.append(f'{name}: reordered: {_show(line)}')
                continue
            twin = next((a for a in inserted if a['script_text'] == line['script_text'] and _key(a) not in moved), None)
            if twin:
                problems.append(f'{name}: wrong speaker: {_show(line)} is attributed to {twin["speaker"]}')
                inserted.remove(twin)
                continue
            near = next((a for a in inserted if a['speaker'] == line['speaker'] and _key(a) not in moved and
                         difflib.SequenceMatcher(a=a['script_text'], b=line['script_text']).ratio() > 0.6), None)
            if near:
                problems.append(f'{name}: altered: {_show(line)} became "{near["script_text"]}"')
                inserted.remove(near)
            else:
                problems.append(f'{name}: missing: {_show(line)}')
        for line in inserted:
            if _key(line) not in moved:
                problems.append(f'{name}: not in the script: {_show(line)}')
    for exp, act in zip(expected, actual):
        if _key(exp) == _key(act) and exp['text'] != act['text']:
            problems.append(f'{name}: spoken text edited by hand for {_show(exp)}')
    return problems


def check(data_dir):
    documents = script_to_data.build(script_to_data.SCRIPT.read_text())
    problems = []
    for name, doc in documents.items():
        path = Path(data_dir) / name
        if not path.exists():
            problems.append(f'{name}: missing scene file ({len(doc["lines"])} lines)')
            continue
        problems += compare_scene(name, doc['lines'], json.loads(path.read_text())['lines'])
    for path in sorted(Path(data_dir).glob('*.json')):
        if path.name not in documents:
            problems.append(f'{path.name}: scene file with no scene in the script')
    return problems


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--data-dir', default=str(script_to_data.OUT_DIR))
    problems = check(ap.parse_args().data_dir)
    for p in problems:
        print(f'dialogue_coverage: {p}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
