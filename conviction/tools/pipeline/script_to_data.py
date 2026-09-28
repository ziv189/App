#!/usr/bin/env python3
"""Turn every spoken line in docs/directors_script.md into dialogue data: game/data/dialogue/<scene>.json.

Each line records its speaker, delivery qualifier (V.O., ON PHONE, INTERCOM...), the verbatim script text,
the spoken words with stage directions removed, those directions, and where the voice, lip-sync and subtitle
timing will live (brief §10). Line IDs come from the line's content, so they stay stable when other lines move.

Regenerating keeps production fields (voice_file, lipsync_file, subtitle_timing) that were filled in by hand
or by later tools. Lines spoken inside prose (answering machines, radios, whisper fragments) are listed in
EMBEDDED_LINES and must be found verbatim, so a script edit that moves them fails loudly here.

Usage:
    script_to_data.py            # writes game/data/dialogue/
    script_to_data.py --check    # exits non-zero if game/data/dialogue/ is out of date
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'docs' / 'directors_script.md'
OUT_DIR = ROOT / 'game' / 'data' / 'dialogue'

NOT_DIALOGUE = {'GAMEPLAY', 'SOUND'}
LABEL = re.compile(r"\*\*([A-Z][A-Z .'-]+?)(?: \(([^)]*)\))?:\*\*\s*")
PARENTHETICAL = re.compile(r'_\(([^)]*)\)_')
# Refusal-beat placeholders that belong to the line, not to its delivery (docs/STORY_CHANGES.md, SC-02).
PLACEHOLDERS = {"the suspect's name", 'him/her', 'he/she', 'him/her/them', 'he/she/they'}
PRODUCTION_FIELDS = ('voice_file', 'lipsync_file', 'subtitle_timing')

# (scene, exact quoted text in the script, speaker, qualifier, subtitle speaker). Subtitle speakers hide who's
# really talking where the script does: the monster's "please" is Nadine, and the players mustn't be told.
EMBEDDED_LINES = [
    ('10', '...Mr. Ward...', 'LILY', 'WHISPER', 'LILY'),
    ('13', "It's Nadine Hale. My brother is dead and I know it was you. You waited six years. "
           "If the police won't do anything, I will.", 'NADINE', 'ANSWERING MACHINE', 'NADINE'),
    ('17', "...it's... please...", 'LILY', 'WHISPER', 'LILY'),
    ('23', '...please...', 'NADINE', 'THROUGH THE MONSTER', ''),
    ('23', "...Mr. Ward... please... it's...", 'LILY', 'WHISPER', 'LILY'),
    ('32', 'Six-D, all quiet.', 'BELL', 'RADIO', 'RADIO'),
]

# How the refusal beat's placeholders expand (BRANCHING.md: Chapter 1 refusal kills Tom, Chapter 2 kills Nadine).
REFUSAL_VARIANTS = [
    {'when': 'refused_chapter_1', "the suspect's name": 'Tom Marsh', 'him/her': 'him', 'he/she': 'he',
     'him/her/them': 'him', 'he/she/they': 'he'},
    {'when': 'refused_chapter_2', "the suspect's name": 'Nadine Hale', 'him/her': 'her', 'he/she': 'she',
     'him/her/them': 'her', 'he/she/they': 'she'},
    {'when': 'refused_chapters_1_and_2', 'him/her/them': 'them', 'he/she/they': 'they'},
]


def scenes(md):
    """Yield (scene_id, heading, body) for every numbered scene and the refusal beat, in script order."""
    marks = [(m.start(), m.group(1), m.group(0)[4:].strip()) for m in re.finditer(r'^### (\d+[A-Z]?)\. .*$', md, re.M)]
    refusal = re.search(r'^## Alternate beat: refusing to pin$', md, re.M)
    marks.append((refusal.start(), 'refusal', 'Alternate beat: refusing to pin'))
    marks.sort()
    for i, (start, sid, heading) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(md)
        body = md[start:end]
        next_chapter = re.search(r'^## ', body[3:], re.M)
        if next_chapter and sid != 'refusal':
            body = body[:next_chapter.start() + 3]
        yield sid, heading, body


def strip_markup(text):
    return re.sub(r'\*\*|(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])', '', text).strip()


def split_directions(raw):
    """Return (script_text, spoken_text, directions) for one line of dialogue."""
    directions = [d for d in PARENTHETICAL.findall(raw) if d not in PLACEHOLDERS]
    spoken = PARENTHETICAL.sub(lambda m: m.group(0) if m.group(1) in PLACEHOLDERS else ' ', raw)
    return strip_markup(raw), re.sub(r'\s+', ' ', strip_markup(spoken)).strip(), directions


def expand_variants(script_text, text):
    """Concrete versions of a line with refusal-beat placeholders, as script text and as spoken text."""
    found = [p for p in PLACEHOLDERS if f'({p})' in script_text]
    variants = []
    for mapping in REFUSAL_VARIANTS if found else []:
        if all(p in mapping for p in found):
            variant = {'when': mapping['when'], 'script_text': script_text, 'text': text}
            for p in found:
                variant['script_text'] = variant['script_text'].replace(f'({p})', mapping[p])
                variant['text'] = variant['text'].replace(f'({p})', mapping[p])
            variants.append(variant)
    return variants


def parse_scene(sid, body):
    """Return the scene's spoken lines in order, as dicts without IDs or production fields."""
    found = []  # (position in body, line)
    for para_match in re.finditer(r'^.*$', body, re.M):
        para = para_match.group(0)
        labels = list(LABEL.finditer(para))
        for n, label in enumerate(labels):
            speaker, qualifier = label.group(1), label.group(2)
            if speaker in NOT_DIALOGUE:
                continue
            end = labels[n + 1].start() if n + 1 < len(labels) else len(para)
            script_text, text, directions = split_directions(para[label.end():end])
            lead_in = re.match(r'^- \*\*([^*]+)\*\*', para)
            found.append((para_match.start() + label.start(), {
                'speaker': speaker, 'qualifier': qualifier,
                'context': f'examine: {lead_in.group(1).rstrip(".")}' if lead_in and label.start() > 0 else None,
                'script_text': script_text, 'text': text, 'directions': directions,
                'subtitle_speaker': speaker, 'variants': expand_variants(script_text, text)}))
    for scene_id, quote, speaker, qualifier, subtitle in EMBEDDED_LINES:
        if scene_id != sid:
            continue
        at = body.find(quote)
        if at < 0:
            raise SystemExit(f'script_to_data: embedded line not found in scene {sid}: "{quote}"')
        found.append((at, {'speaker': speaker, 'qualifier': qualifier, 'context': None, 'script_text': quote,
                           'text': quote, 'directions': [], 'subtitle_speaker': subtitle, 'variants': []}))
    return [line for _, line in sorted(found, key=lambda item: item[0])]


def file_stem(sid):
    digits = re.match(r'\d+', sid)
    return f'scene_{int(digits.group(0)):02d}{sid[digits.end():].lower()}' if digits else sid


def build(md):
    """Return {file name: scene document} for the whole script."""
    documents = {}
    for sid, heading, body in scenes(md):
        stem = file_stem(sid)
        lines, seen = [], {}
        for order, line in enumerate(parse_scene(sid, body), start=1):
            digest = hashlib.sha1(f"{sid}|{line['speaker']}|{line['qualifier']}|{line['script_text']}".encode()).hexdigest()[:6]
            base = f"{stem}-{re.sub(r'[^a-z]+', '_', line['speaker'].lower()).strip('_')}-{digest}"
            seen[base] = seen.get(base, 0) + 1
            line_id = base if seen[base] == 1 else f'{base}-{seen[base]}'
            lines.append({'id': line_id, 'order': order, **line,
                          'voice_file': f'res://audio/dialogue/{stem}/{line_id}.ogg',
                          'lipsync_file': f'res://data/lipsync/{stem}/{line_id}.json',
                          'subtitle_timing': None})
        documents[f'{stem}.json'] = {'scene': sid, 'heading': heading,
                                     'source': 'docs/directors_script.md', 'lines': lines}
    return documents


def merge_production_fields(documents):
    """Keep production fields already on disk for lines whose ID still exists."""
    for name, doc in documents.items():
        path = OUT_DIR / name
        if not path.exists():
            continue
        old = {line['id']: line for line in json.loads(path.read_text())['lines']}
        for line in doc['lines']:
            for field in PRODUCTION_FIELDS:
                if line['id'] in old and old[line['id']].get(field) is not None:
                    line[field] = old[line['id']][field]


def render(doc):
    return json.dumps(doc, indent=2, ensure_ascii=False) + '\n'


def main():
    documents = build(SCRIPT.read_text())
    merge_production_fields(documents)
    stale = sorted(p.name for p in OUT_DIR.glob('*.json') if p.name not in documents) if OUT_DIR.exists() else []
    if '--check' in sys.argv:
        out_of_date = [n for n, d in documents.items() if not (OUT_DIR / n).exists() or (OUT_DIR / n).read_text() != render(d)]
        for name in out_of_date + stale:
            print(f'script_to_data: {name} is out of date; run tools/pipeline/script_to_data.py')
        return 1 if out_of_date or stale else 0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in stale:
        (OUT_DIR / name).unlink()
    for name, doc in documents.items():
        (OUT_DIR / name).write_text(render(doc))
    total = sum(len(d['lines']) for d in documents.values())
    print(f'script_to_data: {total} lines in {len(documents)} scene files')
    return 0


if __name__ == '__main__':
    sys.exit(main())
