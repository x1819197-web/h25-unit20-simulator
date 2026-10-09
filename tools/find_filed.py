from PIL import Image

im = Image.open('ref_orig/01_startup.png').convert('RGB')
px = im.load()
W, H = im.size

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

# qatorlar bo'yicha qora piksel zichligi -> matn chiziqlari
rows = []
for y in range(H):
    n = sum(1 for x in range(W) if isdark(px[x, y]))
    rows.append(n)

# bandlar (uzluksiz qora qatorlar)
bands = []
y = 0
while y < H:
    if rows[y] > 3:
        y0 = y
        while y < H and rows[y] > 3:
            y += 1
        bands.append((y0, y))
    else:
        y += 1

print(f'{len(bands)} text bands')
for (y0, y1) in bands:
    h = y1 - y0
    if h < 6 or h > 30:
        continue
    xs = [x for y in range(y0, y1) for x in range(W) if isdark(px[x, y])]
    if not xs:
        continue
    x0, x1 = min(xs), max(xs)
    w = x1 - x0
    if w < 60 or w > 700:
        continue
    # butun kenglikdagi chiziqmi (ramka)? chetlarni tekshir
    print(f'y={y0}-{y1} x={x0}-{x1} w={w}')
