# 'F' bilan boshlanuvchi kichik so'zlarni topish (Filed izlash)
import re

lines = open('tools/words_small.txt', encoding='utf-8').read().splitlines()
cur = ''
i = 0
found = []
while i < len(lines):
    l = lines[i]
    if l.startswith('====='):
        cur = l
        i += 1
        continue
    if l.startswith('--'):
        hdr = l
        art = []
        i += 1
        while i < len(lines) and not lines[i].startswith('--') and not lines[i].startswith('====='):
            art.append(lines[i])
            i += 1
        if not art:
            continue
        W = max(len(r) for r in art)
        art = [r.ljust(W) for r in art]
        H = len(art)
        # birinchi glif (birinchi bo'sh ustungacha)
        gw = 0
        for x in range(W):
            if all(art[y][x] == '.' for y in range(H)):
                break
            gw += 1
        if gw >= 3:
            top = sum(1 for x in range(gw) if art[0][x] == '#') / gw
            bot = sum(1 for x in range(gw) if art[H - 1][x] == '#') / gw
            mid = sum(1 for x in range(gw) if art[H // 2][x] == '#') / gw
            if top > 0.6 and bot < 0.3 and mid > 0.4:
                found.append((cur, hdr))
        continue
    i += 1
for c, h in found:
    print(c, h)
print(len(found), 'F-candidates')
