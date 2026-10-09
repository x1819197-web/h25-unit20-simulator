"""ref/ PNG dagi dinamik matn qoldiqlarini tozalash (2B-3, variant a).
Qoida: overlay rect ICHIDAGI qora piksellar o'chiriladi (fon rangi bilan);
2px halqadagi qora komponent F AQAT ichkariga tegib turgan kichik (<40px tashqi)
bo'lsa o'chiriladi (sliver). Qo'shni ramka/matn (uzun/katta komponent) saqlanadi.
Original: ref_orig/ (bir marta ko'chiriladi). Qayta generatsiya: python tools/clean_ref.py
"""
import re, os, shutil
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'ref')
ORIG = os.path.join(ROOT, 'ref_orig')
SCR = os.path.join(ROOT, 'js', 'screens')

def isdark(p):
    return p[0] < 150 and p[1] < 150 and p[2] < 150

def parse_rects():
    rects = {}  # bg -> [(x, y, w, h, kind, tag)]
    for f in sorted(os.listdir(SCR)):
        if not f.endswith('.js'):
            continue
        s = open(os.path.join(SCR, f), encoding='utf-8').read()
        bg = re.search(r'bg:\s*"([^"]+)"', s)
        if not bg:
            continue
        bg = bg.group(1)
        out = []
        for m in re.finditer(r'\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', s):
            tag, x, y, w, h = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5))
            out.append((x, y + 24, w, h, 'ov', tag))  # page -> stage
        # buttons (act:), lamptexts/headers (text:), mcells (motor:), scrows/tripitems (l1:)
        for pat, kind in ((r'\{x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),[^}]*?act:', 'btn'),
                          (r'\{x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),[^}]*?text:', 'txt'),
                          (r'\{motor:"\w+",\s*kind:"\w+",\s*x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+)', 'mcell'),
                          (r'\{x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),\s*fs:\d+,\s*l1:', 'scrow')):
            for m in re.finditer(pat, s):
                out.append((int(m.group(1)), int(m.group(2)) + 24, int(m.group(3)), int(m.group(4)), kind, ''))
        rects.setdefault(bg, []).extend(out)
    return rects

def lamptext_mcell_rects():
    """lamptexts/mcells aniq ro'yxati (buttons bilan adashmasin)."""
    out = {}
    for f in sorted(os.listdir(SCR)):
        if not f.endswith('.js'):
            continue
        s = open(os.path.join(SCR, f), encoding='utf-8').read()
        bg = re.search(r'bg:\s*"([^"]+)"', s)
        if not bg:
            continue
        bg = bg.group(1)
        for m in re.finditer(r'\{x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),\s*fs:\d+,\s*text:', s):
            out.setdefault(bg, []).append((int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), 'lamptext', ''))
        for m in re.finditer(r'\{x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),\s*fs:\d+\}', s):
            # motors p supplemental — xavfsiz: faqat mcells/scrows/tripitems hududlari
            pass
    return out

def clean_one(refpath, rects):
    im = Image.open(refpath).convert('RGB')
    px = im.load()
    W, H = im.size
    stat = {'in': 0, 'sliver': 0, 'boxes': 0}
    for (x, y, w, h, kind, tag) in rects:
        if kind not in ('ov', 'btn', 'txt', 'mcell', 'scrow'):
            continue
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(W, x + w), min(H, y + h)
        if x1 <= x0 or y1 <= y0:
            continue
        stat['boxes'] += 1
        # fon rangi: qora bo'lmagan piksellar medianasi
        lights = []
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                p = px[xx, yy]
                if not isdark(p):
                    lights.append(p)
        if lights:
            lights.sort()
            bgc = lights[len(lights) // 2]
        else:
            bgc = (255, 255, 255)
        # 1) avval sliver komponentalarni topamiz (ichkarisi hali o'chirilmagan)
        pad = 3
        wx0, wy0 = max(0, x - pad), max(0, y - pad)
        wx1, wy1 = min(W, x + w + pad), min(H, y + h + pad)
        seen = set()
        slivers = []
        for yy in range(wy0, wy1):
            for xx in range(wx0, wx1):
                if (xx, yy) in seen or not isdark(px[xx, yy]):
                    continue
                comp = []
                dq = deque([(xx, yy)])
                seen.add((xx, yy))
                inside_ct = out_ct = 0
                while dq:
                    cx, cy = dq.popleft()
                    comp.append((cx, cy))
                    if x0 <= cx < x1 and y0 <= cy < y1:
                        inside_ct += 1
                    else:
                        out_ct += 1
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if (wx0 <= nx < wx1 and wy0 <= ny < wy1 and (nx, ny) not in seen
                                and isdark(px[nx, ny])):
                            seen.add((nx, ny))
                            dq.append((nx, ny))
                if inside_ct > 0 and 0 < out_ct < 40 and len(comp) < 400:
                    slivers.append(comp)
        # 2) ichkarini tozalash
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                if isdark(px[xx, yy]):
                    px[xx, yy] = bgc
                    stat['in'] += 1
        # 3) sliverlarni tozalash
        for comp in slivers:
            for (cx, cy) in comp:
                if not (x0 <= cx < x1 and y0 <= cy < y1):
                    px[cx, cy] = bgc
                    stat['sliver'] += 1
    return im, stat

def main():
    if not os.path.exists(ORIG):
        os.makedirs(ORIG)
        for f in os.listdir(REF):
            shutil.copy2(os.path.join(REF, f), os.path.join(ORIG, f))
        print('ref_orig/ saqlandi:', len(os.listdir(ORIG)), 'fayl')
    rects = parse_rects()
    total = {'in': 0, 'sliver': 0, 'boxes': 0}
    for bg, rs in sorted(rects.items()):
        ovs = [r for r in rs if r[4] in ('ov', 'btn', 'txt', 'mcell', 'scrow')]
        if not ovs:
            continue
        im, st = clean_one(os.path.join(REF, os.path.basename(bg)), ovs)
        im.save(os.path.join(REF, os.path.basename(bg)))
        for k in total:
            total[k] += st[k]
        print(f'{bg}: boxes={st["boxes"]} inside_px={st["in"]} sliver_px={st["sliver"]}')
    print('JAMI:', total)

if __name__ == '__main__':
    main()
