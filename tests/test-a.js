/* 2A-BLOK avtomatik testlar: node tests/test-a.js (chiqish 0 = PASS).
 * Tekshiradi: markaz, radius, Temp/Spread TC dan, TC dinamika, Math.random yo'q. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? " :: " + extra : "")); }
}

/* ---- T1: Math.random ishlatilmasin (js/ ichida) ---- */
(function () {
  const bad = [];
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { if (f.name !== "node_modules") walk(p); continue; }
      if (!p.endsWith(".js")) continue;
      let s = fs.readFileSync(p, "utf8");
      s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, ""); // izohlarsiz
      if (/Math\s*\.\s*random\s*\(/.test(s)) bad.push(path.relative(ROOT, p));
    }
  }
  walk(path.join(ROOT, "js"));
  ok("T1: Math.random yo'q (js/)", bad.length === 0, bad.join(","));
})();

/* ---- sandbox: config+rng+math+tags+engine ---- */
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

/* ---- T2: poligon markazi = halqalar markazi (piksel aniq) ---- */
(function () {
  const src = fs.readFileSync(path.join(ROOT, "js", "screens", "exhaust.js"), "utf8");
  const m = src.match(/polar:\s*\{x:(\d+),\s*y:(\d+),\s*size:(\d+),\s*c:(\d+),\s*r:(\d+)\}/);
  ok("T2a: polar geometriya topildi", !!m);
  if (m) {
    const x = +m[1], y = +m[2], c = +m[4], r = +m[5];
    const P = global.H25_CFG.PLOT;
    ok("T2b: markaz x (canvas+c == halqa)", x + c === P.cxPage, `${x}+${c}=${x + c} vs ${P.cxPage}`);
    ok("T2c: markaz y (canvas+c == halqa)", y + c === P.cyPage, `${y}+${c}=${y + c} vs ${P.cyPage}`);
    ok("T2d: radius == tashqi halqa R", r === P.R, `${r} vs ${P.R}`);
  }
})();

/* ---- T3: radius formulasi ---- */
(function () {
  const R = 184;
  ok("T3a: T=800 -> R", EXM.polarR(800, R) === R);
  ok("T3b: T=400 -> R/2", Math.abs(EXM.polarR(400, R) - R / 2) < 1e-9);
  ok("T3c: T<0 clamp 0", EXM.polarR(-50, R) === 0);
  ok("T3d: T>800 clamp R", EXM.polarR(900, R) === R);
  const p1 = EXM.polarXY(1, 800, 205, R); // CT001 tepada
  ok("T3e: CT001 tepada (0 deg)", Math.abs(p1[0] - 205) < 1e-9 && p1[1] < 205, p1.join(","));
  const p2 = EXM.polarXY(2, 800, 205, R); // +20 deg soat strelkasi
  ok("T3f: CT002 +20 deg (o'ngda)", p2[0] > 205 && p2[1] < 205, p2.join(","));
})();

/* ---- T4: Temp/Spread faqat TC dan ---- */
(function () {
  const tcs = [616.6, 599.0, 605.0, 595.1, 599.0, 584.7, 591.9, 607.1, 584.9,
    616.2, 590.6, 605.2, 602.0, 606.9, 599.6, 602.4, 611.8, 592.2];
  const mean = tcs.reduce((a, b) => a + b, 0) / 18;
  ok("T4a: Temp = o'rtacha", Math.abs(EXM.exTempMean(tcs) - mean) < 1e-9, mean.toFixed(3));
  const sp = EXM.exSpreads(tcs);
  const s = tcs.slice().sort((a, b) => a - b);
  ok("T4b: S1 = max-min", Math.abs(sp.s1 - (s[17] - s[0])) < 1e-9, sp.s1.toFixed(2));
  ok("T4c: S2 = max-2chi", Math.abs(sp.s2 - (s[17] - s[1])) < 1e-9, sp.s2.toFixed(2));
  ok("T4d: S3 = max-3chi", Math.abs(sp.s3 - (s[17] - s[2])) < 1e-9, sp.s3.toFixed(2));
  ok("T4e: kamayuvchi S1>=S2>=S3", sp.s1 >= sp.s2 && sp.s2 >= sp.s3,
    [sp.s1, sp.s2, sp.s3].map(v => v.toFixed(1)).join("/"));
  ok("T4f: ALLOW bazada ~90", Math.abs(EXM.allowSpread(28.6) - 90) < 0.01,
    EXM.allowSpread(28.6).toFixed(2));
})();

/* ---- T5: TC run yaqinlashuvi (tau=4 s -> 4 s da ~63%) ---- */
(function () {
  const C = global.H25_CFG.TC;
  let r = EXM.tcStep(25, 25, 600, C.tauRun, C.tauMetalRun, 4.0, C.metalW);
  const frac = (r[0] - 25) / (600 - 25);
  ok("T5: gaz 4 s da ~63%", Math.abs(frac - 0.632) < 0.02, frac.toFixed(3));
})();

/* ---- T6: engine barqaror rejimda Temp/Spread mosligi ---- */
(function () {
  H25.init();
  for (let i = 0; i < 40; i++) H25.tick(500); // 20 s
  const tcs = [];
  for (let i = 1; i <= 18; i++) tcs.push(H25.tags[H25.tcTag(i)]);
  const mean = tcs.reduce((a, b) => a + b, 0) / 18;
  ok("T6a: EXH_T == TC o'rtachasi", Math.abs(H25.tags.EXH_T - mean) < 0.01,
    `${H25.tags.EXH_T.toFixed(2)} vs ${mean.toFixed(2)}`);
  const s = tcs.slice().sort((a, b) => a - b);
  ok("T6b: SPREAD_1 == max-min", Math.abs(H25.tags.SPREAD_1 - (s[17] - s[0])) < 0.01,
    H25.tags.SPREAD_1.toFixed(2));
  ok("T6c: SPREAD_3 == max-3chi", Math.abs(H25.tags.SPREAD_3 - (s[17] - s[2])) < 0.01,
    H25.tags.SPREAD_3.toFixed(2));
  const mx = Math.max(...tcs.map(v => Math.abs(v)));
  ok("T6d: NaN yo'q", tcs.every(isFinite) && isFinite(H25.tags.EXH_T));
  ok("T6e: tabiiy spread saqlangan (S1 20..45)", H25.tags.SPREAD_1 > 20 && H25.tags.SPREAD_1 < 45,
    H25.tags.SPREAD_1.toFixed(2));
})();

/* ---- T7: spread alarm (10 s) -> trip (20 s) ---- */
(function () {
  const C = global.H25_CFG.EXH;
  const st = { t: 0, alarm: false };
  let r = "ok";
  for (let i = 0; i < 18; i++) r = EXM.spreadStep(st, C.allowBase + 50, 90, 0.5, C); // 9 s
  ok("T7a: 9 s hali ok", r === "ok", r);
  r = EXM.spreadStep(st, C.allowBase + 50, 90, 0.5, C);
  r = EXM.spreadStep(st, C.allowBase + 50, 90, 0.5, C); // 10 s
  ok("T7b: 10 s alarm", r === "alarm", r);
  for (let i = 0; i < 21; i++) r = EXM.spreadStep(st, C.allowBase + 50, 90, 0.5, C);
  ok("T7c: 20 s trip", r === "trip", r);
  r = EXM.spreadStep(st, 10, 90, 0.5, C);
  ok("T7d: normallashganda ok", r === "ok" && st.t === 0);
})();

/* ---- T8: flame-off 10 min silliq kichrayish ---- */
(function () {
  H25.init();
  for (let i = 0; i < 40; i++) H25.tick(500);
  H25.trip("TEST COOLDOWN", "9EX");
  let m1 = 0, m60 = 0, m600 = 0, mn = 1e9;
  for (let i = 0; i < 1200; i++) { // 600 s
    H25.tick(500);
    const tcs = [];
    for (let k = 1; k <= 18; k++) tcs.push(H25.tags[H25.tcTag(k)]);
    const mean = tcs.reduce((a, b) => a + b, 0) / 18;
    if (i === 1) m1 = mean;
    if (i === 119) m60 = mean;
    if (i === 1199) { m600 = mean; mn = Math.min(...tcs); }
  }
  ok("T8a: 60 s da hali issiq (sekin)", m60 > 300, m60.toFixed(1));
  ok("T8b: monoton kamayish", m1 > m60 && m60 > m600,
    [m1, m60, m600].map(v => v.toFixed(1)).join(" > "));
  ok("T8c: 10 min da deyarli yo'qolgan (<100)", m600 < 100, m600.toFixed(1));
  ok("T8d: atrof-muhitdan pastga tushmaydi", mn > 20, mn.toFixed(1));
  ok("T8e: poligon radiusi kichik", EXM.polarR(m600, 184) < 0.15 * 184,
    EXM.polarR(m600, 184).toFixed(1));
})();

/* ---- T9: exhaust maydonlari quti ichida (static) ---- */
(function () {
  const src = fs.readFileSync(path.join(ROOT, "js", "screens", "exhaust.js"), "utf8");
  const vals = [...src.matchAll(/\["(\w+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),/g)];
  const out = vals.filter(m => (+m[2] + +m[4] > 1108) || (+m[3] + +m[5] > 506));
  ok(`T9: exhaust maydonlar qutida (${vals.length} ta)`, out.length === 0,
    out.map(m => m[1]).join(","));
})();

console.log(`\n2A TEST: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
