from PIL import Image

def isdark(p):
    return p[0] < 120 and p[1] < 120 and p[2] < 120

im = Image.open('ref_orig/03_synchro_exc.png').convert('RGB')
px = im.load()
print('### SYNCHRO x820-1000 y230-330 step1 ###')
for y in range(230, 331):
    row = ''.join('#' if isdark(px[x, y]) else ('.' if px[x, y][0] > 225 else '+') for x in range(820, 1000))
    if '#' in row:
        print(f'{y} {row}')
