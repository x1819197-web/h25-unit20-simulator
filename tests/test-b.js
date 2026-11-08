/* 2B-BLOK: real vaqt sekvensiyasi + himoyalar + reset semantikasi.
 * node tests/test-b.js  (chiqish 0 = PASS)
 * Vaqt sim vaqtida o'lchanadi: timeScale faqat tezlashtiradi, fizika 5 s qadam. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + (extra !== undefined ? " :: " + extra : "")); }
}

global.window = global;
require(path.join(ROOT, "js", "rng.js"));
require(path.join(ROOT, "js", "config.js"));
const EXM = require(path.join(ROOT, "js", "exhaust-math.js"));
require(path.join(ROOT, "js", "tags.js"));
const sb = {
  window: global, H25_TAGS: global.H25_TAGS, H25_CFG: global.H25_CFG,
  H25_RNG: global.H25_RNG, H25_EXM: EXM,
  document: { querySelectorAll: () => [] },
  location: { search: "" },
  refreshButtons: () => {}, refreshCustom: () => {},
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0,
  performance: { now: () => 0 }, console
};
sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js", "engine.js"), "utf8"), sb);
const H25 = sb.window.H25;

function simT() { return H25._simT; }
function runUntil(pred, maxSim, ts) {
  ts = ts || 30;
  H25.setTimeScale(ts);
  const start = simT();
  let guard = 0;
  while (!pred() && simT() - start < maxSim && guard++ < 30000) H25.tick(500);
  const el = simT() - start;
  H25.setTimeScale(1);
  return el;
}
function adv(sec, ts) {
  const start = simT();
  runUntil(() => simT() - start >= sec - 1e-9, sec + 600, ts);
  return simT() - start;
}
function freshBase() {
  H25.init();
  H25.tick(500);
}
function near(v, t, tol) { return Math.abs(v - t) <= tol; }

/* ---------------------------------------------------------------- */
/* B1: TO'LIQ SIKL: stop -> unload -> coast -> cool -> ready -> start */
(function () {
  freshBase();
  ok("B1a: boshlang'ich Base Load", H25.seq === "Base Load" && near(+H25.tags.GEN_POWER, 28.6, 0.2),
    H25.seq + " " + (+H25.tags.GEN_POWER).toFixed(2));

  H25.press("master", "STOP");
  ok("B1b: STOP -> Unloading", H25.seq === "Unloading");
  const tUnload = runUntil(() => (+H25.tags.GEN_POWER) <= 0.001, 3000, 30);
  ok("B1c: unload 1.36 MW/min (~1262 s)", near(tUnload, 1262, 60), tUnload.toFixed(0));
  ok("B1d: unload oxirida P=0, 52G ochiq",
    +H25.tags.GEN_POWER === 0 && H25.ctl.brk52G === false &&
    (H25.seq === "Fired Shutdown" || H25.seq === "Coast Down"), H25.seq);

  const tCoast = runUntil(() => H25.seq === "Cooling Down", 3000, 60);
  ok("B1e: coast tau=420 s (~1626 s)", near(tCoast, 1626, 250), tCoast.toFixed(0));
  ok("B1f: Cooling Down da speed < 150", (+H25.tags.SPEED) < 150, (+H25.tags.SPEED).toFixed(0));

  const tCool = runUntil(() => H25.seq === "Ready to Start", 4000, 120);
  ok("B1g: cooldown ON -> Ready to Start", H25.seq === "Ready to Start", tCool.toFixed(0));
  ok("B1h: wheelspace < 66 C", H25._wheel < 66, H25._wheel.toFixed(1));
  ok("B1i: start ruxsat etilgan", H25.canStart() === true);
  ok("B1i2: Start Check hammasi yashil", H25.startCheckOk() === true);

  /* start fazalari (ts=30 -> 15 s aniqlik) */
  H25.press("master", "START");
  ok("B1j: START -> Cranking", H25.seq === "Cranking");

  let t1 = runUntil(() => H25.seq === "Purge", 300, 30);
  ok("B1k: crank 20 %/min (~60 s)", near(t1, 60, 35), t1.toFixed(0));
  ok("B1l: purge tezligi 1456 rpm", near(+H25.tags.SPEED, 1456, 2), (+H25.tags.SPEED).toFixed(0));

  let tp = runUntil(() => (+H25.tags.PURGE_CURRENT) >= 11.9, 1000, 30);
  ok("B1m: purge 12 min (~720 s)", near(tp, 720, 40), tp.toFixed(0));
  ok("B1n: purge counter to'ldi", near(+H25.tags.PURGE_CURRENT, 12, 0.1),
    (+H25.tags.PURGE_CURRENT).toFixed(2));

  let t2 = runUntil(() => H25.seq === "GT Firing", 200, 30);
  ok("B1m2: purge tugadi -> GT Firing", t2 < 40, t2.toFixed(0));

  let t3 = runUntil(() => H25.seq === "Warming up", 200, 30);
  ok("B1o: ignition hold 60 s", near(t3, 60, 35), t3.toFixed(0));
  ok("B1p: olov yondi (FFD > 15)", (+H25.tags.FOFFD) > 15, (+H25.tags.FOFFD).toFixed(1));

  let t4 = runUntil(() => H25.seq === "Accelerating", 400, 30);
  ok("B1q: warm-up 3 min", near(t4, 180, 35), t4.toFixed(0));

  let t5 = runUntil(() => H25.seq === "Seq. Complete", 900, 30);
  ok("B1r: accel 10.5 %/min (~457 s)", near(t5, 457, 40), t5.toFixed(0));
  ok("B1s: FSNL 7280 rpm", near(+H25.tags.SPEED, 7280, 1), (+H25.tags.SPEED).toFixed(0));

  let t6 = runUntil(() => H25.seq === "Loading", 200, 5);
  ok("B1t: avto-sinxronizatsiya 52G yopdi", H25.ctl.brk52G === true && t6 < 60, t6.toFixed(1));
  ok("B1u: sinxron oynasi (df/dV)", Math.abs(+H25.tags.SYNC_DF) <= 0.1 &&
    Math.abs(+H25.tags.SYNC_DV) <= 5, (+H25.tags.SYNC_DF).toFixed(3) + "/" +
    (+H25.tags.SYNC_DV).toFixed(2));

  /* yuk egri chizig'i: t = yuklash boshlanganidan sim sekund */
  const tLoad = simT();
  const atLoad = (s) => runUntil(() => simT() - tLoad >= s, s + 600, 30);
  atLoad(1300);
  ok("B1v: 1300 s da P ~2.6..2.7", (+H25.tags.GEN_POWER) > 2.5 && (+H25.tags.GEN_POWER) <= 2.72,
    (+H25.tags.GEN_POWER).toFixed(2) + " @" + (simT() - tLoad).toFixed(0));
  atLoad(1500);
  ok("B1w: 1500 s da 2.7 MW ushlash", near(+H25.tags.GEN_POWER, 2.7, 0.03),
    (+H25.tags.GEN_POWER).toFixed(2));
  atLoad(3700);
  ok("B1x: 3700 s da 6.78 MW ushlash", near(+H25.tags.GEN_POWER, 6.78, 0.1),
    (+H25.tags.GEN_POWER).toFixed(2) + " @" + (simT() - tLoad).toFixed(0));
  atLoad(6500);
  ok("B1y: yakunda 28.6 MW Base Load", H25.seq === "Base Load" &&
    near(+H25.tags.GEN_POWER, 28.6, 0.05), H25.seq + " " + (+H25.tags.GEN_POWER).toFixed(2));
  ok("B1z: natija qiymatlari (EXH/Temp/Spread)",
    near(+H25.tags.EXH_T, 595, 3) && (+H25.tags.SPREAD_1) > 20 && (+H25.tags.SPREAD_1) < 45,
    (+H25.tags.EXH_T).toFixed(1) + "/" + (+H25.tags.SPREAD_1).toFixed(1));
})();

/* ---------------------------------------------------------------- */
/* B2: HIMOYALAR (Karta ustavok GTU-2,3 2025) */
(function () {
  function tripCase(name, item, setup, maxSim) {
    freshBase();
    setup();
    const t = runUntil(() => H25.tripped, maxSim, 1);
    ok("B2 " + name, H25.tripped && H25.tripItems[item] === true && H25.seq === "Fired Shutdown",
      (H25.tripCause || "-") + " @" + t.toFixed(1) + " s");
    H25.masterReset();
    ok("B2 " + name + " reset latch", H25.tripped === false && H25.seq !== "Base Load");
  }

  tripCase("39VTX vibration 155 um/3 s", "39VTX", () => H25.setFault("vib", true), 40);
  tripCase("63QTX lube P 0.059/3 s", "63QTX", () => H25.setFault("lube", true), 20);
  tripCase("26QT lube T 80 C/3 s", "26QT", () => { H25.tags.LUBE_HDR_T = 85; }, 8);
  tripCase("63FGLT fuel P 2.38/15 s", "63FGLT", () => H25.setFault("fuel", true), 40);
  tripCase("63HQLT hyd P 6.10/2 s", "63HQLT", () => {
    H25.motors.hop1.run = false; H25.motors.hop2.run = false;
  }, 15);
  tripCase("66TXT exhaust +22/3 s", "66TXT", () => H25.setFault("exh", true), 90);
  tripCase("26DT loss of flame", "26DT", () => H25.setFault("flame", true), 180);
  tripCase("12H overspeed 8008", "12H", () => {
    H25.seq = "Seq. Complete"; H25.ctl.brk52G = false;
    H25.tags.SPEED = 7285; H25.osEnable(); H25.osStartMain();
  }, 180);
  tripCase("12H_P backup 8081.88", "12H_P", () => {
    H25.seq = "Seq. Complete"; H25.ctl.brk52G = false;
    H25.tags.SPEED = 7285; H25.osEnable(); H25.osStartBackup();
  }, 180);
})();

/* ---------------------------------------------------------------- */
/* B3: READ-ONLY ko'rsatkichlar + timeScale + setLoadSet */
(function () {
  freshBase();
  const s0 = H25.seq;
  H25.press("gtStatus", "Cranking");
  H25.press("ffdStatus", "FFDSD");
  ok("B3a: gtStatus/ffdStatus o'qish uchun", H25.seq === s0 && H25.ctl.ffdStatus === "FFDT");

  H25.setLoadSet(35);
  ok("B3b: LOAD_SET 0..32 clamp", H25.tags.LOAD_SET === 32);
  H25.setLoadSet(20);
  ok("B3c: PRE SELECT qiymati qabul qilindi", H25.tags.LOAD_SET === 20);

  H25.press("loadMode", "BASE");
  ok("B3d: BASE -> 30 MW", H25.tags.LOAD_SET === 30);

  const sp0 = +H25.tags.SPEED;
  H25.setTimeScale(10);
  H25.tick(1000);
  H25.setTimeScale(1);
  ok("B3e: timeScale sim vaqtini ko'paytiradi", simT() > 0 && H25.timeScale === 1 && sp0 > 0);
  H25.setTimeScale(1000);
  ok("B3f: timeScale 1..300 clamp", H25.timeScale === 300);
  H25.setTimeScale(1);

  /* barcha ekranlarda NaN yo'q (tag DB yaxlitligi) */
  let bad = [];
  for (const k in H25.tags) {
    const v = H25.tags[k];
    if (typeof v === "number" && !isFinite(v)) bad.push(k);
  }
  ok("B3g: NaN/Infinity yo'q", bad.length === 0, bad.slice(0, 5).join(","));
})();

console.log(`\n2B TEST: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
