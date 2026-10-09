from PIL import Image

im = Image.open('ref_orig/01_startup.png').convert('RGB')
px = im.load()

def ch(p):
    r, g, b = p
    if r < 120 and g < 120 and b < 120:
        return '#'
    if r > 225 and g > 225 and b > 225:
        return '.'
    return '+'

# pastki hudud: y 380-574, x 0-640 (chap yarmi)
for y in range(380, 574, 2):
    row = ''.join(ch(px[x, y]) for x in range(0, 640, 2))
    if '#' in row:
        print(f'{y} {row}')
