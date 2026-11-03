#!/usr/bin/env python3
"""Make the TIME OUT crayon title for the end of clip 3.

Usage: python3 make_title.py OUT.png [FRAME.png PREVIEW.jpg]
OUT.png is white with red crayon letters, meant to be MULTIPLIED onto the shot.
"""
import numpy as np, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
rng = np.random.default_rng(7)
W, H = 1280, 720
FONT = '/usr/share/fonts/truetype/inter/Inter-Black.ttf'
def font_path():
    import glob
    for p in ['/usr/share/fonts/opentype/inter/Inter-Black.otf']:
        return p
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
fp = font_path()
def letter_mask(ch, size):
    f = ImageFont.truetype(fp, size)
    box = f.getbbox(ch)
    w, h = box[2]-box[0]+40, box[3]-box[1]+40
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).text((20-box[0], 20-box[1]), ch, font=f, fill=255)
    return im
def word_mask(word, cx, cy, size, rot):
    canvas = Image.new('L', (W, H), 0)
    letters = [letter_mask(c, int(size*rng.uniform(0.93, 1.07))) for c in word]
    gap = int(size*0.06)
    total = sum(l.width for l in letters) - 40*len(letters) + gap*(len(letters)-1)
    x = cx - total//2
    word_img = Image.new('L', (W, H), 0)
    for l in letters:
        r = l.rotate(rng.uniform(-7, 7), resample=Image.BICUBIC, expand=True)
        y = cy - r.height//2 + int(rng.uniform(-8, 8))
        word_img.paste(r, (x - (r.width - l.width)//2 - 20, y), r)
        x += l.width - 40 + gap
    return word_img.rotate(rot, resample=Image.BICUBIC, center=(cx, cy))
m = np.maximum(np.asarray(word_mask('TIME', 228, 318, 118, 6), np.float32),
               np.asarray(word_mask('OUT', 1078, 238, 126, -5), np.float32)) / 255.0
# wobble: displace with low-frequency noise
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def lowfreq(scale, amp):
    n = rng.standard_normal((H//scale+2, W//scale+2)).astype(np.float32)
    im = Image.fromarray(((n-n.min())/(n.max()-n.min())*255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    return (np.asarray(im, np.float32)/255.0-0.5)*2*amp
dx, dy = lowfreq(40, 3.0), lowfreq(40, 3.0)
xi = np.clip((xx+dx).round().astype(int), 0, W-1); yi = np.clip((yy+dy).round().astype(int), 0, H-1)
m = m[yi, xi]
# rough edges
edge_noise = rng.random((H, W)).astype(np.float32)
mb = np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), np.float32)/255.0
m = np.clip((mb - 0.5 + (edge_noise-0.5)*0.35)*6 + 0.5, 0, 1)
# waxy streak grain along a diagonal stroke direction
g = rng.random((H*2, W*2)).astype(np.float32)
gi = Image.fromarray((g*255).astype(np.uint8)).rotate(28, resample=Image.BILINEAR)
ga = np.asarray(gi, np.float32)/255.0
k = 15; cs = np.cumsum(ga, axis=1); streak = (cs[:, k:] - cs[:, :-k]) / k
streak = Image.fromarray((np.clip(streak, 0, 1)*255).astype(np.uint8)).rotate(-28, resample=Image.BILINEAR)
s = np.asarray(streak, np.float32)/255.0
s = s[H//2:H//2+H, W//2:W//2+W]
s = (s - s.mean())/ (s.std()+1e-6)
coverage = np.clip(0.80 + s*0.22, 0, 1)
a = np.clip(m * coverage, 0, 1)
red = np.array([196, 32, 38], np.float32)
out = (255*(1-a[..., None]) + red*a[..., None]).clip(0, 255).astype(np.uint8)
Image.fromarray(out, 'RGB').save(sys.argv[1])
if len(sys.argv) > 2:
    frame = Image.open(sys.argv[2]).convert('RGB').resize((W, H), Image.LANCZOS)
    comp = (np.asarray(frame, np.float32) * out.astype(np.float32)/255.0).clip(0,255).astype(np.uint8)
    Image.fromarray(comp).save(sys.argv[3])
print('font:', fp)
