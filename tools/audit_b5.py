from PIL import Image

im = Image.open('ref/03_synchro_exc.png').convert('RGB')
px = im.load()

def ch(p):
    r, g, b = p
    if r < 120 and g < 120 and b < 120:
        return '#'
    if r > 200 and 110 < g < 195 and b < 90:
        return 'O'
    if r > 225 and g > 225 and b > 225:
        return '.'
    return '+'

print('### SYNCHRO x1000-1090 y100-180 step1 (cols: 1000+) ###')
print('    ' + ''.join(str((1000 + x) // 10 % 10) for x in range(0, 91)))
for y in range(100, 181):
    print(f'{y} ' + ''.join(ch(px[1000 + x, y]) for x in range(0, 91)))
