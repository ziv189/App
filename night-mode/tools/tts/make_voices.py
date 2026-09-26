#!/usr/bin/env python3
"""
Generates every voice line of NIGHT MODE with the Kokoro-82M text-to-speech model (Apache-2.0), plus
mouth-shape (viseme) timings for lip-sync.

    python3 tools/tts/make_voices.py --model <dir with model.onnx + voices/> [--only id1,id2]

Input:  assets-src/voice/lines.json
Output: public/assets/audio/voice/<id>.ogg and public/assets/audio/voice/index.json
        ({id: {speaker, text, duration, visemes: [[seconds, "PP"], ...]}})

Model: onnx-community/Kokoro-82M-v1.0-ONNX-timestamped on Hugging Face (its extra output gives the
duration of every phoneme). Needs: pip install kokoro-onnx soundfile numpy; apt install sox ffmpeg.
Voices are post-processed with sox so each speaker sounds like the device it plays through.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx.tokenizer import Tokenizer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 24000

# voice pack, speed, sox effects. Ivy is Kokoro's af_jessica voice (the highest American voice, ~210 Hz)
# raised by 4 semitones to ~265 Hz, a child's range. sox "pitch" keeps timing, so viseme timings stay
# valid, and shifts formants too, which gives the slightly-too-bright sound of a synthesized child.
SPEAKERS = {
    'wren': dict(voice='af_heart', speed=0.95, fx='highpass 90 lowpass 11000 equalizer 3000 1q +2'),
    'ivy': dict(voice='af_jessica', speed=1.02, fx='pitch 400 highpass 140 lowpass 11000'),
    'ivyrec': dict(voice='af_jessica', speed=1.0, fx='pitch 380 highpass 260 lowpass 4800 overdrive 2', noise=-36),
    'dana': dict(voice='af_sarah', speed=0.9, fx='highpass 170 lowpass 7600 equalizer 2500 1q +3', noise=-46),
    'dana_home': dict(voice='af_sarah', speed=0.95, fx='highpass 220 lowpass 5600', noise=-40),
    'dana_phone': dict(voice='af_sarah', speed=0.92, fx='highpass 320 lowpass 3300 overdrive 4', noise=-38),
}
WHISPER_VOICE = 'af_nicole'  # Kokoro's breathy "headphones" voice

VISEME = {}
for chars, v in [('pbm', 'PP'), ('fv', 'FF'), ('θð', 'TH'), ('tdɾ', 'DD'), ('kɡgŋ', 'kk'), ('ʃʒʧʤ', 'CH'),
                 ('sz', 'SS'), ('nl', 'nn'), ('ɹr', 'RR'), ('ɑaæʌɐ', 'aa'), ('ɛeəɚɜɝ', 'E'), ('iɪj', 'I'),
                 ('oɔɒ', 'O'), ('uʊw', 'U')]:
    for c in chars:
        VISEME[c] = v
INHERIT = set('ˈˌːhʰ')


def visemes_for(phonemes, durations, total_seconds):
    """durations: one per token incl. the leading/trailing pad; returns [[t, viseme], ...]."""
    d = np.asarray(durations, dtype=np.float64)
    scale = total_seconds / max(d.sum(), 1e-6)
    t = d[0] * scale
    out = []
    for ch, dur in zip(phonemes, d[1:-1]):
        v = VISEME.get(ch)
        if v is None and ch in INHERIT and out:
            v = out[-1][1]
        if v is None:
            v = 'sil'
        if not out or out[-1][1] != v:
            out.append([round(t, 3), v])
        t += dur * scale
    out.append([round(t, 3), 'sil'])
    return out


def sox(args):
    subprocess.run(['sox', *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', required=True, help='folder containing model.onnx and voices/*.bin')
    p.add_argument('--lines', default=os.path.join(ROOT, 'assets-src', 'voice', 'lines.json'))
    p.add_argument('--out', default=os.path.join(ROOT, 'public', 'assets', 'audio', 'voice'))
    p.add_argument('--only', default='')
    a = p.parse_args()

    lines = json.load(open(a.lines, encoding='utf-8'))['lines']
    only = set(filter(None, a.only.split(',')))
    os.makedirs(a.out, exist_ok=True)
    index_path = os.path.join(a.out, 'index.json')
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}

    sess = ort.InferenceSession(os.path.join(a.model, 'model.onnx'), providers=['CPUExecutionProvider'])
    tok = Tokenizer()
    packs = {}

    def pack(name):
        if name not in packs:
            packs[name] = np.fromfile(os.path.join(a.model, 'voices', f'{name}.bin'), dtype=np.float32).reshape(-1, 1, 256)
        return packs[name]

    with tempfile.TemporaryDirectory() as tmp:
        for line in lines:
            if only and line['id'] not in only:
                continue
            spk = SPEAKERS[line['speaker']]
            voice = WHISPER_VOICE if line.get('whisper') else spk['voice']
            speed = line.get('speed', spk['speed'])
            phonemes = tok.phonemize(line['text'], 'en-us')
            ids = tok.tokenize(phonemes)
            phonemes = tok.known(phonemes)
            style = pack(voice)[min(len(ids), 509)]
            wave, durations = sess.run(None, {
                'input_ids': np.array([[0, *ids, 0]], dtype=np.int64),
                'style': style,
                'speed': np.array([speed], dtype=np.float32),
            })
            wave = wave.squeeze().astype(np.float32)
            raw = os.path.join(tmp, 'raw.wav')
            sf.write(raw, wave, SR)
            fx = os.path.join(tmp, 'fx.wav')
            effects = spk['fx'].split()
            if line.get('whisper'):
                effects += ['highpass', '400', 'gain', '-2']
            sox([raw, fx, *effects, 'gain', '-n', '-3'])
            final = fx
            if spk.get('noise') is not None:
                dur = sf.info(fx).duration
                noise = os.path.join(tmp, 'noise.wav')
                sox(['-n', '-r', str(SR), '-c', '1', noise, 'synth', f'{dur:.3f}', 'pinknoise', 'gain', str(spk['noise'])])
                final = os.path.join(tmp, 'mix.wav')
                sox(['-m', fx, noise, final, 'gain', '-n', '-3'])
            out = os.path.join(a.out, f"{line['id']}.ogg")
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', final, '-c:a', 'libvorbis', '-q:a', '5', out], check=True)
            seconds = len(wave) / SR
            index[line['id']] = {
                'speaker': line['speaker'],
                'text': line['text'],
                'duration': round(seconds, 3),
                'visemes': visemes_for(phonemes, durations.squeeze().tolist(), seconds),
            }
            print(f"{line['id']:18s} {seconds:5.2f}s  {voice:9s} {line['text'][:60]}")

    json.dump(dict(sorted(index.items())), open(index_path, 'w'), indent=1)
    print(f'{len(index)} lines -> {a.out}')


if __name__ == '__main__':
    sys.exit(main())
