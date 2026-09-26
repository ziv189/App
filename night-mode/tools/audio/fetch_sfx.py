#!/usr/bin/env python3
"""
Downloads the game's sound effects from Freesound (Creative Commons 0 sounds only), cleans them up and
writes public/assets/audio/sfx/<name>.ogg plus CREDITS.md.

    python3 tools/audio/fetch_sfx.py [--only name1,name2] [--list]

Each entry of assets-src/sfx/sfx.json is either a search ("query": the most-downloaded CC0 result whose
length is within [min, max] seconds, or the "pick"-th one) or a fixed Freesound sound id ("id").
Processing modes:
  oneshot  trim silence, normalize, short fades
  loop     normalize loudness, make the end cross-fade into the start so it loops seamlessly
  slice    cut the recording at its onsets into up to "count" separate one-shots (<name>_1.ogg, ...)
Downloads use Freesound's public 128 kbps previews. Needs: apt install ffmpeg sox; pip install librosa soundfile.
"""
import argparse
import html
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, 'assets-src', 'downloads', 'freesound')
OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'sfx')
SR = 44100
UA = {'User-Agent': 'night-mode-asset-fetch/1.0'}


def get(url, pause=2.5):
    """Polite fetch: Freesound rate-limits bursts (HTTP 429), so wait between requests and back off."""
    for attempt in range(6):
        try:
            time.sleep(pause)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == 5:
                raise
            time.sleep(20 * (attempt + 1))


def cached_page(key, url):
    path = os.path.join(CACHE, key)
    if os.path.exists(path):
        return open(path, encoding='utf-8').read()
    text = get(url).decode('utf-8', 'replace')
    open(path, 'w', encoding='utf-8').write(text)
    return text


def search(query, page=1):
    q = urllib.parse.urlencode({'q': query, 'f': 'license:"Creative Commons 0"', 's': 'Downloads (most first)', 'page': page})
    key = 'search-' + re.sub(r'[^a-z0-9]+', '-', f'{query}-{page}'.lower()) + '.html'
    text = cached_page(key, f'https://freesound.org/search/?{q}')
    results = []
    for block in re.findall(r'<div\s+class="bw-player"([^>]*)>', text):
        attr = dict(re.findall(r'data-([a-z0-9-]+)="([^"]*)"', block))
        if 'sound-id' not in attr:
            continue
        results.append({
            'id': int(attr['sound-id']), 'user': attr.get('username', ''), 'title': html.unescape(attr.get('title', '')),
            'duration': float(attr.get('duration', 0)), 'downloads': int(attr.get('num-downloads', 0) or 0),
            'mp3': attr.get('mp3', '').replace('-lq.mp3', '-hq.mp3'),
        })
    return results


def sound_page(sound_id):
    text = cached_page(f'sound-{sound_id}.html', f'https://freesound.org/s/{sound_id}/')
    attr = {}
    for block in re.findall(r'<div\s+class="bw-player"([^>]*)>', text):
        a = dict(re.findall(r'data-([a-z0-9-]+)="([^"]*)"', block))
        if a.get('sound-id') == str(sound_id):
            attr = a
            break
    if not attr.get('username'):
        m = re.search(r'/people/([^/"]+)/sounds/%d/' % sound_id, text)
        attr['username'] = m.group(1) if m else ''
    lic = 'Creative Commons 0' if 'publicdomain/zero' in text else 'OTHER'
    return {
        'id': sound_id, 'user': attr.get('username', ''), 'title': html.unescape(attr.get('title', '')),
        'duration': float(attr.get('duration', 0)), 'downloads': int(attr.get('num-downloads', 0) or 0),
        'mp3': attr.get('mp3', '').replace('-lq.mp3', '-hq.mp3'), 'license': lic,
    }


def decode(mp3_bytes):
    wav = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', '-', '-ac', '1', '-ar', str(SR), '-f', 'wav', '-'],
                         input=mp3_bytes, capture_output=True, check=True).stdout
    a, _ = sf.read(io.BytesIO(wav), dtype='float32')
    return a


def trim(a, thresh_db=-50):
    env = np.abs(a)
    thr = 10 ** (thresh_db / 20) * max(env.max(), 1e-9)
    idx = np.where(env > thr)[0]
    if not len(idx):
        return a
    return a[max(0, idx[0] - int(0.005 * SR)): idx[-1] + int(0.05 * SR)]


def fade(a, fin=0.004, fout=0.03):
    n1, n2 = int(fin * SR), int(fout * SR)
    a = a.copy()
    if n1:
        a[:n1] *= np.linspace(0, 1, n1)
    if n2 and len(a) > n2:
        a[-n2:] *= np.linspace(1, 0, n2)
    return a


def normalize(a, peak_db=-3.0):
    return a * (10 ** (peak_db / 20) / max(np.abs(a).max(), 1e-9))


def loopify(a, xfade=1.5):
    n = int(min(xfade, len(a) / 4) * SR)
    head, body, tail = a[:n], a[n:-n], a[-n:]
    t = np.linspace(0, np.pi / 2, n)
    mixed = tail * np.cos(t) + head * np.sin(t)  # equal-power crossfade of the end into the start
    return np.concatenate([body, mixed])


def rms_normalize(a, target_db=-20.0):
    rms = np.sqrt(np.mean(a ** 2)) + 1e-9
    g = 10 ** (target_db / 20) / rms
    out = a * g
    peak = np.abs(out).max()
    return out * (0.89 / peak) if peak > 0.89 else out


def slices(a, count, max_len, min_gap=0.12):
    import librosa
    onsets = librosa.onset.onset_detect(y=a, sr=SR, units='samples', backtrack=True, delta=0.12)
    onsets = [o for i, o in enumerate(onsets) if i == 0 or (o - onsets[i - 1]) > min_gap * SR]
    parts = []
    for i, o in enumerate(onsets):
        end = onsets[i + 1] if i + 1 < len(onsets) else len(a)
        end = min(end, o + int(max_len * SR))
        seg = a[max(0, o - int(0.004 * SR)): end]
        if len(seg) > 0.05 * SR:
            parts.append(seg)
    parts.sort(key=lambda s: -float(np.sqrt(np.mean(s ** 2))))
    return parts[:count]


def write_ogg(a, path):
    buf = io.BytesIO()
    sf.write(buf, a, SR, format='WAV', subtype='PCM_16')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '-', '-c:a', 'libvorbis', '-q:a', '4', path],
                   input=buf.getvalue(), check=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--manifest', default=os.path.join(ROOT, 'assets-src', 'sfx', 'sfx.json'))
    p.add_argument('--only', default='')
    p.add_argument('--list', action='store_true', help='only print the search results')
    args = p.parse_args()
    entries = json.load(open(args.manifest))['sounds']
    only = set(filter(None, args.only.split(',')))
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    credits_path = os.path.join(OUT, 'credits.json')
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}

    for e in entries:
        name = e['name']
        if only and name not in only:
            continue
        if 'id' in e:
            s = sound_page(e['id'])
            if s['license'] != 'Creative Commons 0':
                print(f'{name}: sound {e["id"]} is not CC0, skipped')
                continue
        else:
            found = []
            for page in (1, 2):
                found += [r for r in search(e['query'], page) if e.get('min', 0) <= r['duration'] <= e.get('max', 1e9)]
                if len(found) > e.get('pick', 0):
                    break
            if args.list:
                print(f'== {name}: "{e["query"]}"')
                for i, r in enumerate(found[:8]):
                    print(f'   {i}: {r["id"]:7d} {r["duration"]:6.1f}s {r["downloads"]:6d}dl  {r["title"][:60]} ({r["user"]})')
                continue
            if len(found) <= e.get('pick', 0):
                print(f'{name}: no result for "{e["query"]}"')
                continue
            s = found[e.get('pick', 0)]
        cache = os.path.join(CACHE, f'{s["id"]}.mp3')
        if not os.path.exists(cache) or os.path.getsize(cache) == 0:
            data = get(s['mp3'], pause=0.5)
            open(cache + '.part', 'wb').write(data)
            os.replace(cache + '.part', cache)
        a = decode(open(cache, 'rb').read())
        if e.get('start') is not None or e.get('end') is not None:
            a = a[int(e.get('start', 0) * SR): int(e['end'] * SR) if e.get('end') else None]
        mode = e.get('mode', 'oneshot')
        outputs = []
        if mode == 'loop':
            a = trim(a, -60)
            if e.get('maxlen'):
                a = a[:int(e['maxlen'] * SR)]
            a = rms_normalize(loopify(a), e.get('level', -22.0))
            outputs.append((name, a))
        elif mode == 'slice':
            for i, seg in enumerate(slices(a, e.get('count', 4), e.get('maxlen', 0.7))):
                outputs.append((f'{name}_{i + 1}', fade(normalize(trim(seg, -45), e.get('peak', -3.0)), 0.002, 0.04)))
        else:
            a = trim(a, e.get('trim_db', -50))
            if e.get('maxlen'):
                a = a[:int(e['maxlen'] * SR)]
            outputs.append((name, fade(normalize(a, e.get('peak', -3.0)), 0.003, e.get('fadeout', 0.05))))
        for out_name, data in outputs:
            write_ogg(data.astype(np.float32), os.path.join(OUT, f'{out_name}.ogg'))
        credits[name] = {'id': s['id'], 'title': s['title'], 'author': s['user'], 'license': 'CC0',
                         'url': f'https://freesound.org/s/{s["id"]}/', 'files': [o for o, _ in outputs]}
        print(f'{name:16s} <- {s["id"]:7d} {s["duration"]:6.1f}s {s["downloads"]:6d}dl "{s["title"][:50]}" by {s["user"]} '
              f'-> {len(outputs)} file(s)')

    if not args.list:
        json.dump(dict(sorted(credits.items())), open(credits_path, 'w'), indent=1)
        lines = ['# Sound effects', '', 'All sounds are from [Freesound](https://freesound.org) and dedicated to the public '
                 'domain (CC0) by their authors. Credited here anyway, with thanks.', '']
        for k, c in sorted(credits.items()):
            lines.append(f'- `{k}`: "{c["title"]}" by {c["author"]}, <{c["url"]}>')
        open(os.path.join(OUT, 'CREDITS.md'), 'w').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    sys.exit(main())
