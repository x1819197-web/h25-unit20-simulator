import os
from PIL import Image, ImageFont
import math

FONTS = [
    'C:/Windows/Fonts/tahoma.ttf',
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/verdana.ttf',
]
WORDS = ['Filed Switch', 'Field Switch']

def render(word, font, size):
    f = ImageFont.truetype(font, size)
    bb = f.getbbox(word)
    w, h = bb[2] - bb[0] + 8, bb[3] - bb[1] + 8
    im = Image.new('L', (w, h), 255)
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    d.text((4 - bb[0], 4 - bb[1]), word, font=f, fill=0)
    return im

def ncc(hay, tmpl):
    # oddiy NCC: faqat qora piksellar ustida
    tw, th = tmpl.size
    tp = tmpl.load()
    tvals = [255 - tp[x, y] for y in range(th) for x in range(tw)]
    tn = math.sqrt(sum(v * v for v in tvals)) or 1
    hp = hay.load()
    HW, HH = hay.size
    best = (0, 0, 0)
    for y in range(0, HH - th, 2):
        for x in range(0, HW - tw, 2):
            s = 0.0
            q = 0.0
            for ty in range(th):
                for tx in range(tw):
                    tv = tvals[ty * tw + tx]
                    if tv > 30:
                        hv = 255 - sum(hp[x + tx, y + ty]) / 3
                        s += tv * hv
                        q += hv * hv
            if q > 0:
                c = s / (tn * math.sqrt(q))
                if c > best[0]:
                    best = (c, x, y)
    return best

results = []
for word in WORDS:
    for font in FONTS:
        if not os.path.exists(font):
            continue
        for size in (11, 12, 13, 14):
            t = render(word, font, size)
            for f in sorted(os.listdir('ref_orig')):
                if not f.endswith('.png'):
                    continue
                hay = Image.open(os.path.join('ref_orig', f)).convert('RGB')
                c, x, y = ncc(hay, t)
                results.append((c, f, word, os.path.basename(font), size, x, y, t.size))

results.sort(reverse=True)
for r in results[:12]:
    print('corr=%.3f file=%s word=%s font=%s size=%d pos=(%d,%d) tmpl=%s' % r)
