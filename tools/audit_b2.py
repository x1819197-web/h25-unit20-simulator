import re
from PIL import Image

# Exhaust TC01..03 + yon panel + synchro bir quti: ref matn bbox vs overlay rect
s = open('js/screens/exhaust.js', encoding='utf-8').read()
vals = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s)
im = Image.open('ref/11_exhaust.png').convert('RGB')
px = im.load()
W, H = im.size

def darkbbox(x0, y0, x1, y1):
    xs = [x for x in range(x0, x1) for y in range(y0, y1)
          if (lambda p: p[0] < 120 and p[1] < 120 and p[2] < 120)(px[x, y])]
    ys = [y for y in range(y0, y1) for x in range(x0, x1)
          if (lambda p: p[0] < 120 and p[1] < 120 and p[2] < 120)(px[x, y])]
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))

print('EXHAUST: overlay rect (stage) vs ref dark-text bbox (pad 12px window)')
for (tag, x, y, w, h, fs) in vals[:6] + vals[26:28]:
    x, y, w, h = int(x), int(y), int(w), int(h)
    sx, sy = x, y + 24
    bb = darkbbox(max(0, sx - 12), max(0, sy - 8), min(W, sx + w + 12), min(H, sy + h + 8))
    print(f'{tag} ov=({sx},{sy},{w},{h}) reftext={bb}')

# synchro EXH_T box
s2 = open('js/screens/synchro.js', encoding='utf-8').read()
v2 = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s2)
im2 = Image.open('ref/03_synchro_exc.png').convert('RGB')
px = im2.load(); W, H = im2.size
print('\nSYNCHRO:')
for (tag, x, y, w, h, fs) in v2[10:12]:
    x, y, w, h = int(x), int(y), int(w), int(h)
    sx, sy = x, y + 24
    bb = darkbbox(max(0, sx - 12), max(0, sy - 8), min(W, sx + w + 12), min(H, sy + h + 8))
    print(f'{tag} ov=({sx},{sy},{w},{h}) reftext={bb}')
