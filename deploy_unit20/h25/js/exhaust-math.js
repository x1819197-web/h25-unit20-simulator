/* Exhaust sof matematikasi — DOMsiz, test qilinadigan funksiyalar.
 * Brauzerda window.H25_EXM, node'da module.exports orqali ishlaydi. */

(function (root) {
  "use strict";

  function cfg() { return root.H25_CFG; }

  /* 18 TC -> o'rtacha (Exhaust Temp). TODO(Q1): original formulaga almashtiriladi. */
  function exTempMean(tcs) {
    var s = 0;
    for (var i = 0; i < tcs.length; i++) s += tcs[i];
    return tcs.length ? s / tcs.length : 0;
  }

  /* 18 TC -> Spread#1/#2/#3 (GE uslubi taxmini, TODO Q1):
   * S1 = max-min, S2 = max - 2-eng-past, S3 = max - 3-eng-past. */
  function exSpreads(tcs) {
    var a = tcs.slice().sort(function (x, y) { return x - y; });
    var mx = a[a.length - 1];
    return { s1: mx - a[0], s2: mx - a[1], s3: mx - a[2] };
  }

  /* Yuklamaga bog'liq Allowable Spread. TODO(Q1): jadval bilan almashtiriladi. */
  function allowSpread(power, C) {
    C = C || cfg().EXH;
    return C.allowBase + C.allowSlope * (power / 28.6);
  }

  /* Radar radiusi: r = clamp(T,0,800)/800 * R_tashqi. */
  function polarR(T, R) {
    var C = cfg().PLOT;
    var t = Math.max(C.T_MIN, Math.min(C.T_MAX, T));
    return t / C.T_MAX * R;
  }

  /* i (1..18) TC nuqtasi, canvas koordinatalarida.
   * CT001 tepada (0 deg), keyingilari soat strelkasi bo'ylab 20 deg qadam. */
  function polarXY(i, T, c, R) {
    var a = (-90 + (i - 1) * 20) * Math.PI / 180;
    var r = polarR(T, R);
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  }

  /* Birinchi tartibli kechikish qadami: x -> tgt, tau (s), dt (s). */
  function lagStep(x, tgt, tau, dt) {
    var k = 1 - Math.exp(-dt / tau);
    return x + (tgt - x) * k;
  }

  /* TC ikki-inersiyali qadami: gaz (tez) + metall (sekin).
   * Qaytaradi: [gas, metal, display]. */
  function tcStep(gas, metal, gasTgt, tauG, tauM, dt, metalW) {
    gas = lagStep(gas, gasTgt, tauG, dt);
    metal = lagStep(metal, gas, tauM, dt);
    return [gas, metal, (1 - metalW) * gas + metalW * metal];
  }

  /* Past chastotali silliq shovqin (<= noiseMax): ikki sinus yig'indisi.
   * Fazalar seedli RNG dan bir marta olinadi; har kadrda yangi random YO'Q. */
  function smoothNoise(t, ph1, ph2, C) {
    C = C || cfg().TC;
    return C.noiseA1 * Math.sin(2 * Math.PI * t / C.noiseT1 + ph1) +
           C.noiseA2 * Math.sin(2 * Math.PI * t / C.noiseT2 + ph2);
  }

  /* Spread alarm/trip holat mashinasi.
   * state = {t: s1>allow uzluksiz davomiyligi (s), alarm: bool}.
   * Qaytaradi: "ok" | "alarm" | "trip". */
  function spreadStep(state, s1, allow, dt, C) {
    C = C || cfg().EXH;
    if (s1 > allow) state.t += dt;
    else { state.t = 0; state.alarm = false; return "ok"; }
    if (state.t >= C.spreadTripS) return "trip";
    if (state.t >= C.spreadAlarmS) { state.alarm = true; return "alarm"; }
    return "ok";
  }

  var api = {
    exTempMean: exTempMean, exSpreads: exSpreads, allowSpread: allowSpread,
    polarR: polarR, polarXY: polarXY, lagStep: lagStep, tcStep: tcStep,
    smoothNoise: smoothNoise, spreadStep: spreadStep
  };
  root.H25_EXM = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
