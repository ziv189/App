#!/usr/bin/env python3
"""Check that the working Director's Script keeps its structure and the approved story rules.

- every numbered scene heading (1-42, 15A, 22A, 22B, 38A) appears exactly once
- the refusal beat and the secret ending sections exist
- no "(This script follows the pin on ...)" note survives: SC-01 replaced them with the
  complete-case board rule, and one coming back means an old draft was pasted in
- docs/STORY_CHANGES.md exists and its change IDs are unique

Runs in the pre-commit hook. Exits non-zero with one line per problem.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCENES = [str(n) for n in range(1, 43)] + ['15A', '22A', '22B', '38A']


def main():
    problems = []
    script = (ROOT / 'docs' / 'directors_script.md').read_text()
    heads = re.findall(r'^### (\d+[A-Z]?)\. ', script, flags=re.M)
    for sid in SCENES:
        if heads.count(sid) != 1:
            problems.append(f'scene {sid}: heading appears {heads.count(sid)} times, expected 1')
    for sid in sorted(set(heads) - set(SCENES)):
        problems.append(f'unexpected scene heading {sid}')
    for section in ('## Alternate beat: refusing to pin', '## Secret ending'):
        if not re.search(rf'^{re.escape(section)}$', script, flags=re.M):
            problems.append(f'missing section "{section}"')
    if 'This script follows the pin' in script:
        problems.append('a "This script follows the pin" note is back; SC-01 replaced these with the board rule')

    changes = ROOT / 'docs' / 'STORY_CHANGES.md'
    if not changes.exists():
        problems.append('docs/STORY_CHANGES.md is missing')
    else:
        ids = re.findall(r'^\| (SC-\d+) \|', changes.read_text(), flags=re.M)
        for dup in sorted({i for i in ids if ids.count(i) > 1}):
            problems.append(f'STORY_CHANGES.md lists {dup} more than once')

    for p in problems:
        print(f'script_structure: {p}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
