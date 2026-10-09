# UNIT-20 SIMULATOR — AUDIT (1-BOSQICH, kod o'zgartirilmadi)

Sana: 2026-10-06. Audit o'tkazuvchi: senior simulyator-dasturchi.
Loyihalar:
- H25: `C:\Users\X\h25-scada-simulator\` — `index.html` ochiladi (yoki `dist/UNIT20-Simulator.exe`).
- KU-20: `D:\qozon\simulyatsiya\index.html` — PL3009 (baraban) + PL3010 (bug') 1920x1080.
- Bog'lovchi: `BroadcastChannel('unit20')` + `localStorage` (`h25_live` / `ku20_live`).

## 1. Har bir fayl nima qiladi (H25)

| Fayl | Vazifa |
|---|---|
| `index.html` | Frame: `#viewport > #stage (1280x574) > img#refbg + #body > #page + #navzones`; 19 ekran JS + `tags/engine/app/selftest/unit20-link/alarm` yuklaydi. Versiya `?v=32` kesh-busting. |
| `css/diasys.css` | Barcha overlay widgetlar: `.ov` (oq qiymat qutisi, flex-center, `gap:5px`, ikki `<span>`: qiymat + birlik), `.obtn`, `.fbar` (FFD navy bar), `.olamp/.osym/.olamptext`, `.omotor/.opump/.mcell`, `.scrow/.schead/.readybox`, `.drtab`, `#navzones .ozone` (x1115 w160 h20). `#body` = left0 top24 w1108 h506, z-index 2 (navzones z1 ostida). |
| `js/tags.js` | Yagona tag DB `H25_TAGS`: ~200 tag, har biri `(v, unit, dp, nz, min, max)`. Hozir BARCHA `nz=0` (PROGRESS.md: "rock-stable at ref points"). TC01..18, CT001..CT018 (data-report nusxalari!), EXH_T=595.0, EXH_REF_T=595.8, SPREAD_1=32.4, SPREAD_2=31.8, EXH_SPREAD_3=25.0, ALLOW=90.0, GEN_PF=0.99 qo'lda yozilgan. |
| `js/engine.js` (~740 qator) | 500 ms `tick()`: Base-load zanjiri, trip/coast, recovering rampasi, startup seq, overspeed test, trainer faultlar. `push()` — barcha `[data-tag]` ga `toFixed(dp)` yozadi. `press/release/motor/trip/masterReset/counterReset/scColor/startCheckOk/os*` — boshqaruv API. |
| `js/app.js` (~628 qator) | `renderOverlay(page, def)`: `values→.ov`, `buttons→.obtn`, `bars→.fbar`, `lamps/syms/lamptexts/scrows/headers/ready/drtables/osbar/tripitems/motors/pumps/mcells/polar(canvas)`. `updatePolar/updateOsbar/updateFbars/refreshCustom/refreshButtons/wireOverlay/buildZones/loadScreen/fitStage/toggleFullscreen/buildTrainer`. Tick listenerlar: `updateFbars, refreshCustom, updatePolar, updateOsbar`. |
| `js/screens/*.js` (20 fayl) | Har ekran: `{id, bg: ref/NN.png, nav, navList, values: [tag,x,y,w,h,fs,unit], buttons, lamps/syms/bars/mcells/... , render}`. Koordinata = PAGE (stage_y − 170). Batafsil 2-bo'limda. |
| `js/unit20-link.js` | Har tick'da `h25_live` e'lon qiladi (EXH_T, POWER, SPEED, LOAD_SET, FUEL_FLOW, running, tripped, seq). `?link=1` bo'lsa KU trip/backP ni H25 ga yumshoq qaytaradi. `setInterval(readKU,2000)`. H25 vizualiga ta'sir qilmaydi. |
| `js/alarm.js` | WebAudio sirena (trip) / beep (fault warn). Birinchi click'da AudioContext. `🔊` tugma. |
| `js/selftest.js` | `?selftest=1`: 7 test (location, raise, base, trip-coast, reset, reset-ramp, tags-numeric, nav-19) → `#selftest-result`. |
| `ref/01..19.png` | 1280x720 (stage 1280x574, yuqori ~146 px kesilgan). Fon rasmida STATIK raqam+birlik chizilgan — ustiga `.ov` yoziladi → ikkilanish manbai. `11_exhaust.png` da statik ko'k poligon o'chirilgan (PROGRESS v27: 534+1297 px plot gray ga). |
| `deploy_unit20/` | Tarqatma nusxa (h25+ku). `build_unit20.bat`, `UNIT20-Simulator.spec`, `launcher.py`. Audit asosiy `js/` bo'yicha; deploy nusxa alohida yangilanishi kerak. |
| `PROGRESS.md / README.md` | Tarix + ishga tushirish. Muhim konvensiyalar: PAGE = STAGE−170; nav x1115 w160 top=177+i*21.5 h20 (app.js da 31+i*21.5 — PAGE ichida); header KPI x1192 w80. |

## 2. Overlay koordinatalari qayerda

- Manba: `js/screens/*.js` → `values` massivi `[tag, x, y, w, h, fs, unit]`, `buttons {x,y,w,h,fs}`, `lamps/syms/lamptexts/scrows/mcells/motors/pumps {x,y,w,h}`, `bars {cx}`, `polar {x,y,size,c,r}`, `osbar {x,y,w,h}`, `drtables {x,y,w,h,fs,rh, rows}`.
- Render: `js/app.js::renderOverlay` (60–246 qatorlar). Qiymat qutisi HTML: `<div.ov><span data-tag> + <span>unit</span></div>` — birlik HAR DOIM ikkinchi span (masalan `degC`), fon rasmidagi `612.2 degC` STATIK matn ustiga chiqadi → "C" ikkilanishi.
- EXHAUST (`screens/exhaust.js:42`): `polar: {x:170, y:93, size:410, c:205, r:205}` — canvas 410x410, markaz (205,205) → PAGE (375,298) → STAGE (375,468). PROGRESS.md eski yozuv: "center stage (380,420), R=195" — ESKIRGAN, kodda R=205. TC hujayralar xuddi shu fayl 9–26 qatorlar (18 ta). Yon panel 927px ustunda 12 qator.
- SYNCHRO (`screens/synchro.js`): values x213 w108; RELEASE `{x:1018,y:116,w:56,h:33}`; READY lamptext `{x:1016,y:90,w:58,h:19}` — ikkisi vertikal yopishadi (90+19=109 vs 116: 7px tirqish, lekin fon tugma shakli bilan ustma-ust ko'rinadi). 52G/41 syms, AVR/AER, RAISE/LOWER (vraise/vlower/iraise/ilower), lamps sync1..4 (x611).
- `startup.js` da "Field Switch" matni YO'Q — "Filed Switch" xatosi FON RASM (`ref/01_startup.png`) ichida, kodda emas. Tuzatish = rasmni retushlash yoki ustiga `.ov`-siz label yopishtirish.
- KU (`D:\qozon\simulyatsiya\index.html:60–132`): `.val` (23px, monospace 15px) va `.hot` klapan zonalari inline `style="left/top/width"` — 1920x1080. PL3009 ~20 val + 5 hot + trip btn; PL3010 ~25 val + 10 hot.
- Yagona ro'yxat (`fields.json`) Hozir YO'Q — har ekran o'z faylida tarqoq. Debug `?dbg=1` faqat nav zonalarni qizil chizadi (`app.js:479`), maydon chegarasi/to'r/kesishuv aniqlash YO'Q.

## 3. Fizika formulalari qayerda

### H25 (`js/engine.js`)
- `tick()` 500ms; `lag(k,tgt,k2): T[k]+=(tgt−T[k])*k2` — hamma silliq intilish shu.
- Base-load zanjiri (209–332): `d=LOAD_SET−30` → FFD limiterlar (`FFD_ACC=73+0.8d`, `SPD=77.8+1.2d`, `LLM=65.7+1.5d`, `TEMP=64+1.5d−exhHot*0.15`) → `foffdTgt=65.2+1.5d` (LLM/SPD shift bilan min) → runback (`EXH>EXH_REF+11` bo'lsa −0.8/°C) → `FOFFD lag 0.25` → klapanlar (`SRV 28.2+0.9d`, `F1 24.4+0.5d`, `F2_x 46.7+0.9d`, staging: FOFFD<KD bo'lsa 0) → `POWER=28.6+0.955d lag 0.18` → `EXH_T=595+5.5d−IGV tuzatma lag 0.20`, `WHEEL=499.9+4d`, `CPR_P=1.30+0.012d`, `CPR_T=408.6+4.5d`, `IGV=82.6+0.4d`, `MVAR=4.3+0.08d`.
- TC (306–309): `TC = baza + d*5.5 + nz(0.7)` — EXH_T dan MUSTAQIL (nomuvofiqlik manbai!). `tcFollow()` (162–168) faqat trip/coast/recovering da: `TC = EXH_T + (baza−595)`.
- Coast (172–208): trip −180 rpm/−8°C/−3%FFD/−1.2MW per tick (~30s); STOP −150/−6/−2.5/−1.0. `coastPhysics(k=SPEED/7280)`: HZ=50k, KV=10.92*min(1,1.15k), MVAR=4.3k, EXC, CPR.
- Recovering (103–133): +180/+8/+3.0/+1.2 per tick, TC +8 gacha bazagacha.
- Startup `runStartupSeq` (530–620): Crank 0→700 (2.2s) → Purge → Firing EXH=280 → Warming →4800 (EXH 280→460) → Accel →7280 (EXH 460→595, IGV 34→64) → Loading POWER 0→12 → Base Load. `setInterval 100ms + setTimeout` zanjiri.
- Trip chegaralar: VIB≥155um 6 tick (39VTX); EXH≥REF+22 6 tick (66TXT); P1≤2.38 30 tick (63FGLT); LO<0.059 SPEED>500 (63QTX).
- XATOLAR (2-bosqichga): `GEN_PF=0.99` qo'lda (330); `SPREAD_1/2` konstanta+nz (324); `EXH_REF_T` lag bilan suzuvchi (244) — trip chegarasi ham suzadi; `GEN_KV=10.92+nz` — sync'dan mustaqil; `ready` lampasi faqat `brk52G && !tripped` (stateColor 521) — Δf/ΔV/Δφ tekshiruvi YO'Q; `release52G` faqat SPEED>7000 (475); 84R/84I indikatorlari umuman YO'Q (stateColor sync1..4 faqat running/field/KV/brk); PF formulasi YO'Q; CT001..18 taglari TC dan alohida statik nusxa (datarep) — bitta manba emas.

### KU (`D:\qozon\simulyatsiya\index.html:138–234`, `setInterval 500ms`)
- Klapan integratori: `pct += sign*min(|d|,7)`; `openFeed=(v61+v63)/200`.
- `heatK = h25run&&!trip ? 0.55+0.45*(power/28.6) : 0.25` (tripda 0.2).
- `targetFeed=120*openFeed*(1−0.004*(p−31.77))*(0.7+0.3*wE61/50)`; tripda ×0.15; `feed += (t−feed)*0.22`.
- `targetSteam=(40*heatK+12)+openFeed*8+(p−31.77)*6+(v32/100)*4`; `steam += ...*0.18`; manfiyga `Math.max(0)` bor.
- `level += ((feed−steam−blow)*0.55*0.6)*0.12` — shrink/swell YO'Q; `Q=Cv·f·sqrt(dP/ρ)` YO'Q (chiziqli %).
- `p += ((feed*0.55−steam*0.58)*0.004 − level*0.0002)`; clamp 28–35.
- Haroratlar lag 0.06–0.08 bilan `exhT` ga bog'langan (tSHt=340+(exhT−450)*0.28+...). H→KU issiqlik balansi `Q=m·cp·ΔT=m_steam·Δh` YO'Q — empirik koeffitsientlar.
- 3 sath datchigi: `l001=level+3.5, l002=level−22.2, l003=level+0.9` — statik offset, median/2oo3 selektor YO'Q (`median3()` funksiyasi bor (162) lekin HECH QAYERDA chaqirilmaydi — o'lik kod).
- Baraban T: `t1..t4 ≈ 195–201+load*22–23` — `T_sat(P)` EMAS. Ekonomayzer `<T_sat` tekshiruvi YO'Q.
- Manfiy kimyo: `c1=−0.6, c3=−0.2, c7=−0.0 µS/cm` HARDCODE manfiy (211–212) — `Math.max(0)` YO'Q.
- Priborlar har tick `rnd()` chaqiradi (177,183,185–200,211–212) — har kadr shovqin.

## 4. Math.random ishlatilgan joylar

- H25 `js/engine.js:216` — `nz(a)=(Math.random()*2−1)*a`. Chaқырувлар: 250,268,272–273,278–279,292–293,306–308,323–324,327–331 (FOFFD±0.12, POWER±0.04, EXH±0.7, TC±0.7, VIB±0.25, KV±0.008, HZ±0.015...). Har 500ms tick'da YANGI tasodif — talab (≤0.3°C past-chastotali, kadrda yangi random yo'q) BUZILGAN. `tags.js nz` maydoni o'lik (hamma 0, engine ichidagi `nz()` ishlatiladi).
- KU `index.html:143` — `rnd(n)=(Math.random()−0.5)*n`; 177,183,185–189,192,194–200,204–212,220–228 (feed/steam/level/p/T/kimyo). Har tick yangi.
- deploy nusxalarda xuddi shu.

## 5. setInterval / requestAnimationFrame

- `requestAnimationFrame` — HECH QAYERDA YO'Q (H25 ham, KU ham).
- H25: `engine.js:738 startLoop setInterval(tick,500)` — yagona tick; `runStartupSeq` ichida `setInterval 100ms` (567,582,594,608 — har stepda qayta, `_startTimer` bilan) + `setTimeout` zanjir (573,578,590,603,614,617 — 1.8–2.8s), `press STOP 2500ms` (454). `unit20-link.js:29 setInterval(readKU,2000)`. `app.js:31 setTimeout(fitStage,300)`, `593 setTimeout(runSelfTest,500)`.
- KU: `148 setInterval(h25_live o'qish,1200)`, `149 H25 TEST sinusi setInterval 1000`, `163 asosiy setInterval(...,500)` — bitta katta anonim fizika+chizish. `performance.now()/dt/accumulator` YO'Q — fon tabda sekinlaydi (throttle).
- Oqibat: tab yashirilganda `setInterval` 1/s gacha tushadi → fizika sekinlaydi; "yetib olish" YO'Q; sim-core/worker YO'Q; konstantalar tarqoq (sehrli sonlar engine ichida).

## 6. Tasdiqlangan aniq xatolar ro'yxati (2-bosqichga kiradi)

1. EXH polar: `r=(v−200)/600*R` (app.js:279) — talab `clamp(T,0,800)/800*R` emas; halqa shkalasi 200/400/600/800 ga mos emas; markaz STAGE (375,468) vs fon halqa markazi ~20px o'ng + ~55px yuqori (foydalanuvchi o'lchovi) — bitta SVG/canvas ga o'tkazish kerak. CT001 tepada emas (TC hujayralar burchakda, polar burchagi −90+(i−1)*20 — hujayra joylashuvi spok ustida emas).
2. Flame-off/on dinamikasi yo'q: trip/coast chiziqli −8/tick (tez, ~minut), 10+ daqiqali ikki eksponensial (gaz tez + metall sekin) YO'Q; ignition sakrash (EXH=280 birdan).
3. TC modeli: tau 3–8s birinchi tartibli kechikish YO'Q (bir tick'da baza+d*5.5 ga sakraydi); bias doimiy emas (nz har tick); shovqin ±0.7 (talab ≤0.3).
4. EXH_T/SPREAD panellari TC dan hisoblanmaydi: EXH_T alohida lag (276), SPREAD konstanta (324) — o'rtacha 600.7 vs panel 594.9, max-min 31.5 vs 32.3 nomuvofiqlik shu.
5. `.ov` ikki span (qiymat+birlik) fon statik matn ustiga → "612.2 degC C" effekti; `fields.json` yo'q; `?debug=1` maydon-chegara/to'r/kesishuv tekshirmaydi.
6. "SYNCHRO READY" (1016,90,58x19) + "RELEASE" (1018,116,56x33) — fon tugma shakli bilan uchlik ustma-ust.
7. "Filed Switch" — fon rasmi ichida (kodda yo'q).
8. 84R/84I, sync-check (Δf/ΔV/Δφ), PF formulasi, AVR→Q bog'liqligi — yo'q.
9. KU: manfiy c1/c3/c7; T≠T_sat; selektor o'lik; massa balansida shrink/swell va Cv·sqrt yo'q; H→KU energiya balansi empirik.
10. Arxitektura: sim-core/config/worker yo'q; dt haqiqiy emas (500ms taxmin); accumulator yo'q; H25↔KU faqat soft-link.

## 7. Savollar (taxmin qilinmadi — TODO, 3-bosqichdan oldin javob kerak)

- Q1: EXH spread original logikasi: SPREAD_1/#2/#3 ning rasmiy ta'rifi (qaysi TC guruhlari, median/mean, max-min?) va ALLOW_SPREAD jadvali (yuklama/rejimga bog'liqligi)?
- Q2: Sync-check chegaralari (Δf Hz, ΔV kV/%, Δφ deg) va 84R/84I pick-up/drop-out (0.9–1.1 pu ichida aniq polosalar)?
- Q3: H255672 TC tau/bias kalibrlash: har TC uchun rasmiy tau (3–8s ichida) va bias jadvali bormi yoki o'lchangan spread'dan hosil qilaymi?
- Q4: KU `T_sat(P)` uchun IAPWS-IF97 to'liqmi yoki 28–35 bar g jadval yetadimi? Shrink/swell koeffitsienti va klapan Cv xarakteristikalari (V v32/v33/v61/v63, W ...) bormi?
- Q5: `deploy_unit20/` nusxani ham tuzataymi yoki u muzlatilgan reliz (faqat asosiy `js/` + `D:\qozon`)?
