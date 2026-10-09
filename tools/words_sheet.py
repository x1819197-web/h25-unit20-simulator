# kontakt-jadval: barcha o'rta so'zlar (w40-200, h8-20) bitta PNG ga
import os
from collections import deque
from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

cells = []
for f in sorted(os.listdir('ref_orig')):
    if not f.endswith('.png'):
        continue
    im = Image.open(os.path.join('ref_orig', f)).convert('RGB')
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
    for (x0, y0, x1, y1) in groups:
        w, h = x1 - x0 + 1, y1 - y0 + 1
        if 40 <= w <= 200 and 8 <= h <= 20:
            crop = im.crop((max(0, x0 - 4), max(0, y0 - 4), min(W, x1 + 5), min(H, y1 + 5)))
            cells.append((f, x0, y0, crop))

print('cells:', len(cells))
# 3x kattalashtirilgan jadval
ZW = 3
cols = 4
cw = max(c.width for _, _, _, c in cells) * ZW + 200
rh = max(c.height for _, _, _, c in cells) * ZW + 30
rows = (len(cells) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cw, rows * rh), (255, 0, 0))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i, (f, x0, y0, c) in enumerate(cells):
    r, cc = divmod(i, cols)
    big = c.resize((c.width * ZW, c.height * ZW), Image.NEAREST)
    sheet.paste(big, (cc * cw, r * rh + 24))
    d.text((cc * cw + 2, r * rh + 2), f'{i}:{f} x{x0} y{y0}', fill=(255, 255, 255))
sheet.save('tools/words_sheet.png')
print('sheet:', sheet.size)
