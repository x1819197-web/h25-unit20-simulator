import os
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

for f in sorted(os.listdir('ref_orig')):
    if not f.endswith('.png'):
        continue
    im = Image.open(os.path.join('ref_orig', f)).convert('RGB')
    px = im.load()
    W, H = im.size
    # satrlar (keng ramka chiziqlari ajratgich)
    def rown(x_y):
        y = x_y
        return sum(1 for x in range(W) if isdark(px[x, y]))

    bands = []
    y = 0
    while y < H:
        n = rown(y)
        if 2 < n < 600:
            y0 = y
            while y < H and 2 < rown(y) < 600:
                y += 1
            bands.append((y0, y))
        else:
            y += 1
    for (y0, y1) in bands:
        h = y1 - y0
        if h < 8 or h > 18:
            continue
        # so'z oraliqlari: bo'sh ustunlar
        cols = [sum(1 for y in range(y0, y1) if isdark(px[x, y])) for x in range(W)]
        # 60-160px kenglikdagi so'z guruhlari
        x = 0
        while x < W:
            if cols[x] > 0:
                x0 = x
                while x < W and cols[x] > 0:
                    x += 1
                w = x - x0
                if 55 <= w <= 170:
                    print(f'{f} y={y0}-{y1} x={x0}-{x} w={w}')
            else:
                x += 1
