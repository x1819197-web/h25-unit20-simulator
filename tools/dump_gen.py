from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

im = Image.open('ref_orig/06_generator.png').convert('RGB')
px = im.load()
for (x0, x1, y0, y1, nm) in [(682, 784, 105, 121, 'GEN-A'), (1116, 1210, 105, 121, 'GEN-B')]:
    print(f'### {nm} x={x0}-{x1} y={y0}-{y1} ###')
    for y in range(y0, y1 + 1):
        print(''.join('#' if isdark(px[x, y]) else '.' for x in range(x0, x1 + 1)))
    print()
