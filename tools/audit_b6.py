import re
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

def textbbox_inside(px, W, H, sx, sy, w, h, pad=6):
    xs, ys = [], []
    for y in range(max(0, sy - pad), min(H, sy + h + pad)):
        for x in range(max(0, sx - pad), min(W, sx + w + pad)):
            if isdark(px[x, y]):
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))

cases = [
    ('ref/11_exhaust.png', 'js/screens/exhaust.js', ['TC01', 'TC06', 'TC13', 'EXH_T', 'SPREAD_1']),
    ('ref/03_synchro_exc.png', 'js/screens/synchro.js', ['GEN_POWER', 'EXH_T', 'SPREAD_1']),
    ('ref/01_startup.png', 'js/screens/startup.js', ['EXH_T', 'SPEED', 'MW_FDBK', 'F1_GCV']),
]
for ref, js, tags in cases:
    im = Image.open(ref).convert('RGB')
    px = im.load(); W, H = im.size
    vals = re.findall(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', open(js, encoding='utf-8').read())
    print(f'--- {ref} ---')
    for (tag, x, y, w, h, fs) in vals:
        if tag not in tags:
            continue
        x, y, w, h = int(x), int(y), int(w), int(h)
        sx, sy = x, y + 24
        bb = textbbox_inside(px, W, H, sx, sy, w, h)
        inside = bb and bb[0] >= sx and bb[1] >= sy and bb[2] < sx + w and bb[3] < sy + h
        print(f'{tag} ov=({sx},{sy},{w},{h}) textbbox={bb} inside={inside}')
