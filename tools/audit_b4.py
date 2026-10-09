from PIL import Image

im = Image.open('ref/01_startup.png').convert('RGB')
px = im.load()

def show(x0, y0, x1, y1, step=2):
    for y in range(y0, y1, step):
        row = ''
        for x in range(x0, x1, step):
            r, g, b = px[x, y]
            if r < 120 and g < 120 and b < 120:
                row += '#'
            elif r > 200 and g > 130 and b < 110:
                row += 'O'  # orange button
            elif r > 225 and g > 225 and b > 225:
                row += '.'
            else:
                row += '+'
        print(f'{y:4d} {row}')

print('### STARTUP LOAD_SET area (ov stage 820,483 95x20) ###')
show(760, 450, 990, 540)
print()
print('### SYNCHRO READY/RELEASE area ###')
im2 = Image.open('ref/03_synchro_exc.png').convert('RGB')
px = im2.load()
show2 = lambda x0, y0, x1, y1, step=2: None
for y in range(60, 200, 2):
    row = ''
    for x in range(980, 1100, 2):
        r, g, b = px[x, y]
        if r < 120 and g < 120 and b < 120:
            row += '#'
        elif r > 200 and g > 130 and b < 110:
            row += 'O'
        elif r > 225 and g > 225 and b > 225:
            row += '.'
        else:
            row += '+'
    print(f'{y:4d} {row}')
