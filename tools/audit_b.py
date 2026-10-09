import re, os, json
from PIL import Image

d = 'js/screens'
screens = {}
for f in sorted(os.listdir(d)):
    if not f.endswith('.js'):
        continue
    s = open(os.path.join(d, f), encoding='utf-8').read()
    bg = re.search(r'bg:\s*"([^"]+)"', s)
    vals = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s)
    screens[f] = {'bg': bg.group(1) if bg else None, 'vals': vals}

for k, v in screens.items():
    print(k, v['bg'], len(v['vals']))

# Audit: for each value box, sample ref PNG (stage coords: x, y+24)
print('\n=== VALUE BOX AUDIT (dark-pixel fraction, bg color) ===')
for k, v in screens.items():
    if not v['bg']:
        print(k, 'NO BG (menu?)')
        continue
    im = Image.open(v['bg']).convert('RGB')
    px = im.load()
    n_hit = 0
    for (tag, x, y, w, h, fs) in v['vals']:
        x, y, w, h = int(x), int(y), int(w), int(h)
        sx, sy = x, y + 24
        dark = 0
        tot = 0
        from collections import Counter
        bgc = Counter()
        for yy in range(sy, min(sy + h, im.size[1])):
            for xx in range(sx, min(sx + w, im.size[0])):
                r, g, b = px[xx, yy]
                tot += 1
                bgc[(r // 32, g // 32, b // 32)] += 1
                if r < 120 and g < 120 and b < 120:
                    dark += 1
        frac = dark / max(1, tot)
        dom = bgc.most_common(1)[0]
        flag = 'TEXT' if frac > 0.02 else 'clean'
        if flag == 'TEXT':
            n_hit += 1
    print(f'{k}: {len(v["vals"])} boxes, {n_hit} with static text (dark>2%)')
