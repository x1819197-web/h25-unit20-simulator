import os
from collections import deque
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

def dump(src, x0, y0, x1, y1, step=1, maxrows=60):
    im = Image.open(src).convert('RGB')
    px = im.load()
    n = 0
    for y in range(y0, y1, step):
        row = ''.join('#' if isdark(px[x, y]) else ('.' if px[x, y][0] > 225 else '+') for x in range(x0, x1, step))
        if '#' in row:
            print(f'{y} {row}')
            n += 1
            if n > maxrows:
                print('... (truncated)')
                return

print('### SYNCHRO field area x500-640 y230-320 (stage) ###')
dump('ref_orig/03_synchro_exc.png', 500, 230, 640, 320)
print()
print('### GENERATOR field area: full-width word scan w60-140 ###')
im = Image.open('ref_orig/06_generator.png').convert('RGB')
px = im.load()
W, H = im.size
for y in range(0, H, 1):
    pass
# satr bandlari (ramkasiz)
def rown(y):
    return sum(1 for x in range(W) if isdark(px[x, y]))
bands = []
y = 0
while y < H:
    n = rown(y)
    if 2 < n < 400:
        y0 = y
        while y < H and 2 < rown(y) < 400:
            y += 1
        bands.append((y0, y))
    else:
        y += 1
for (a, b) in bands:
    if 8 <= b - a <= 16:
        cols = [sum(1 for y in range(a, b) if isdark(px[x, y])) for x in range(W)]
        x = 0
        while x < W:
            if cols[x] > 0:
                x0 = x
                while x < W and cols[x] > 0:
                    x += 1
                if 60 <= x - x0 <= 140:
                    print(f'GEN word: x={x0}-{x} y={a}-{b}')
            else:
                x += 1
