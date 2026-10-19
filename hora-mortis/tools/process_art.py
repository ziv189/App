#!/usr/bin/env python3
"""Turn the generated art in art/raw/ into game-ready pixel assets.

Keys out the painted checkerboard / magenta / grey backgrounds, splits the
sheets into sprites, shrinks everything to the game's 480x270 pixel grid,
reduces the palette, and writes:
  art/out/*.png       processed assets (for inspection)
  src/assets.js       the same PNGs as data URIs + anchor/glow metadata
Run from the hora-mortis/ folder:  python3 tools/process_art.py
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = os.path.join(ROOT, 'art', 'raw'), os.path.join(ROOT, 'art', 'out')
os.makedirs(OUT, exist_ok=True)


def load(name):
    return np.asarray(Image.open(os.path.join(RAW, name)).convert('RGB')).astype(np.int16)


def label(mask, conn=1):
    """Connected-component labels (0 = background)."""
    st = ndi.generate_binary_structure(2, conn)
    return ndi.label(mask, structure=st)[0]


def key_checker(a, global_key=False):
    """Object mask for sheets with a fake transparency checkerboard painted in."""
    mx, mn = a.max(-1), a.min(-1)
    sat = mx - mn
    light = (mx >= 212) & (sat <= 24)
    gray = (mx >= 150) & (mx <= 206) & (sat <= 20)
    cand = light | gray
    if global_key:
        return cleanup(~cand)
    lab = label(cand)
    n = lab.max()
    idx = np.arange(1, n + 1)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg_ids = set(border[border > 0].tolist())
    v = mx.astype(np.float64)
    cnt = ndi.sum(np.ones_like(v), lab, idx)
    cl = ndi.sum(light.astype(float), lab, idx)
    cg = ndi.sum(gray.astype(float), lab, idx)
    sl = ndi.sum(v * light, lab, idx); sl2 = ndi.sum(v * v * light, lab, idx)
    sg = ndi.sum(v * gray, lab, idx); sg2 = ndi.sum(v * v * gray, lab, idx)
    for k in range(n):
        cid = k + 1
        if cid in bg_ids or cnt[k] < 250:
            continue
        fl, fg = cl[k] / cnt[k], cg[k] / cnt[k]
        if fl < 0.2 or fg < 0.2:
            continue
        stl = np.sqrt(max(0.0, sl2[k] / max(cl[k], 1) - (sl[k] / max(cl[k], 1)) ** 2))
        stg = np.sqrt(max(0.0, sg2[k] / max(cg[k], 1) - (sg[k] / max(cg[k], 1)) ** 2))
        if stl < 9 and stg < 9:
            bg_ids.add(cid)
    bg = np.isin(lab, list(bg_ids))
    return cleanup(~bg)


def key_magenta(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    fringe = (r - g > 70) & (b - g > 70)
    return cleanup(~(bg | fringe))


def key_flat(a, col, tol=16):
    d = np.abs(a - np.array(col)).max(-1)
    cand = d <= tol
    lab = label(cand)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    return cleanup(~bg)


def cleanup(obj):
    """Drop tiny specks of object and fill tiny holes."""
    lab = label(obj, 2)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= 160
    keep[0] = False
    obj = keep[lab]
    labb = label(~obj)
    sizes = np.bincount(labb.ravel())
    hole = sizes < 48
    hole[0] = False
    return obj | hole[labb]


def boxes(obj, merge=24, min_area=900):
    """Bounding boxes of separate objects (thin parts joined by dilation)."""
    d = ndi.binary_dilation(obj, iterations=max(2, merge // 2))
    lab = label(d, 2)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        if sl is None:
            continue
        m = (lab[sl] == i + 1) & obj[sl]
        if m.sum() < min_area:
            continue
        ys, xs = np.nonzero(m)
        out.append([sl[1].start + xs.min(), sl[0].start + ys.min(), sl[1].start + xs.max() + 1, sl[0].start + ys.max() + 1])
    return out


def components(obj, n, rows=1, attach=60):
    """The n largest objects as separate masks, sorted by row then x."""
    lab = label(obj, 2)
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    big = list(np.argsort(sizes)[::-1][:n])
    sl = ndi.find_objects(lab)
    bb = {i: (sl[i - 1][1].start, sl[i - 1][0].start, sl[i - 1][1].stop, sl[i - 1][0].stop) for i in range(1, len(sl) + 1) if sl[i - 1] is not None}
    groups = {i: [i] for i in big}
    for i, (x0, y0, x1, y1) in bb.items():
        if i in groups or sizes[i] < 60:
            continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        for j in big:
            X0, Y0, X1, Y1 = bb[j]
            if X0 - attach <= cx <= X1 + attach and Y0 - attach <= cy <= Y1 + attach:
                groups[j].append(i)
                break
    masks = [(bb[j], np.isin(lab, groups[j])) for j in big]
    masks.sort(key=lambda t: (t[0][1] + t[0][3]) / 2)
    per = len(masks) // rows
    out = []
    for r in range(rows):
        out += sorted(masks[r * per:(r + 1) * per], key=lambda t: t[0][0])
    return [m for _, m in out]


def drop_small(obj, min_area):
    lab = label(obj, 2)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= min_area
    keep[0] = False
    return keep[lab]


def anchors(rgba):
    """Feet (bottom centre) and top point of an opaque sprite, in sprite pixels."""
    a = rgba[..., 3] > 0
    ys, xs = np.nonzero(a)
    bot = ys.max()
    fx = xs[ys >= bot - 2].mean()
    top = ys.min()
    tx = xs[ys <= top + 1].mean()
    return {'foot': [round(float(fx), 1), int(bot)], 'top': [round(float(tx), 1), int(top)]}


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return [xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]


def shrink(rgb, alpha, w, h, sharpen=True):
    """Area-average downscale with premultiplied alpha, then crisp alpha."""
    A = (alpha.astype(np.float64)).clip(0, 1)
    rgba = np.dstack([rgb.clip(0, 255), A * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA').convert('RGBa').resize((w, h), Image.Resampling.BOX).convert('RGBA')
    if sharpen:
        rgbim = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        im = Image.merge('RGBA', (*rgbim.split(), im.getchannel('A')))
    a = np.asarray(im).copy()
    a[..., 3] = np.where(a[..., 3] >= 110, 255, 0)
    return a


def quantize(rgba, colors):
    im = Image.fromarray(rgba[..., :3].astype(np.uint8), 'RGB')
    q = im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = rgba.copy()
    out[..., :3] = np.asarray(q)
    return out


def outline(rgba, col=(11, 8, 14)):
    a = rgba[..., 3] > 0
    grow = a.copy()
    grow[1:, :] |= a[:-1, :]; grow[:-1, :] |= a[1:, :]
    grow[:, 1:] |= a[:, :-1]; grow[:, :-1] |= a[:, 1:]
    edge = grow & ~a
    out = rgba.copy()
    out[edge] = (*col, 255)
    return out


def pad(rgba, p=1):
    h, w = rgba.shape[:2]
    out = np.zeros((h + 2 * p, w + 2 * p, 4), np.uint8)
    out[p:p + h, p:p + w] = rgba
    return out


def emissive_src(sub, al, kind, scale_x, scale_y, off=1, cell=None):
    """Bright flame / red-glow points found in the full-res source, in output pixels."""
    r, g, b = sub[..., 0].astype(int), sub[..., 1].astype(int), sub[..., 2].astype(int)
    if kind == 'flame':
        m = al & (r > 225) & (g > 150) & (b < 140) & (r - b > 110)
    else:
        m = al & (r > 170) & (g < 95) & (b < 95) & (r - g > 110)
    ys, xs = np.nonzero(m)
    if not len(xs):
        return []
    cs = cell or max(2, int(round(2.5 / scale_x)))
    pts = {}
    for x, y in zip(xs, ys):
        pts.setdefault((x // cs, y // cs), []).append((x, y))
    out = []
    for v in pts.values():
        if len(v) < max(3, cs * cs // 6):
            continue
        out.append([round(float(np.mean([q[0] for q in v])) * scale_x + off, 1), round(float(np.mean([q[1] for q in v])) * scale_y + off, 1), len(v)])
    out.sort(key=lambda t: -t[2])
    merged = []
    for o in out:
        if all((o[0] - q[0]) ** 2 + (o[1] - q[1]) ** 2 > 9 for q in merged):
            merged.append(o)
    return [o[:2] for o in merged[:64]]


def emissive(rgba, kind='flame'):
    r, g, b, a = [rgba[..., i].astype(int) for i in range(4)]
    if kind == 'flame':
        m = (a > 0) & (r > 215) & (g > 140) & (b < 150) & (r + g > 420)
    else:  # red glow
        m = (a > 0) & (r > 170) & (g < 90) & (b < 90)
    ys, xs = np.nonzero(m)
    pts = {}
    for x, y in zip(xs, ys):
        pts.setdefault((x // 4, y // 4), []).append((x, y))
    out = [[round(float(np.mean([p[0] for p in v])), 1), round(float(np.mean([p[1] for p in v])), 1)] for v in pts.values() if len(v) >= 1]
    return out


ASSETS, META = {}, {}


def save(name, rgba, meta=None):
    im = Image.fromarray(rgba.astype(np.uint8), 'RGBA')
    im.save(os.path.join(OUT, name + '.png'), optimize=True)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    ASSETS[name] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    m = {'w': rgba.shape[1], 'h': rgba.shape[0]}
    m.update(meta or {})
    META[name] = m
    print(f'  {name:16s} {rgba.shape[1]:4d}x{rgba.shape[0]:<4d} {len(buf.getvalue()) // 1024:4d} KB')


LAST = {}


def sprite(a, mask, height=None, width=None, colors=64, line=True, sharpen=True):
    x0, y0, x1, y1 = bbox(mask)
    sub, al = a[y0:y1, x0:x1], mask[y0:y1, x0:x1]
    H0, W0 = al.shape
    if height:
        h, w = height, max(1, round(W0 * height / H0))
    else:
        w, h = width, max(1, round(H0 * width / W0))
    out = quantize(shrink(sub, al, w, h, sharpen), colors)
    off = 0
    if line:
        out = outline(pad(out))
        off = 1
    LAST['flames'] = emissive_src(sub, al, 'flame', w / W0, h / H0, off)
    LAST['glow'] = emissive_src(sub, al, 'red', w / W0, h / H0, off)
    return out


def full(a, size, colors=64):
    w, h = size
    out = shrink(a, np.ones(a.shape[:2]), w, h)
    LAST['flames'] = emissive_src(a, np.ones(a.shape[:2], bool), 'flame', w / a.shape[1], h / a.shape[0], 0)
    return quantize(out, colors)


def sort_grid(bxs, rows):
    bxs = sorted(bxs, key=lambda b: (b[1] + b[3]) / 2)
    per = len(bxs) // rows if rows else len(bxs)
    out = []
    for r in range(rows):
        out += sorted(bxs[r * per:(r + 1) * per], key=lambda b: b[0])
    return out


def main():
    print('backgrounds')
    for nm in ['ossuary', 'nave', 'tower', 'choir', 'altar']:
        save('bg_' + nm, full(load(f'bg_{nm}.jpg'), (380, 380)))
    t = full(load('title.png'), (270, 270))
    save('title', t, {'flames': LAST['flames']})
    save('ending', full(load('ending.jpg'), (480, 480)))

    print('logo')
    a = load('logo.jpg'); obj = key_checker(a, global_key=True)
    save('logo', sprite(a, drop_small(obj, 2500), width=172, colors=40, line=False))

    print('windows')
    a = load('windows.jpg'); obj = drop_small(key_checker(a), 400)
    for i, m in enumerate(components(obj, 4, attach=0)):
        save(f'window{i + 1}', sprite(a, m, height=228, colors=48, line=False))

    print('props A')
    a = load('props_a.jpg'); obj = key_magenta(a)
    names = ['chandelier', 'bell', 'door_closed', 'door_open']
    sizes = [dict(width=50), dict(height=40), dict(height=58), dict(height=58)]
    for nm, m, sz in zip(names, components(obj, 4, rows=2), sizes):
        sp = sprite(a, m, colors=32, **sz)
        save(nm, sp, {'flames': LAST['flames']})

    print('statues')
    a = load('statues.jpg'); obj = key_magenta(a)
    for nm, m, hgt in zip(['statue_virgin', 'statue_penitent', 'statue_angel'], components(obj, 3), [88, 80, 84]):
        sp = sprite(a, m, height=hgt, colors=28)
        save(nm, sp, {'flames': LAST['flames']})

    print('props B')
    a = load('props_b.jpg'); obj = key_checker(a)
    names = ['banner', 'cage', 'censer', 'skullpile', 'candles', 'organ']
    sizes = [dict(height=58), dict(height=62), dict(height=44), dict(width=46), dict(height=36), dict(height=50)]
    for nm, m, sz in zip(names, components(obj, 6, rows=2), sizes):
        sp = sprite(a, m, colors=28, **sz)
        save(nm, sp, {'flames': LAST['flames']})

    print('ui')
    a = load('ui.jpg'); obj = key_checker(a)
    gk = key_checker(a, global_key=True)
    names = ['ui_hourglass', 'ui_frame', 'ui_skull', 'ui_reticle', 'ui_corner', 'ui_seal']
    sizes = [dict(height=26), dict(width=60), dict(height=9), dict(height=15), dict(height=20), dict(height=22)]
    for nm, m, sz in zip(names, components(obj, 6), sizes):
        if nm == 'ui_frame':  # its inside is enclosed checkerboard: key it globally
            x0, y0, x1, y1 = bbox(m)
            m = np.zeros_like(m); m[y0:y1, x0:x1] = gk[y0:y1, x0:x1]
            m = components(m, 1, attach=0)[0]
        save(nm, sprite(a, m, colors=24, sharpen=False, **sz))

    print('enemies')
    a = load('char_enemies.jpg'); obj = key_flat(a, (105, 105, 105), tol=14)
    names = ['e_grunt', 'e_acolyte', 'e_priest', 'e_shield', 'e_gargoyle']
    hts = [31, 38, 42, 34, 46]
    for nm, m, hgt in zip(names, components(obj, 5, attach=10), hts):
        sp = sprite(a, m, height=hgt, colors=28)
        meta = {'glow': LAST['glow']}
        meta.update(anchors(sp))
        save(nm, sp, meta)

    print('altar virgin card')
    a = load('bg_altar.jpg')
    x0, y0, x1, y1 = 1050, 330, 1530, 1330
    sub = a[y0:y1, x0:x1]
    hh, ww = sub.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww]
    top = ww * 0.75
    r = ww * 0.95
    inside = (yy >= top) | ((np.hypot(xx + 0.5 - (ww - r), yy + 0.5 - top) <= r) & (np.hypot(xx + 0.5 - r, yy + 0.5 - top) <= r))
    s = quantize(shrink(sub, inside, round(ww * 228 / hh), 228), 48)
    save('window5', s)

    with open(os.path.join(ROOT, 'src', 'assets.js'), 'w') as f:
        f.write("'use strict';\n// Generated by tools/process_art.py from art/raw/ - do not edit by hand.\n")
        f.write('const ASSET_META = ' + json.dumps(META, separators=(',', ':')) + ';\n')
        f.write('const ASSET_SRC = {\n')
        for k, v in ASSETS.items():
            f.write(f"  {k}: '{v}',\n")
        f.write('};\n')
    total = sum(len(v) for v in ASSETS.values())
    print(f'assets.js: {len(ASSETS)} assets, {total / 1024:.0f} KB of data URIs')


if __name__ == '__main__':
    main()
