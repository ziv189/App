#!/usr/bin/env python3
"""Generate SCENE_TRACKER.md and AUDIO_CUE_SHEET.md from docs/directors_script.md.

The scene tracker lists every numbered scene, the secret ending and the refusal beat, with
the phase that builds it (brief §12.1), who speaks, and how many GAMEPLAY beats it has.

The audio cue sheet is a first pass: it finds every sentence that names a sound (brief §8.9)
and maps it to a motif where it can. It over-reports on purpose; each row is reviewed by hand
in Phase 1 before the audio lint is switched on, and the row's status records that review.

Usage:
    gen_trackers.py            # run from the project root (conviction/)
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'docs' / 'directors_script.md'

PHASES = [  # (phase, scene ids) from brief §12.1
    (3, ['1', '2', '3']),
    (4, [str(n) for n in range(4, 12)]),
    (5, [str(n) for n in range(12, 18)] + ['15A']),
    (6, [str(n) for n in range(18, 25)] + ['22A', '22B']),
    (7, [str(n) for n in range(25, 29)]),
    (8, [str(n) for n in range(29, 35)]),
    (9, [str(n) for n in range(35, 42)] + ['38A']),
    (10, ['42', 'refusal']),
]
PHASE_OF = {sid: phase for phase, ids in PHASES for sid in ids}

# Ordered: the first matching rule names the cue. (pattern, cue type, motif or asset, bus)
CUE_RULES = [
    (r'\bSOUND:', 'scripted SOUND line', 'per line', 'SFX'),
    (r'\bknock', 'three knocks', 'MOTIF knocks (material variant per source)', 'SFX'),
    (r'\bthunk\b', 'pin thunk', 'MOTIF pin thunk', 'SFX'),
    (r'\bhum\b', 'the hum', 'MOTIF hum', 'Ambience'),
    (r'\bhandcuffs?\b|\bratchet\b', 'handcuffs', 'MOTIF handcuffs', 'SFX'),
    (r'\broar', 'monster roar', 'MOTIF monster roar', 'SFX'),
    (r'\bwhisper', "Lily's whisper", "MOTIF Lily's whisper", 'Dialogue'),
    (r'\bradiator\b', 'radiator', 'radiator hiss / clank', 'Ambience'),
    (r'\bsecond hand\b|\btick', 'clock', 'MOTIF clock', 'SFX'),
    (r'\bclick', 'click', 'MOTIF flashlight click or lamp click', 'SFX'),
    (r'\bchain\b', 'chain', 'door chain or Room chain Foley', 'SFX'),
    (r'\brings?\b|\bdial tone\b|\bbuzz', 'phone or buzzer', 'phone ring / buzz', 'SFX'),
    (r'\bstrings\b|\bmusic\b|\bpiano\b', 'music', 'music cue', 'Music'),
    (r'\bsilen(ce|t)\b', 'designed silence', 'silence (mix snapshot)', 'Master'),
    (r'\bsiren\b', 'siren', 'distant siren', 'Ambience'),
    (r'\bdrip\b', 'drip', 'drip', 'Ambience'),
    (r'\bdryers?\b', 'dryers', 'dryer thump', 'Ambience'),
    (r'\brain\b', 'rain', 'rain bed', 'Ambience'),
    (r'\bfootsteps?\b', 'footsteps', 'Foley footsteps', 'SFX'),
    (r'\bshutter\b|\bflash goes off\b', 'camera', "Ruth's camera shutter", 'SFX'),
    (r'\bscream', 'scream', 'distant scream', 'SFX'),
    (r'\btwang\b', 'string twang', 'credits string twang', 'SFX'),
    (r'\bclank|\bclatter|\bshatter|\bscrape|\bscratch', 'impact / scrape', 'Foley', 'SFX'),
]


def split_scenes(md):
    """Yield (scene_id, heading, body). Covers numbered scenes, the secret ending and the refusal beat."""
    marks = [(m.start(), m.group(1), m.group(0).lstrip('# ').strip())
             for m in re.finditer(r'^### (\d+[A-Z]?)\. .*$', md, flags=re.M)]
    refusal = re.search(r'^## Alternate beat: refusing to pin$', md, flags=re.M)
    marks.append((refusal.start(), 'refusal', 'Alternate beat: refusing to pin'))
    marks.sort()
    for i, (start, sid, heading) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(md)
        body = md[start:end]
        nxt = re.search(r'^## ', body[3:], flags=re.M)  # stop a scene at the next chapter heading
        if nxt and sid != 'refusal':
            body = body[:nxt.start() + 3]
        yield sid, heading, body


def speakers(body):
    names = re.findall(r"\*\*([A-Z][A-Z .'-]+?)(?: \([^)]*\))?:\*\*", body)
    seen = []
    for n in names:
        if n not in ('GAMEPLAY', 'SOUND') and n not in seen:
            seen.append(n)
    return seen


def plain(text):
    return re.sub(r'\*\*|(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])', '', text)


def sentences(body):
    for para in body.split('\n'):
        para = plain(para.strip().lstrip('-').strip())
        if not para or para.startswith('#'):
            continue
        for s in re.split(r'(?<=[.!?])\s+(?=[A-Z"(])', para):
            yield s.strip()


def scene_tracker(scenes):
    rows = []
    for sid, heading, body in scenes:
        beats = len(re.findall(r'\*\*GAMEPLAY:\*\*', body))
        who = ', '.join(speakers(body)) or '(no dialogue)'
        rows.append(f"| {sid} | {heading.split('. ', 1)[-1] if sid != 'refusal' else heading} | {PHASE_OF[sid]} | {who} | {beats} | not started | not started | 0/10 |")
    header = [
        '# Scene tracker',
        '',
        'Generated from `docs/directors_script.md` by `tools/pipeline/gen_trackers.py`. Regenerate after script changes; '
        'update the status columns by hand as work lands. "DoD" counts the ten Definition of Done items in brief §12.2, '
        'which are only ticked with evidence in `reports/`.',
        '',
        '| Scene | Heading | Phase | Speakers | GAMEPLAY beats | Shot list | Audio | DoD |',
        '|---|---|---|---|---|---|---|---|',
    ]
    return '\n'.join(header + rows) + '\n'


def audio_cue_sheet(scenes):
    rows, n = [], 0
    for sid, _, body in scenes:
        for s in sentences(body):
            for pattern, cue, asset, bus in CUE_RULES:
                if re.search(pattern, s, flags=re.I):
                    n += 1
                    excerpt = s if len(s) <= 160 else s[:157] + '...'
                    rows.append(f"| A{n:03d} | {sid} | {excerpt.replace('|', '/')} | {cue} | {asset} | {bus} | needs review |")
                    break
    header = [
        '# Audio cue sheet',
        '',
        'First pass generated from `docs/directors_script.md` by `tools/pipeline/gen_trackers.py`: every sentence that names '
        'a sound, mapped to a motif where possible (brief §8.3, §8.9). It over-reports on purpose. In Phase 1 each row is '
        'reviewed by hand and marked `cue`, `ambience note` or `not a cue` before the audio lint is switched on. Ambience beds '
        'per location (brief §8.4) are added then too.',
        '',
        '| ID | Scene | Script says | Cue | Motif / asset | Bus | Status |',
        '|---|---|---|---|---|---|---|',
    ]
    return '\n'.join(header + rows) + '\n', n


def main():
    md = SCRIPT.read_text()
    scenes = list(split_scenes(md))
    missing = sorted(set(PHASE_OF) - {sid for sid, _, _ in scenes})
    if missing:
        raise SystemExit(f'scenes missing from the script: {missing}')
    (ROOT / 'SCENE_TRACKER.md').write_text(scene_tracker(scenes))
    sheet, count = audio_cue_sheet(scenes)
    (ROOT / 'AUDIO_CUE_SHEET.md').write_text(sheet)
    print(f'SCENE_TRACKER.md: {len(scenes)} rows; AUDIO_CUE_SHEET.md: {count} candidate cues')


if __name__ == '__main__':
    main()
