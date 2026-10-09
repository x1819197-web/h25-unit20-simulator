# H25 Gas Turbine Generator — UNIT-20 | DIASYS Netmation SCADA Simulator

Browser-based, real-time 1:1 HMI replica of the Hitachi H25 gas turbine
generator SCADA system ("DIASYS Netmation [Operator]", UNIT-20).

Zero-dependency — open `index.html` in any modern browser.
Offline dastur: `dist/H25-Simulator.exe` ni ikki marta bosing — internet
shart emas, brauzer shart emas. O'z app-oynasida ochiladi (WebView2),
server avtomatik ko'tariladi, oyna yopilsa to'xtaydi.
Noutbukni ochdingiz → dasturga kirdingiz → simulyatsiyani ishlatdingiz.

## Ishga tushirish (3 usul)

1. EXE (tavsiya, offline): `dist/H25-Simulator.exe` — OCHISH (oddiy ekran) /
   TRENER (nosozlik paneli bilan). App-oyna maximized ochiladi; ichida
   F / double-click / TO'LIQ EKRAN tugmasi bilan fullscreen.
   WebView2 topilmasa avtomatik Chrome/Edge app-rejimiga o'tadi
   (baribir offline — faqat `127.0.0.1` server ishlatiladi).
2. Brauzer: `index.html` ni Chrome/Edge da oching.
3. Trener rejimi: `index.html?trainer=1` — pastda fault-injection paneli
   chiqadi (High vibration / Exhaust overtemp / Lube-oil leak / Fuel-gas low
   + Clear + Reset). Oldindan tanlash: `?fault=vib,exh,lube,fuel`.

## Structure

- `index.html` — global frame (menu, annunciator, nav, taskbar, 1280x720 stage)
- `css/diasys.css` — DIASYS classic styles
- `js/tags.js` — central tag database (every number on every screen)
- `js/engine.js` — simulation (500 ms tick, GT state machine, noise)
- `js/screens/*.js` — one file per screen (19 SCADA + MENU) + live buttons
- `js/app.js` — frame glue (scaler, clock, nav, button highlights, MENU unite)

## Screens (19)

START-UP (done) · FFD CONTROL · SYNCHRO & EXC OPE · FUEL GAS · LUBE OIL ·
GENERATOR · VENTILATION · IBH CONTROL · MOTORS · BEARING OIL · EXHAUST ·
VIBRATION · WHEEL SPACE · START CHECK · TIMERS · TRIP MONITOR ·
DATA REPORT 1 · DATA REPORT 2 · OVERSPEED
plus unified MENU (all screens in one list — every sidebar MENU opens it).

## Controls on START-UP

Master Control Location (REMOTE/LOCAL) · Cooldown Control (ON/OFF) ·
Master Control Mode (OFF/CRANK/FIRE/AUTO) · Master Control (START/STOP,
START runs the startup sequence) · Speed/Load Control (AUTO/MANUAL,
RAISE/LOWER jogs Load Set) · Load Control (BASE/PRE SELECT) ·
Load Set Value (click to edit, 0–32 MW) · MASTER RESET · TRIP.

## Avariya ssenariylari (trener)

- High vibration → VIB_2BX 155 um / 3 s da `39VTX` trip (TRIP MONITOR qizaradi).
- Exhaust overtemp → EXH_REF+22 °C da `66TXT` trip, 18 ta TC ko'tariladi.
- Lube-oil leak → LO_HDR_P 0.059 MPa da `63QTX` (LUBE OIL PRESS LOW) trip.
- Fuel-gas low → P1_PRESS 2.38 MPa / 15 s da `63FGLT` trip, quvvat tushadi.
- Manual TRIP (har ekranda) → `9EX`; Overspeed test (19-ekran) → `12H`/`12H_P`.
- MASTER RESET hamma trip + nosozlikni tozalaydi (Ready to Start).
