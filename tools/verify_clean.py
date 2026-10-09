import os
from PIL import Image

def darkcount(p):
    im = Image.open(p).convert('RGB')
    px = im.load()
    W, H = im.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            if r < 150 and g < 150 and b < 150:
                n += 1
    return n

print('file | orig_dark | clean_dark | removed%')
for f in sorted(os.listdir('ref_orig')):
    a = darkcount(os.path.join('ref_orig', f))
    b = darkcount(os.path.join('ref', f))
    print(f'{f} | {a} | {b} | {(a - b) / max(1, a) * 100:.1f}%')

# polar grid: plot circle (388,284) r<186 dark count orig vs clean
import math
for name in ['11_exhaust.png']:
    for d in ['ref_orig', 'ref']:
        im = Image.open(os.path.join(d, name)).convert('RGB')
        px = im.load()
        n = 0
        for y in range(284 - 190, 284 + 190):
            for x in range(388 - 190, 388 + 190):
                if math.hypot(x - 388, y - 284) < 186:
                    r, g, b = px[x, y]
                    if r < 150 and g < 150 and b < 150:
                        n += 1
        print(f'{d}/{name} plot-circle dark: {n}')
