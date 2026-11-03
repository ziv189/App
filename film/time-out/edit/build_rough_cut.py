#!/usr/bin/env python3
"""Build the TIME OUT rough cut from the Higgsfield/Seedance clips with ffmpeg.

Usage:
    python3 build_rough_cut.py SOURCES_DIR TITLE_PNG OUT.mp4

SOURCES_DIR holds the downloaded clip files named in SOURCES below.
TITLE_PNG is the 1280x720 "TIME OUT" crayon title, white background, multiplied
onto the title shot of clip 3. Every cut is frame-exact at 24 fps.
"""
import json, os, subprocess, sys

FPS = 24
W, H = 1280, 720

# Source files, by the clips they contain (some Higgsfield files hold two clips).
SOURCES = {
    'c01-02': 'bc01a7a0-higgsfield-dacbcd8a-f6bf-489b-9c7a-56bb12fa919c.mp4',
    'c03':    '37c5e82c-higgsfield-10f10a54-abbc-4307-84bc-d78903aeaae6.mp4',
    'c04-05': 'e5b45895-higgsfield-2b4b4bd0-8c52-4fd2-a5f5-92e279b29c57.mp4',
    'c06-07': '2c4e5ee9-higgsfield-aaf8f7ea-da46-4a52-b5e1-0f0152e51388.mp4',
    'c08-09': 'da82271e-higgsfield-6077471d-766e-4a5e-970c-0054a52452e5.mp4',
    'c10':    '47270ffa-higgsfield-61ae1118-d28a-4c5a-abb9-d415e2174ee5.mp4',
    'c11':    '1028e6e2-higgsfield-890f3ddf-ba2f-4ec3-9d5d-35f8f10bc938.mp4',
    'c11b':   'fe49546e-higgsfield-66680526-ffd8-445f-a9ad-5b8c720e7541.mp4',
    'c12-13': '0e6b98d1-higgsfield-f424ccec-cdd0-42d2-9ea2-cdca62c8fcad.mp4',
    'c14':    'a0cfd8d7-higgsfield-384f287d-07a5-48d9-9b26-93152703c08a.mp4',
    'c15-16': '43b56fdb-higgsfield-688ddd38-be7e-4ed2-abf4-bfcaa11bb2af.mp4',
}

# Timeline, in order: (source, first frame, end frame (exclusive), gain dB, options, note)
TIMELINE = [
    ('c01-02', 0, 962, 1.4, {'fade_in': 0.6}, 'Clips 1-2: van, "setting the tone", pen gadget, phone, nap schedule'),
    ('c03', 0, 481, 0.7, {'title_at': 450, 'hold': 1.8}, 'Clip 3: plan photo, Duane, aviators, window, TIME OUT title on the cup knock'),
    ('c04-05', 2, 961, -0.8, {}, 'Clips 4-5: nap time (first 2 frames dropped: leftover title frames)'),
    ('c06-07', 0, 70, 4.0, {}, 'Montage 6.1: basement'),
    ('c06-07', 70, 143, 4.0, {}, 'Montage 6.2: footlocker opens'),
    ('c06-07', 486, 599, 4.0, {}, 'Montage 7: footlocker contents'),
    ('c06-07', 143, 353, 4.0, {}, 'Montage 6.3-6.5: manual, face paint, helmet'),
    ('c06-07', 599, 724, 4.0, {}, 'Montage 7: caltrops'),
    ('c06-07', 773, 958, 4.0, {}, 'Montage 7: safe closes (trimmed head)'),
    ('c06-07', 353, 486, 4.0, {}, 'Montage 6.6: "Nap time, [BLEEP]."'),
    ('c08-09', 0, 963, 3.0, {}, 'Clips 8-9: backyard, socks, audio monitor, kitchen'),
    ('c10', 0, 481, 1.3, {}, 'Clip 10: caltrops, five swears, five dollars'),
    ('c11', 0, 385, -0.9, {}, 'Clip 11: safe, salt, "ROCK SALT?!"'),
    ('c11b', 13, 138, 5.0, {}, 'Clip 11b: "Daddy says the real ones make a mess."'),
    ('c11', 394, 481, -0.9, {}, 'Clip 11: Vince looks over his shoulder'),
    ('c12-13', 0, 283, 3.0, {}, 'Clip 12: regroup, pistol, "rob a nap?" (cut before the clack)'),
    ('c12-13', 484, 558, 3.0, {}, 'Clip 13 shot 1: breaker CLACK'),
    ('c12-13', 289, 484, 3.0, {'afade_in': 0.2}, 'Clip 12: eyes in the dark, "Nobody [BLEEP] move!"'),
    ('c12-13', 558, 962, 3.0, {}, 'Clip 13 shots 2-4: goggles, night vision, the squeak'),
    ('c14', 0, 481, 1.8, {}, 'Clip 14: BANG, "You SHOT me!", Glenn snores, lights on, the laugh'),
    ('c15-16', 0, 963, 0.7, {'fade_out': 1.0}, 'Clips 15-16: knives, "almost my [BLEEP]", wallets'),
]

EDGE_FADE = 0.015  # tiny audio fade at every cut to avoid clicks


def build(src_dir, title_png, out_path):
    inputs, chains, vlabels, alabels = [], [], [], []
    index = {}
    for key, name in SOURCES.items():
        index[key] = len(inputs) // 2
        inputs += ['-i', os.path.join(src_dir, name)]
    title_idx = len(inputs) // 2
    title_frames = 481
    inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{title_frames / FPS:.4f}', '-i', title_png]

    for k, (src, f0, f1, gain, opt, _note) in enumerate(TIMELINE):
        i = index[src]
        dur = (f1 - f0) / FPS
        v = (f'[{i}:v]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS,'
             f'scale={W}:{H}:flags=lanczos,setsar=1,fps={FPS}')
        if 'title_at' in opt:
            chains.append(f'[{title_idx}:v]scale={W}:{H},format=gbrp,setsar=1[title]')
            v += f",format=gbrp[tv{k}];[tv{k}][title]blend=all_mode=multiply:enable='gte(n,{opt['title_at']})'"
            v += f",format=yuv420p,tpad=stop_mode=clone:stop_duration={opt['hold']}"
        else:
            v += ',format=yuv420p'
        total = dur + opt.get('hold', 0)
        if 'fade_in' in opt:
            v += f",fade=t=in:st=0:d={opt['fade_in']}"
        if 'fade_out' in opt:
            v += f",fade=t=out:st={total - opt['fade_out']:.4f}:d={opt['fade_out']}"
        chains.append(v + f'[v{k}]')

        a = (f'[{i}:a]atrim=start={f0 / FPS:.6f}:end={f1 / FPS:.6f},asetpts=PTS-STARTPTS,'
             f'aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume={gain}dB')
        fin = opt.get('afade_in', opt.get('fade_in', EDGE_FADE))
        a += f',afade=t=in:st=0:d={fin}'
        if 'hold' in opt:
            a += f',afade=t=out:st={dur - 0.3:.4f}:d=0.3,apad=pad_dur={opt["hold"]}'
        else:
            fout = opt.get('fade_out', EDGE_FADE)
            a += f',afade=t=out:st={dur - fout:.4f}:d={fout}'
        chains.append(a + f'[a{k}]')
        vlabels.append(f'[v{k}]')
        alabels.append(f'[a{k}]')

    n = len(TIMELINE)
    concat = ''.join(f'{vlabels[k]}{alabels[k]}' for k in range(n)) + f'concat=n={n}:v=1:a=1[vout][aout]'
    graph = ';'.join(chains + [concat])

    tmp = out_path + '.pass1.mkv'
    subprocess.run(['ffmpeg', '-v', 'error', '-stats', '-y', *inputs, '-filter_complex', graph,
                    '-map', '[vout]', '-map', '[aout]',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
                    '-c:a', 'pcm_s16le', tmp], check=True)

    # Loudness: measure, then normalize the whole film to -16 LUFS, -1.5 dBTP (linear, keeps dynamics).
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af',
                           'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
          f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-map', '0:v', '-map', '0:a', '-c:v', 'copy',
                    '-af', ln + ',aresample=48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
                    out_path], check=True)
    os.remove(tmp)
    print(json.dumps({'measured': j}, indent=1))


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    build(*sys.argv[1:])
