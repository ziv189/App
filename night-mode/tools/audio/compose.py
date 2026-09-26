#!/usr/bin/env python3
"""
Renders NIGHT MODE's music from real instrument recordings: a tiny sampler + sequencer.

    python3 tools/audio/compose.py --samples <VSCO-2-CE folder> [--only title,night]

Instruments: Versilian Studios Chamber Orchestra 2 Community Edition (VSCO-2-CE, CC0),
https://github.com/sgossner/VSCO-2-CE (glockenspiel, upright piano, harp, string sections, contrabass,
timpani). All melodies and arrangements are original to this game.
Output: public/assets/audio/music/<piece>.ogg (loops are rendered so their reverb tail wraps around).
"""
import argparse
import glob
import math
import os
import random
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'music')
SR = 44100
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    """'C#4' -> 61, 'Bb3' -> 58."""
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d)', name)
    if not m:
        raise ValueError(name)
    n = NOTE[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
    return n + 12 * (int(m.group(3)) + 1)


def load(path):
    a, sr = sf.read(path, dtype='float32', always_2d=True)
    if a.shape[1] == 1:
        a = np.repeat(a, 2, axis=1)
    if sr != SR:
        idx = np.arange(0, len(a), sr / SR)
        a = np.stack([np.interp(idx, np.arange(len(a)), a[:, c]) for c in range(2)], axis=1).astype(np.float32)
    return a


class Instrument:
    """Multi-sampled instrument: picks the nearest recorded note (and loudness layer) and repitches it."""

    def __init__(self, samples, percussive=True, release=0.35, gain=1.0, max_ring=8.0):
        self.samples = samples  # list of (midi, layer 0..1, path)
        self.cache = {}
        self.percussive = percussive
        self.release = release
        self.gain = gain
        self.max_ring = max_ring

    def buffer(self, path):
        if path not in self.cache:
            a = load(path)
            # trim leading silence so notes land on the beat
            env = np.abs(a).max(axis=1)
            start = np.argmax(env > env.max() * 0.02)
            self.cache[path] = a[max(0, start - 32):]
        return self.cache[path]

    def note(self, m, vel=0.7, dur=1.0, detune_cents=0.0):
        cands = sorted(self.samples, key=lambda s: (abs(s[0] - m) + 0.4 * abs(s[1] - vel)))
        sm, layer, path = cands[0]
        a = self.buffer(path)
        ratio = 2 ** ((m - sm + detune_cents / 100) / 12)
        length = (dur + self.release) if not self.percussive else min(self.max_ring, len(a) / SR / ratio)
        n_out = int(length * SR)
        pos = np.arange(n_out) * ratio
        pos = pos[pos < len(a) - 1]
        out = np.stack([np.interp(pos, np.arange(len(a)), a[:, c]) for c in range(2)], axis=1)
        # envelope: short attack de-click, release fade after the note ends
        env = np.ones(len(out), dtype=np.float32)
        a_n = min(len(env), int(0.004 * SR))
        env[:a_n] = np.linspace(0, 1, a_n)
        if not self.percussive or dur < length:
            off = int(dur * SR)
            rel = int(self.release * SR)
            if off < len(env):
                seg = env[off:off + rel]
                env[off:off + len(seg)] = np.linspace(1, 0, len(seg)) if len(seg) else seg
                env[off + rel:] = 0
        return (out * env[:, None] * vel * self.gain).astype(np.float32)


def instruments(root):
    j = lambda *p: os.path.join(root, *p)
    inst = {}
    glock = [(midi(os.path.basename(f)[13:-4]), 0.6, f) for f in glob.glob(j('Percussion', 'Glock', 'glock_medium_*.wav'))]
    inst['glock'] = Instrument(glock, percussive=True, gain=0.9, max_ring=4.0)
    chart = {}
    for line in open(j('Keys', 'Upright Piano', 'MappingChart.txt')):
        if '=' in line and line[:3].isdigit():
            k, v = line.strip().split('=')
            chart[k] = int(v)
    piano = []
    for f in glob.glob(j('Keys', 'Upright Piano', 'Player_dyn*_rr1_*.wav')):
        b = os.path.basename(f)
        dyn = int(b[10])
        piano.append((chart[b[-7:-4]], (dyn - 1) / 2, f))
    inst['piano'] = Instrument(piano, percussive=True, release=0.5, gain=0.8, max_ring=9.0)

    def named(pattern, rx, layer_rx=None, percussive=False, **kw):
        out = []
        for f in glob.glob(j(*pattern)):
            b = os.path.basename(f)
            m = re.search(rx, b)
            if not m:
                continue
            layer = 0.5
            if layer_rx:
                lm = re.search(layer_rx, b)
                layer = min(1.0, (int(lm.group(1)) - 1) / 2) if lm else 0.5
            out.append((midi(m.group(1)), layer, f))
        return Instrument(out, percussive=percussive, **kw)

    inst['harp'] = named(('Strings', 'Harp', 'KSHarp_*.wav'), r'KSHarp_([A-G][#b]?\d)', percussive=True, gain=0.8)
    inst['violins'] = named(('Strings', 'Violin Section', 'susVib', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', release=1.2, gain=0.6)
    inst['violins_trem'] = named(('Strings', 'Violin Section', 'Trem', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', release=1.0, gain=0.5)
    inst['violas'] = named(('Strings', 'Viola Section', 'susvib', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', release=1.2, gain=0.6)
    inst['cellos'] = named(('Strings', 'Cello Section', 'susvib', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', release=1.2, gain=0.65)
    inst['cellos_trem'] = named(('Strings', 'Cello Section', 'trem', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', release=1.0, gain=0.6)
    inst['cellos_spic'] = named(('Strings', 'Cello Section', 'spic', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', percussive=True, gain=0.7, max_ring=0.8)
    inst['bass'] = named(('Strings', 'Solo Contrabass', 'SusNV', '*.wav'), r'_([A-G][#b]?\d)_', r'_v(\d)', release=1.5, gain=0.8)
    timp = [(45, 0.3 if '_v1_' in f else 0.9, f) for f in glob.glob(j('Percussion', 'Timpani', 'Timpani1_Hit_*.wav'))]
    inst['timpani'] = Instrument(timp, percussive=True, gain=0.9, max_ring=5.0)
    return inst


class Mix:
    def __init__(self, seconds):
        self.buf = np.zeros((int(seconds * SR) + SR * 12, 2), dtype=np.float32)

    def add(self, audio, t, pan=0.0, gain=1.0):
        i = max(0, int(t * SR))
        if i >= len(self.buf):
            return
        a = audio[: len(self.buf) - i]
        l = math.cos((pan + 1) * math.pi / 4) * math.sqrt(2)
        r = math.sin((pan + 1) * math.pi / 4) * math.sqrt(2)
        self.buf[i:i + len(a), 0] += a[:, 0] * gain * l
        self.buf[i:i + len(a), 1] += a[:, 1] * gain * r


def reverb_ir(seconds=3.0, damp=4000, seed=7, predelay=0.012):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * t / seconds)  # -60 dB at `seconds`
    ir = rng.standard_normal((n, 2)).astype(np.float32) * decay[:, None]
    sos = butter(2, damp / (SR / 2), 'low', output='sos')
    ir = sosfilt(sos, ir, axis=0)
    ir = np.concatenate([np.zeros((int(predelay * SR), 2), np.float32), ir])
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))


def finish(mix, loop_seconds=None, wet=0.35, rt=3.0, damp=4200, highpass=35, peak=-1.5):
    dry = mix.buf
    if wet > 0:
        ir = reverb_ir(rt, damp)
        wet_sig = np.stack([fftconvolve(dry[:, c], ir[:, c])[:len(dry)] for c in range(2)], axis=1)
        out = dry * (1 - wet * 0.5) + wet_sig * wet
    else:
        out = dry
    if highpass:
        out = sosfilt(butter(2, highpass / (SR / 2), 'high', output='sos'), out, axis=0)
    if loop_seconds:
        n = int(loop_seconds * SR)
        body = out[:n].copy()
        tail = out[n:]
        body[: min(len(tail), n)] += tail[: min(len(tail), n)]  # wrap the tail so the loop is seamless
        out = body
    else:
        env = np.abs(out).max(axis=1)
        last = len(env) - np.argmax(env[::-1] > 10 ** (-70 / 20))
        out = out[: last + int(0.1 * SR)]
        fade = min(len(out), int(0.5 * SR))
        out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    out = np.tanh(out * 1.2) / 1.2  # gentle safety saturation
    return out * (10 ** (peak / 20) / max(np.abs(out).max(), 1e-9))


def write(name, audio):
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, f'.{name}.wav')
    sf.write(tmp, audio, SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '5',
                    os.path.join(OUT, f'{name}.ogg')], check=True)
    os.remove(tmp)
    print(f'{name:18s} {len(audio) / SR:6.1f}s')


# ------------------------------------------------------------------------------------------ the score
# "Ivy's Lullaby": 3/4, 16 bars. (note, beats); melody sits in C major and ends in A minor.
LULLABY = [
    ('E5', 2), ('D5', 1), ('C5', 1), ('D5', 1), ('E5', 1), ('G5', 2), ('E5', 1), ('D5', 3),
    ('E5', 2), ('D5', 1), ('C5', 1), ('A4', 1), ('C5', 1), ('D5', 2), ('C5', 1), ('A4', 3),
    ('C5', 1), ('E5', 1), ('A5', 1), ('G5', 2), ('E5', 1), ('F5', 1), ('E5', 1), ('D5', 1), ('E5', 3),
    ('A5', 2), ('G5', 1), ('E5', 1), ('D5', 1), ('C5', 1), ('D5', 2), ('B4', 1), ('A4', 3),
]
# one chord per bar (root, third, fifth as note names in octave 3/4)
CHORDS = [
    ('C3', 'G3', 'E4'), ('C3', 'G3', 'E4'), ('E3', 'B3', 'G4'), ('G2', 'D3', 'B3'),
    ('C3', 'G3', 'E4'), ('A2', 'E3', 'C4'), ('D3', 'A3', 'F4'), ('A2', 'E3', 'C4'),
    ('A2', 'E3', 'C4'), ('C3', 'G3', 'E4'), ('F2', 'C3', 'A3'), ('C3', 'G3', 'E4'),
    ('F2', 'C3', 'A3'), ('C3', 'G3', 'E4'), ('G2', 'D3', 'B3'), ('A2', 'E3', 'C4'),
]


def melody_events(transpose=0):
    t = 0
    for n, beats in LULLABY:
        yield t, midi(n) + transpose, beats
        t += beats


def music_box(inst, bpm=72, transpose=12, slow_down=False, wrong_ending=False, seed=3):
    """Glockenspiel played like a comb music box: melody + broken chords, slightly uneven mechanism."""
    rng = random.Random(seed)
    beat = 60 / bpm
    total_beats = 48
    mix = Mix(total_beats * beat * (3.2 if slow_down else 1.0) + 4)

    def time_of(b):
        if not slow_down:
            return b * beat
        # winding down: tempo falls from bpm to ~20 bpm (integral of an increasing beat length)
        k = 2.4
        x = b / total_beats
        return beat * total_beats * (x + k * x ** 3 / 3)

    def detune_at(b):
        return -140 * (b / total_beats) ** 2.2 if slow_down else 0

    for b, m, beats in melody_events(transpose):
        if wrong_ending and b >= 42:
            m += 1  # the last phrase slips a semitone: something is wrong
        jitter = rng.uniform(-0.012, 0.012)
        mix.add(inst['glock'].note(m, rng.uniform(0.62, 0.78), beats * beat, detune_at(b)), time_of(b) + jitter, pan=0.1)
    for bar, chord in enumerate(CHORDS):
        for k, n in enumerate(chord):
            b = bar * 3 + k
            m = midi(n) + transpose
            if wrong_ending and bar >= 14:
                m += 1 if k == 1 else 0
            mix.add(inst['glock'].note(m, rng.uniform(0.28, 0.36), beat, detune_at(b)), time_of(b) + rng.uniform(0, 0.01), pan=-0.15)
    length = time_of(total_beats)
    # a music box has no low end: cut the mallet thumps the repitched glockenspiel brings along
    if slow_down or wrong_ending:
        return finish(mix, None, wet=0.3, rt=2.2, damp=5000, highpass=240)
    return finish(mix, length, wet=0.28, rt=2.2, damp=5000, highpass=240)


def piano_lullaby(inst, bpm=58, strings=True, major_end=False, loop=True):
    beat = 60 / bpm
    rng = random.Random(11)
    mix = Mix(48 * beat + 6)
    for b, m, beats in melody_events(0):
        mix.add(inst['piano'].note(m, rng.uniform(0.45, 0.55), beats * beat * 0.95), b * beat + rng.uniform(0, 0.015), pan=0.15)
    for bar, chord in enumerate(CHORDS):
        root, third, fifth = chord
        if major_end and bar == 15:
            root, third, fifth = 'C3', 'G3', 'E4'
        t0 = bar * 3 * beat
        mix.add(inst['piano'].note(midi(root) - 12 if midi(root) > 45 else midi(root), 0.32, 3 * beat), t0, pan=-0.2)
        mix.add(inst['piano'].note(midi(third), 0.22, 2 * beat), t0 + beat, pan=-0.1)
        mix.add(inst['piano'].note(midi(fifth), 0.2, beat), t0 + 2 * beat, pan=0.0)
        if strings:
            mix.add(inst['cellos'].note(midi(root), 0.35, 3 * beat), t0, pan=-0.3, gain=0.5)
            mix.add(inst['violas'].note(midi(fifth), 0.3, 3 * beat), t0, pan=0.3, gain=0.35)
    if major_end:
        t_end = 48 * beat
        for n in ('C3', 'G3', 'C4', 'E4', 'G4'):
            mix.add(inst['piano'].note(midi(n), 0.3, 6), t_end, pan=0)
        mix.add(inst['violins'].note(midi('E5'), 0.3, 6), t_end, gain=0.4)
        mix.add(inst['cellos'].note(midi('C3'), 0.3, 6), t_end, gain=0.5)
    return finish(mix, 48 * beat if loop else None, wet=0.4, rt=3.2, damp=3800)


def night_drone(inst, seconds=64.0, seed=5):
    rng = random.Random(seed)
    mix = Mix(seconds)
    # long overlapping low notes: A1 and E2 pedal, never all changing at once
    t = 0
    while t < seconds:
        # notes overlap by ~3 s so the drone never dips between bow strokes
        mix.add(inst['bass'].note(midi('A1'), 0.32, 11 + rng.uniform(-0.5, 0.5)), t, pan=-0.2, gain=0.7)
        mix.add(inst['bass'].note(midi('E2'), 0.28, 11 + rng.uniform(-0.5, 0.5)), t + 4.5 + rng.uniform(-0.6, 0.6), pan=0.2, gain=0.55)
        t += 8
    # high tremolo cluster that breathes in and out (F5 against F#5)
    for t0 in (6, 30, 50):
        mix.add(inst['violins_trem'].note(midi('F5'), 0.18, 8), t0, pan=-0.5, gain=0.35)
        mix.add(inst['violins_trem'].note(midi('F#5'), 0.15, 7), t0 + 1.5, pan=0.5, gain=0.3)
    # a distant, detuned music-box note now and then
    for t0 in (14, 37, 58):
        n = rng.choice(['E6', 'D6', 'A6', 'G6'])
        mix.add(inst['glock'].note(midi(n), 0.25, 1, detune_cents=-35), t0, pan=rng.uniform(-0.8, 0.8), gain=0.5)
    return finish(mix, seconds, wet=0.55, rt=4.5, damp=2600, highpass=28)


def tension(inst, bpm=100, bars=16):
    beat = 60 / bpm
    rng = random.Random(21)
    mix = Mix(bars * 4 * beat)
    pattern = ['A2', 'A2', 'Bb2', 'A2', 'A2', 'A2', 'C3', 'Bb2']
    for bar in range(bars):
        for k in range(8):
            t = (bar * 4 + k / 2) * beat
            n = pattern[k]
            accent = 0.75 if k in (0, 3, 6) else 0.5
            mix.add(inst['cellos_spic'].note(midi(n), accent + rng.uniform(-0.05, 0.05), beat / 2), t, pan=-0.1)
        if bar % 4 == 0:
            mix.add(inst['bass'].note(midi('A1'), 0.4, 4 * 4 * beat), bar * 4 * beat, gain=0.7)
            mix.add(inst['timpani'].note(45, 0.8, 2), bar * 4 * beat, gain=0.8)
        if bar % 4 == 2:
            mix.add(inst['violins_trem'].note(midi('E5') + bar // 4, 0.25, 8 * beat), bar * 4 * beat, pan=0.4, gain=0.35)
            mix.add(inst['violins_trem'].note(midi('F5') + bar // 4, 0.22, 8 * beat), bar * 4 * beat, pan=-0.4, gain=0.3)
    return finish(mix, bars * 4 * beat, wet=0.3, rt=2.5, damp=3500)


def basement(inst, seconds=64.0):
    rng = random.Random(8)
    mix = Mix(seconds)
    t = 0
    while t < seconds:
        mix.add(inst['bass'].note(midi('A#0'), 0.4, 13), t, pan=0, gain=0.9)
        mix.add(inst['cellos_trem'].note(midi('C#2'), 0.2, 9), t + 3, pan=-0.4, gain=0.4)
        mix.add(inst['cellos_trem'].note(midi('D2'), 0.18, 9), t + 5, pan=0.4, gain=0.35)
        t += 10
    # fragments of the lullaby, slowed and detuned, like a memory
    for t0, notes in ((8, ['E5', 'D5', 'C5']), (27, ['G5', 'E5', 'D5']), (46, ['A5', 'G5', 'E5', 'D5'])):
        for i, n in enumerate(notes):
            mix.add(inst['glock'].note(midi(n) + 12, 0.3, 1.2, detune_cents=-45), t0 + i * 1.4, pan=rng.uniform(-0.6, 0.6), gain=0.45)
    for t0 in (20, 44):
        mix.add(inst['piano'].note(midi('A0'), 0.35, 5), t0, gain=0.7)
        mix.add(inst['piano'].note(midi('Bb0'), 0.3, 5), t0 + 0.02, gain=0.6)
    return finish(mix, seconds, wet=0.5, rt=4.0, damp=2200, highpass=25)


def stinger_strings(inst):
    mix = Mix(6)
    for n, inst_name, pan in (('A3', 'violas', -0.3), ('Bb3', 'violas', 0.3), ('E5', 'violins_trem', -0.5),
                              ('F5', 'violins_trem', 0.5), ('B5', 'violins_trem', 0), ('A2', 'cellos_trem', -0.2),
                              ('Bb2', 'cellos_trem', 0.2)):
        mix.add(inst[inst_name].note(midi(n), 0.95, 1.6), 0, pan=pan, gain=0.7)
    mix.add(inst['timpani'].note(45, 1.0, 2), 0, gain=1.0)
    mix.add(inst['bass'].note(midi('A1'), 0.9, 1.8), 0, gain=0.8)
    return finish(mix, None, wet=0.45, rt=2.8, damp=4500)


def stinger_piano(inst):
    mix = Mix(7)
    for n in ('A0', 'C1', 'Db1', 'E1'):
        mix.add(inst['piano'].note(midi(n), 1.0, 4), 0, gain=0.8)
    for n in ('Bb6', 'B6', 'C7'):
        mix.add(inst['piano'].note(midi(n), 0.8, 3), 0.01, gain=0.5)
    return finish(mix, None, wet=0.5, rt=3.5, damp=3000)


PIECES = {
    'lullaby_box': lambda i: music_box(i),
    'lullaby_box_dying': lambda i: music_box(i, slow_down=True),
    'lullaby_box_wrong': lambda i: music_box(i, wrong_ending=True),
    'title': lambda i: piano_lullaby(i),
    'ending_goodnight': lambda i: piano_lullaby(i, bpm=52, major_end=True, loop=False),
    'night': lambda i: night_drone(i),
    'tension': lambda i: tension(i),
    'basement': lambda i: basement(i),
    'stinger_strings': stinger_strings,
    'stinger_piano': stinger_piano,
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--samples', required=True, help='VSCO-2-CE checkout')
    p.add_argument('--only', default='')
    a = p.parse_args()
    inst = instruments(a.samples)
    only = set(filter(None, a.only.split(',')))
    for name, fn in PIECES.items():
        if only and name not in only:
            continue
        write(name, fn(inst))


if __name__ == '__main__':
    sys.exit(main())
