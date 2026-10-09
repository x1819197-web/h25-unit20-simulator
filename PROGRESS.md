# H25 SCADA Simulator — PROGRESS (session handoff)

Date: 2026-10-01. Project: `C:\Users\X\h25-scada-simulator` (open `index.html`).
Offline desktop app: `dist/H25-Simulator.exe` (pywebview window, no net needed).
Goal: 1:1 browser replica of DIASYS Netmation H25 UNIT-20 (19 screens).
Architecture: reference PNG as pixel-exact background (`ref/`) + live overlays
(values/buttons/lamps/symbols) positioned from pixel measurements.

## Finished screens (ALL 19 verified 1:1 via headless-Chrome screenshots 2026-10-01)
- 1 START-UP (`startup.js`, 50 values + 39 buttons) — full control set works.
- 2 FFD CONTROL (`ffd.js`) — top mimic + 8 FFD bars (0–127 scale) + DROOP/LLM.
- 3 SYNCHRO & EXC OPE (`synchro.js`) — 52G/41 syms, AVR/AER, PSS, V/I RAISE/LOWER,
  43-25L/G (OFF/AUTO), 43-OPE (TCP-HMI), RELEASE, 4 status lamps, READY lamp.
- 4 FUEL GAS (`fuelgas.js`) — values only + RESET/TRIP.
- 5 LUBE OIL (`lubeoil.js`) — values + 7 motor/pump symbols (MOP#1 red run,
  MOP#2/EOP green, HOP#1 green, HOP#2 red, mist green/red) + double TRIP.
- 6 GENERATOR (`generator.js`) — values + GFC#1 red/#2 green/#3 red fans,
  41/52G CLOSE syms. NOTE: no JOP symbols exist on this screen (label only).
- 7 VENTILATION (`vent.js`) — values + evac/vent#1/#2/bearing#1/#2 fan symbols.
- 8 IBH CONTROL (`ibh.js`) — values + IBH LOCKOUT lamp + Release button.
- 9 MOTORS (`motors.js`, 85 mcells) — full matrix, START/STOP/AUTO/MANUAL work,
  standby cascade (mop1→mop2, hop2→hop1, mist2→mist1, gfc1&3→gfc2).
- 10 BEARING OIL (`bearing.js`) — top mimic + 12 bar value cells.
- 11 EXHAUST (`exhaust.js`) — 18 TC cells (verified mapping!) + live cyan polar
  polygon (canvas) + Turbine/Combustion panels. TC06 cell is outline-style
  (gray fill `rgb(160,160,160)`), all others solid white.
- 12 VIBRATION (`vib.js`) — top mimic + 18 bar value cells.
- 13 WHEEL SPACE (`wheel.js`) — top mimic + 12 stage cells.
  NAV LABEL EXCEPTION: Group-B screens use "WHEELSPACE" (no space), screen 1
  uses "WHEEL SPACE". Handled via `H25_NAV_ALIAS` in app.js.

## Finished 2026-10-01 (v24, all screenshot-verified)
- 14 START CHECK: re-measured (cols x76/410/745, 35 rows, 9 headers);
  ready/buttons at bottom (803/933/1039, y493-495). Screenshot 1:1.
- 15 TIMERS: date/time cells fixed (842/964, y427); MASTER/TRIP y466-467.
- 16 TRIP MONITOR: verified (31 items, all green at rest).
- 17 DATA REPORT 1, 18 DATA REPORT 2: tables re-measured
  (x76/338/602/864, y10, w234, rh18.3); screenshots 1:1.
- 19 OVERSPEED: OS values (x446), ENABLE/DISABLE (x637),
  Main/Backup START/ABORT (x575/648), RAISE/LOWER (x492),
  osbar (866,274,176x160); overlay now draws ONLY live speed needle
  (ref scale/labels show through, no double-vision). Screenshot 1:1.
- Selftest: 7/7 PASS. All 19 screens: 0 unfilled tags.

## Finished 2026-10-01 (v27: exhaust single-line + real-time feel)
- EXHAUST double cyan fixed: static ref polygon erased from
  `ref/11_exhaust.png` (534 core + 1297 antialiased edge px -> plot gray;
  grid preserved, verified 0 teal px remain). Canvas now draws ONE live
  polygon + 3-frame fading trail (jonli + iz). `masterReset` clears trail.
- Real-time feel: per-tick sensor noise (no drift) on POWER/FOFFD/IGV/
  EXH_T/TCs/VIB/pressures/flow/SPEED/KV/HZ; trip/STOP coast slowed
  (~30 s, STOP coasts even without trip); `runStartupSeq` ramps
  (Crank 0->700, Firing EXH 280, Warming ->4800, Accel ->7280, Loading
  POWER 0->12). Page bg #000 (letterbox blends). `?v=27`.

## Finished 2026-10-01 (v29: true fill-screen)
- `fitStage` now stretch-fills the whole browser window (scaleX/scaleY,
  zero bars on any window size; zero distortion on 16:9). Verified at
  1000x700 (edge-to-edge) and 1280x720 (pixel-exact).
- Visible `TO'LIQ EKRAN` button (viewport corner, outside 1:1 HMI) +
  F key + double-click toggle Fullscreen API; button shows CHIQISH in
  fullscreen. Selftest still 7/7 PASS. `?v=29`.

## Finished 2026-10-01 (v28: fullscreen + burner-follow)
- Fullscreen: `F` key or double-click empty stage toggles Fullscreen API;
  `?fullscreen=1` enters fullscreen on first click; `launcher.py` now
  opens `--start-maximized` (was fixed 1320x780). `fitStage` refits on
  fullscreenchange. Selftest still 7/7 PASS. `?v=28`.
- Burner follow: new `tcFollow()` — every TC keeps its spread offset from
  live EXH_T, so polar polygon breathes with flame (past olov -> kichik,
  baland olov -> katta va stabil). Wired into trip/coast ticks and
  startup intervals (cold start TCs at ambient ~25, tiny polygon).
- New MENU screen (`js/screens/menu.js`, bg:null -> clean panel): all 19
  screens as GOTO buttons + live GEN_POWER/SPEED/FOFFD. `renderOverlay`
  supports `data-to`, `wireOverlay` handles `act:"goto"` -> `loadScreen`.
- Every screen's sidebar MENU zone now opens the menu (`buildZones` maps
  MENU -> `menu`); previously MENU did nothing. START-UP keeps its 19 zones.
  Whole simulator = one program, everything reachable: any screen -> MENU
  -> any screen. Screenshot-verified (`tmp/shot_menu.png`).

## File structure
- `index.html` — stage + script includes (**bump `?v=N` after every JS edit**).
- `css/diasys.css` — overlay widgets: `.ov` `.obtn(.orange/.clear)` `.fbar`
  `.olamp` `.osym` `.olamptext` `.omotor` `.opump` `.mcell` `.scrow` `.ozone`.
- `js/tags.js` — central tag DB: `H25_TAGDEF(v, unit, dp, noise, min, max)`.
  ALL noise = 0 (values rock-stable at ref points; user requirement).
  `RST_DATE`/`RST_TIME` are plain strings (engine `init`/`push` handle strings).
- `js/engine.js` — 500 ms tick. Exact base-load hold + deterministic deltas
  (`d = LOAD_SET - 30`). State machine (startup seq, STOP→coast, TRIP→coast).
  `H25.motors[id] = {run, auto, standby, stopLatch[, startGray]}`.
  `trip(cause, item)` sets `tripItems[item]`; `masterReset()` clears + stamps
  `lastReset`. Counters: MWH/EOH/AOH integrate; START→bumpStarts;
  TRIP→ET counters+1; `counterReset()` zeroes elapsed + stamps date/time.
- `js/app.js` — `renderOverlay` (values/buttons/bars/lamps/syms/lamptexts/
  motors/pumps/mcells/polar/scrows/tripitems), `wireOverlay` (acts: press,
  raise/lower, vraise/vlower/iraise/ilower, trip, reset, countreset, release,
  close41/open41, ibhrelease, edit-load, ffd), `refreshButtons`,
  `refreshCustom` (lamps/syms/mcells/motor symbols/scrows/tripitems),
  `buildZones` (per-screen `navList`), `updateFbars`, `updatePolar`,
  `H25_NAV_ALIAS`. URL params: `?screen=ID`, `?dbg=1` (red nav outlines),
  `?selftest=1`.
- `js/screens/*.js` — one screen definition each (data tables + render).
- `js/selftest.js` — headless self-test (`--dump-dom`, grep `selftest-result`).
- `ref/01..19_*.png` — reference backgrounds (copied from Downloads ZIP).
- `tmp/` — gitignored; screenshots (`shotN.png`, `z_*.png`) + Chrome profile
  `tmp/prof1`. `.gitignore` covers `tmp/`.

## Tag names in tags.js (groups)
- Header: GEN_POWER, FOFFD, IGV_POS, IBH_POS
- Fuel: FUEL_GAS_T, FUEL_GAS_P, SRV_POS, F1_GCV, F2_1..4_GCV, ALLOW_SPREAD,
  SPREAD_1/2, FUEL_FLOW, P1_PRESS, P2_PRESS, FG_CT, F20RATIO
- Vibration: VIB_2BX/2BY/1BX/1BY/EEBX/EEBY/TEBX/TEBY, RG4X/RG4Y/RG3X/RG3Y/
  RG2X/RG2Y/RG1X/RG1Y, THR1/THR2
- Generator: GEN_KV/A/MVAR/PF/HZ/MWH, EXC_V/A, MW_REF/MW_FDBK, LOAD_SET,
  SPEED_REF, FFD_MIN/SU/ACC/SPD/LLM/TEMP/SD
- Turbine: SPEED, SPEED_PCT, CPR_IN_T, CPR_OUT_P/T, EXH_T, EXH_REF_T,
  EXH_SPREAD_3, TC01..TC18, KC1L/KD1H/KC2L/KD2H/KC3L/KD3H/KC4L/KD4H,
  PURGE_FINAL/CURRENT, WHEEL_MAX_T, INLET_AIR_T, AMB_T, INLET_T1/T2,
  SC_FILT_DP, HEPA_DP, TURB_COMPT_T, INNER_BARREL_T
- Oil: LUBE_HDR_T, LO_HDR_P/P2, LO_FILT_DP, HYD_OIL_P, MOP_DISCH,
  DRN_GEN_TE/EE, DRN_THRUST, DRN_GT2/GT1, DRN_RG_A/B/C/D, LO_TANK_T/LVL,
  LO_HA/HB/HC, BRG_EE/TE
- Generator aux: CLR_OUT_T, CLR_IN_T, COLD_AIR_T1/T2, WARM_AIR_T, MET_EE/TE,
  STATOR_A/B/C, JACK_P
- IBH: IBH_OUT_T/P, IBH_IN_P, IBH_REF/FDBK
- Wheelspace: WS1A-D, WS2A-D, WS3A-D
- Timers: EOH_L/R, AOH_L/R, GAS_L/R, FS_N/R, ET_NT/R, TOT_ST/R, TOT_ET/R,
  RST_DATE, RST_TIME (strings)

## Measurement helpers (python scripts in `C:\Users\X\AppData\Local\Temp\opencode\`)
- `detect_any.py <ref.png>` — white (W) + orange (O) connected components
  (BFS, 4-connectivity). White: r,g,b>225. Orange: r>200,110<g<195,b<90.
- `sliceprof.py / rowscan.py / colscan.py` — row/column color profiles.
- `grid09.py`, `col09.py`, `btnprof.py`, `edges.py`, `panels.py` — button/panel
  geometry (screen 9: use color-fill detection + crops, NOT 1px scans for
  outlined circles with letters).
- `polar.py`, `barmeas*.py`, `s41*.py`, `g52.py`, `brk06.py`, `gfc1.py`,
  `jop*.py`, `mopcol.py`, `mcols.py`, `mcol2.py`, `mv*.py`, `refmop.py`,
  `evacx.py`, `rtreset*.py`, `rt0*.py`, `m06.py`, `m1416.py`, `m14b.py`,
  `m1516.py`, `m15b.py`, `dtbox*.py`, `lampmeas.py`, `samp*.py`, `col*.py`
- `gen*.py` — screen generators (data uses STAGE coords; y-170 applied on
  emit for `#page` items). `z*.py` — crop helpers (always verify crops
  programmatically, never trust display-scale eyeballing).
- `patch*.py / fix*.py / ghost.py / motmerge.py / tcmerge.py / tcmap*.py /
  tccells.py / fillratio.py / pdiff.py / barcmp.py / ver.py` — one-off
  transforms. `ver.py N` bumps `?v=N` in index.html.

## Coordinate conventions (CRITICAL)
- Refs are 1280×720. `#page` overlay origin = stage (0,170), size 1108×506.
- Screen defs store PAGE coords (= stage_y − 170). Generator scripts take
  STAGE measurements and subtract 170 on emit. Nav zones + header KPIs use
  STAGE coords. Blue title bar bottom ≈ y170.
- Nav zones: x1115 w160, top = 177 + i×21.5, h20. Group A = 10 items,
  Group B = 6, Group C = 7, screen 1 = 19 (H25_NAV_ALL).
- Header KPIs: x1192 w80, tops 55/66/78/89 (dark bg #0B1E10, white mono).
- Chrome: `--headless --disable-gpu --user-data-dir=tmp/prof1
  --window-size=1280,720 --screenshot=tmp/shotN.png --virtual-time-budget=3000
  "file:///C:/Users/X/h25-scada-simulator/index.html?screen=ID"`.
  ALWAYS bump `?v=` (ver.py) before re-screenshotting edited JS (file:// cache).

## Known diffs / gotchas still open
- 15 date/time cells: run patch15.py + regen + verify.
- 14/16: verify screenshots (16 never rendered yet).
- MWH/EOH/AOH counters grow live (by design, spec-consistent).
- Exhaust polar: canvas stroke vs ref antialiasing may differ ≤1px.
- TC06 gray box fill `rgb(160,160,160)` — nudge if edge visible.
- Screen 5: tiny white cell (144,503) left static (unidentified, likely graphic).
- Screen 9: heaters + cranking tiles fully static (no buttons in ref — correct).
- Motor green `rgb(42,159,42)` / red `rgb(250,0,0)`; lamp green `rgb(0,200,0)`,
  lamp red `rgb(255,0,0)`; button orange `rgb(251,165,0)`; FFD bars navy
  `rgb(0,0,122)` with 0–127 scale (`ffdFillTop(v) = 647 − v/127×184`).
- Exhaust polar geometry: center stage (380,420), R=195, r(v)=195×(v−200)/600,
  angle(N) = −90° + (N−1)×20°, cyan `rgb(60,234,232)`.
- F&G annunciator + date/time + taskbar are static ref pixels (by design).
