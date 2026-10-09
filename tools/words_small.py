import os
from collections import deque
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

def words_of(src):
    im = Image.open(src).convert('RGB')
    px = im.load()
    W, H = im.size
    dark = [[isdark(px[x, y]) for x in range(W)] for y in range(H)]
    mask = [[False] * W for _ in range(H)]
    for y in range(H):
        x = 0
        while x < W:
            if dark[y][x]:
                x0 = x
                while x < W and dark[y][x]:
                    x += 1
                if x - x0 > 60:
                    for xx in range(x0, x):
                        mask[y][xx] = True
            else:
                x += 1
    for x in range(W):
        y = 0
        while y < H:
            if dark[y][x]:
                y0 = y
                while y < H and dark[y][x]:
                    y += 1
                if y - y0 > 40:
                    for yy in range(y0, y):
                        mask[yy][x] = True
            else:
                y += 1
    txt = [[dark[y][x] and not mask[y][x] for x in range(W)] for y in range(H)]
    seen = set()
    comps = []
    for y in range(H):
        for x in range(W):
            if (x, y) in seen or not txt[y][x]:
                continue
            q = deque([(x, y)])
            seen.add((x, y))
            xs, ys = [], []
            while q:
                cx, cy = q.popleft()
                xs.append(cx); ys.append(cy)
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and txt[ny][nx]:
                            seen.add((nx, ny))
                            q.append((nx, ny))
            if len(xs) > 4:
                comps.append([min(xs), min(ys), max(xs), max(ys)])
    comps.sort()
    groups = []
    for c in comps:
        placed = False
        for g in groups:
            if not (c[3] < g[1] - 3 or c[1] > g[3] + 3) and c[0] - g[2] < 12:
                g[0] = min(g[0], c[0]); g[1] = min(g[1], c[1])
                g[2] = max(g[2], c[2]); g[3] = max(g[3], c[3])
                placed = True
                break
        if not placed:
            groups.append(c)
    return groups, txt

out = open('tools/words_small.txt', 'w')
for f in sorted(os.listdir('ref_orig')):
    if not f.endswith('.png'):
        continue
    groups, txt = words_of(os.path.join('ref_orig', f))
    out.write(f'===== {f} =====\n')
    for (x0, y0, x1, y1) in sorted(groups, key=lambda g: (g[1], g[0])):
        w, h = x1 - x0 + 1, y1 - y0 + 1
        if 18 <= w <= 60 and 8 <= h <= 18:
            out.write(f'-- x={x0}-{x1} y={y0}-{y1} w={w} --\n')
            for y in range(y0, y1 + 1):
                out.write(''.join('#' if txt[y][x] else '.' for x in range(x0, x1 + 1)) + '\n')
out.close()
print('written')
