import re
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

def audit(ref, vals, label):
    im = Image.open(ref).convert('RGB')
    px = im.load()
    W, H = im.size
    peek = 0
    print(f'--- {label} ({len(vals)} boxes) ---')
    for (tag, x, y, w, h, fs) in vals:
        x, y, w, h = int(x), int(y), int(w), int(h)
        sx, sy = x, y + 24
        inside = 0
        ring = 0
        for yy in range(sy, min(sy + h, H)):
            for xx in range(sx, min(sx + w, W)):
                if isdark(px[xx, yy]):
                    inside += 1
        for yy in range(max(0, sy - 2), min(sy + h + 2, H)):
            for xx in range(max(0, sx - 2), min(sx + w + 2, W)):
                edge = xx < sx or xx >= sx + w or yy < sy or yy >= sy + h
                if edge and isdark(px[xx, yy]):
                    ring += 1
        status = 'PEEK' if ring > 3 else ('static-inside' if inside > 3 else 'clean')
        if status == 'PEEK':
            peek += 1
            print(f'  {tag} ov=({sx},{sy},{w},{h}) inside_dark={inside} ring2px_dark={ring} -> PEEK')
    print(f'  PEEK boxes: {peek}/{len(vals)}')

s = open('js/screens/exhaust.js', encoding='utf-8').read()
vals = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s)
audit('ref/11_exhaust.png', vals, 'EXHAUST')
s2 = open('js/screens/synchro.js', encoding='utf-8').read()
v2 = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s2)
audit('ref/03_synchro_exc.png', v2, 'SYNCHRO')
s3 = open('js/screens/startup.js', encoding='utf-8').read()
v3 = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s3)
audit('ref/01_startup.png', v3, 'STARTUP')
