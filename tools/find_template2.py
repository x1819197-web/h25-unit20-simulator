import os
from PIL import Image, ImageFont, ImageDraw
import math

def render(word, font, size):
    f = ImageFont.truetype(font, size)
    bb = f.getbbox(word)
    w, h = bb[2] - bb[0] + 6, bb[3] - bb[1] + 6
    im = Image.new('L', (w, h), 255)
    d = ImageDraw.Draw(im)
    d.text((3 - bb[0], 3 - bb[1]), word, font=f, fill=0)
    return im

FONT = 'C:/Windows/Fonts/tahoma.ttf'
tmpl = render('Filed Switch', FONT, 12)
tw, th = tmpl.size
tp = tmpl.load()
tmask = [(x, y) for y in range(th) for x in range(tw) if tp[x, y] < 128]
print('tmpl', tmpl.size, 'dark', len(tmask))

for f in sorted(os.listdir('ref_orig')):
    if not f.endswith('.png'):
        continue
    hay = Image.open(os.path.join('ref_orig', f)).convert('L')
    hp = hay.load()
    HW, HH = hay.size
    best = []
    for y in range(0, HH - th, 3):
        for x in range(0, HW - tw, 3):
            hit = 0
            for (tx, ty) in tmask[::3]:
                if hp[x + tx, y + ty] < 150:
                    hit += 1
            score = hit / (len(tmask) / 3)
            if score > 0.45:
                best.append((score, x, y))
    best.sort(reverse=True)
    print(f, len(best), best[:6])
