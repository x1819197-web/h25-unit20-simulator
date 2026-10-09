import os
from collections import deque
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

def words(im, y_lo=0):
    px = im.load()
    W, H = im.size
    seen = set()
    comps = []
    for y in range(y_lo, H):
        for x in range(W):
            if (x, y) in seen or not isdark(px[x, y]):
                continue
            q = deque([(x, y)])
            seen.add((x, y))
            xs, ys = [], []
            while q:
                cx, cy = q.popleft()
                xs.append(cx); ys.append(cy)
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < W and y_lo <= ny < H and (nx, ny) not in seen and isdark(px[nx, ny]):
                            seen.add((nx, ny))
                            q.append((nx, ny))
            comps.append((min(xs), min(ys), max(xs), max(ys)))
    # so'zlarga guruhlash: vertikal kesishuv + gorizontal masofa < 12
    comps.sort()
    groups = []
    for c in comps:
        placed = False
        for g in groups:
            gx0, gy0, gx1, gy1 = g
            if not (c[3] < gy0 - 2 or c[1] > gy1 + 2) and c[0] - gx1 < 15:
                g[0] = min(g[0], c[0]); g[1] = min(g[1], c[1])
                g[2] = max(g[2], c[2]); g[3] = max(g[3], c[3])
                placed = True
                break
        if not placed:
            groups.append([c[0], c[1], c[2], c[3]])
    return groups

im = Image.open('ref_orig/01_startup.png').convert('RGB')
px = im.load()
gs = words(im, 330)
print(len(gs), 'groups in bottom area')
for (x0, y0, x1, y1) in sorted(gs, key=lambda g: (g[1], g[0])):
    w, h = x1 - x0 + 1, y1 - y0 + 1
    if 45 <= w <= 200 and 8 <= h <= 22:
        print(f'x={x0}-{x1} y={y0}-{y1} w={w} h={h}')
        for y in range(y0, y1 + 1):
            print('   ' + ''.join('#' if isdark(px[x, y]) else '.' for x in range(x0, x1 + 1)))
