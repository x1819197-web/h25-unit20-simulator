/* H25 UNIT-20 markaziy konfiguratsiya — BARCHA konstantalar shu yerda.
 * Taxminiy (originali noaniq) qiymatlar TODO(Qn) bilan belgilangan.
 * AUDIT.md 7-bo'limdagi savollarga javob kelganda shu yerdan almashtiriladi. */

window.H25_CFG = {
  /* ---- simulyatsiya qadami ---- */
  TICK_MS: 500,          // qat'iy fizika qadami
  ACCUM_MS: 100,         // accumulator tekshiruvi (fon tabda yetib olish)
  MAX_DT_MS: 5000,       // bitta siklda maksimal yetib olish (cheklangan)

  /* ---- exhaust radar geometriyasi (PAGE koordinatalar: stage_y - 24) ----
   * O'lchov dalili (2026-10-06, ref/11_exhaust.png gradient+spoke tahlili):
   * halqalar/spoklar markazi STAGE (388,284), tashqi halqa R~183-186.
   * Eski poligon markazi PAGE (375,298) [STAGE (375,322)] edi:
   *   dx = +13 px (o'ngga), dy = -38 px (yuqoriga) siljish kerak.
   * Foydalanuvchi o'lchovi (+20,-55) bilan bir yo'nalishda. */
  PLOT: {
    cxPage: 388, cyPage: 260, R: 184,
    T_MIN: 0, T_MAX: 800
    // TODO(Q1): 200/400/600/800 halqa yozuvlari shu shkala (T/800*R) deb faraz
    // qilindi. Original halqa shkalasi boshqacha bo'lsa shu yerdan tuzatiladi.
  },

  /* ---- TC dinamikasi ---- */
  TC: {
    N: 18,
    tauRun: 4,        // TODO(Q3): birinchi tartibli kechikish, ish rejimida (s)
    tauGasCool: 30,   // TODO(Q3): flame-off gaz trakti tez inersiyasi (s)
    tauMetalRun: 120, // TODO(Q3): ish rejimida metall massasi (s)
    tauMetalCool: 330,// TODO(Q3): flame-off metall sekin inersiyasi (s) — 10 min da deyarli nol
    metalW: 0.65,     // TODO(Q3): ko'rsatkichdagi metall ulushi (0.35 gaz + 0.65 metall)
    biasMin: 0, biasMax: 0, // FOYDALANUVCHI TALABI: TC lar referens nuqtada
    // qoqiladi (displeyda suzish yo'q); dinamika (yuk/trip javobi) saqlangan
    seed: 20,         // takrorlanuvchi seed (UNIT-20)
    noiseMax: 0,    // shovqin o'chirilgan (displeyda miltillash yo'q)
    noiseT1: 47, noiseT2: 23, // TODO(Q3): past chastotali shovqin davrlari (s)
    noiseA1: 0, noiseA2: 0
  },

  /* ---- exhaust harorat / spread (FAQAT 18 TC dan) ---- */
  EXH: {
    // TODO(Q1): Exhaust Temp = TC o'rtachasi deb faraz qilindi.
    // Original formulasi (median/vaznli) ma'lum bo'lsa shu yerga yoziladi.
    tempFn: "mean",
    // TODO(Q1): Spread ta'riflari GE uslubi taxmini:
    // S1 = max-min, S2 = max - 2-eng-past, S3 = max - 3-eng-past.
    allowBase: 60,    // TODO(Q1): ALLOW_SPREAD = base + slope*(P/28.6); bazada 90 chiqadi
    allowSlope: 30,
    spreadAlarmS: 10, // TODO(Q1): chegaradan oshsa alarmgacha vaqt (s)
    spreadTripS: 20,  // TODO(Q1): ...va trip'gacha qo'shimcha emas, jami vaqt (s)
    spreadTripItem: "30SPT" // TRIP MONITOR dagi "High Exhaust Temperature Spread Trip"
  },

  /* ---- sync-check (2C-BLOKDA ishlatiladi; hozir faqat saqlanadi) ---- */
  SYNC: {
    dfMax: 0.1,   // TODO(Q2): |df| <= 0.1 Hz taxmin
    dvPct: 5,     // TODO(Q2): |dV| <= 5 % taxmin
    dphiMax: 10   // TODO(Q2): |dphi| <= 10 grad taxmin
  },

  /* ---- KU-20 (2D-BLOKDA ishlatiladi; hozir faqat saqlanadi) ---- */
  KU: {
    // TODO(Q4): IAPWS-IF97 T_sat, Cv kalibrlash, klapan xarakteristikalari
    pNom: 31.8, feedNom: 55.5, steamNom: 51.0, blowNom: 3.9
  }
};

;
/* Seedli tasodifiy generator (mulberry32) — Math.random TAQIQLANADI.
 * Bir xil seed = bir xil bias/fazalar = takrorlanuvchi simulyatsiya. */

(function (root) {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  root.H25_RNG = mulberry32;
  if (typeof module !== "undefined" && module.exports) module.exports = mulberry32;
})(typeof window !== "undefined" ? window : globalThis);

;
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

;
/* H25 UNIT-20 central tag database — DIASYS Netmation [Operator].
 * Every number on every screen comes from TAGS. Same tag = same value.
 * v = operating point (from reference screenshots), dp = decimals,
 * nz = noise amplitude applied each 500 ms tick. */

window.H25_TAGDEF = function (v, unit, dp, nz, min, max) {
  return { v: v, unit: unit, dp: dp, nz: nz || 0, min: min, max: max };
};

window.H25_TAGS = {
  /* ---- header KPIs ---- */
  "GEN_POWER":  H25_TAGDEF(28.6,  "MW",  1, 0, 0, 35),
  "FOFFD":      H25_TAGDEF(65.2,  "%",   1, 0, 0, 100),
  "IGV_POS":    H25_TAGDEF(82.6,  "d/A", 1, 0, 34, 90),
  "IBH_POS":    H25_TAGDEF(-0.1,  "%",   1, 0, -5, 100),

  /* ---- fuel gas ---- */
  "FUEL_GAS_T": H25_TAGDEF(104.7, "degC", 1, 0, 0, 200),
  "FUEL_GAS_P": H25_TAGDEF(3.577, "MPa", 3, 0, 0, 6),
  "SRV_POS":    H25_TAGDEF(28.2,  "%",   1, 0, 0, 100),
  "F1_GCV":     H25_TAGDEF(24.4,  "%",   1, 0, 0, 100),
  "F2_1_GCV":   H25_TAGDEF(46.7,  "%",   1, 0, 0, 100),
  "F2_2_GCV":   H25_TAGDEF(46.6,  "%",   1, 0, 0, 100),
  "F2_3_GCV":   H25_TAGDEF(46.5,  "%",   1, 0, 0, 100),
  "F2_4_GCV":   H25_TAGDEF(46.7,  "%",   1, 0, 0, 100),

  /* ---- combustion spread ---- */
  "ALLOW_SPREAD": H25_TAGDEF(90.0, "degC", 1, 0, 0, 200),
  "SPREAD_1":   H25_TAGDEF(32.4,  "degC", 1, 0, 0, 100),
  "SPREAD_2":   H25_TAGDEF(31.8,  "degC", 1, 0, 0, 100),

  /* ---- vibrations (um, 1 dp) ---- */
  "VIB_2BX": H25_TAGDEF(61.6, "um", 1, 0, 0, 200),
  "VIB_2BY": H25_TAGDEF(41.1, "um", 1, 0, 0, 200),
  "VIB_1BX": H25_TAGDEF(27.9, "um", 1, 0, 0, 200),
  "VIB_1BY": H25_TAGDEF(5.2,  "um", 1, 0, 0, 200),
  "VIB_EEBX": H25_TAGDEF(18.0, "um", 1, 0, 0, 200),
  "VIB_EEBY": H25_TAGDEF(11.5, "um", 1, 0, 0, 200),
  "VIB_TEBX": H25_TAGDEF(28.7, "um", 1, 0, 0, 200),
  "VIB_TEBY": H25_TAGDEF(29.2, "um", 1, 0, 0, 200),

  /* ---- generator electrical ---- */
  "GEN_KV":   H25_TAGDEF(10.92, "kV",   2, 0, 0, 12),
  "GEN_A":    H25_TAGDEF(1516.8,"A",    1, 0, 0, 2500),
  "GEN_MVAR": H25_TAGDEF(4.3,   "MVAR", 1, 0, 0, 20),
  "GEN_PF":   H25_TAGDEF(0.99,  "DPF",  2, 0.001, 0.7, 1.0),
  "GEN_HZ":   H25_TAGDEF(50.0,  "Hz",   1, 0, 0, 60),

  /* ---- left data box ---- */
  "LUBE_HDR_T":  H25_TAGDEF(52.5,  "degC", 1, 0, 0, 120),
  "WHEEL_MAX_T": H25_TAGDEF(499.9, "degC", 1, 0, 0, 700),
  "INLET_AIR_T": H25_TAGDEF(23.5,  "degC", 1, 0, -10, 60),

  /* ---- turbine ---- */
  "MW_REF":   H25_TAGDEF(29.5, "MW", 1, 0, 0, 35),
  "MW_FDBK":  H25_TAGDEF(28.6, "MW", 1, 0, 0, 35),
  "CPR_IN_T": H25_TAGDEF(21.3, "degC", 1, 0, -10, 60),
  "CPR_OUT_P": H25_TAGDEF(1.30, "MPa", 2, 0, 0, 2),
  "CPR_OUT_T": H25_TAGDEF(408.6, "degC", 1, 0, 0, 600),
  "EXH_T":    H25_TAGDEF(595.0, "degC", 1, 0, 0, 700),
  "SPEED":    H25_TAGDEF(7280, "min-1", 0, 0, 0, 8000),
  "SPEED_PCT": H25_TAGDEF(100.0, "%", 1, 0, 0, 110),

  /* ---- duct purge ---- */
  "PURGE_FINAL":   H25_TAGDEF(12.0, "min", 1, 0, 0, 60),
  "PURGE_CURRENT": H25_TAGDEF(0.0,  "min", 1, 0, 0, 60),

  /* ---- combustor cans KC/KD ---- */
  "KC1L": H25_TAGDEF(20.2, "", 1, 0, 0, 100),
  "KD1H": H25_TAGDEF(22.4, "", 1, 0, 0, 100),
  "KC2L": H25_TAGDEF(34.1, "", 1, 0, 0, 100),
  "KD2H": H25_TAGDEF(36.3, "", 1, 0, 0, 100),
  "KC3L": H25_TAGDEF(43.2, "", 1, 0, 0, 100),
  "KD3H": H25_TAGDEF(44.8, "", 1, 0, 0, 100),
  "KC4L": H25_TAGDEF(49.7, "", 1, 0, 0, 100),
  "KD4H": H25_TAGDEF(50.8, "", 1, 0, 0, 100),

  /* ---- setpoints ---- */
  "LOAD_SET":  H25_TAGDEF(30.0,  "MW", 1, 0, 0, 32),
  "SPEED_REF": H25_TAGDEF(105.0, "%",  1, 0, 90, 110),

  /* ---- FFD governor bars (screen 2) ---- */
  "FFD_MIN":  H25_TAGDEF(9.8,   "", 1, 0, 0, 127),
  "FFD_SU":   H25_TAGDEF(100.0, "", 1, 0, 0, 127),
  "FFD_ACC":  H25_TAGDEF(73.0,  "", 1, 0, 0, 127),
  "FFD_SPD":  H25_TAGDEF(77.8,  "", 1, 0, 0, 127),
  "FFD_LLM":  H25_TAGDEF(65.7,  "", 1, 0, 0, 127),
  "FFD_TEMP": H25_TAGDEF(64.0,  "", 1, 0, 0, 127),
  "FFD_SD":   H25_TAGDEF(100.0, "", 1, 0, 0, 127),

  /* ---- screen 3 synchro/exciter ---- */
  "GEN_MWH":  H25_TAGDEF(488380.5, "MWH", 1, 0, 0, 9999999),
  "EXC_V":    H25_TAGDEF(46.0,  "V",   1, 0, 0, 200),
  "EXC_A":    H25_TAGDEF(5.6,   "A",   1, 0, 0, 50),
  "AMB_T":    H25_TAGDEF(23.6,  "degC", 1, 0, -10, 60),
  "F20RATIO": H25_TAGDEF(0.9200, "",   4, 0, 0, 2),

  /* ---- screen 4 fuel gas ---- */
  "FUEL_FLOW": H25_TAGDEF(6626.0, "kg/h", 1, 0, 0, 9000),
  "P1_PRESS":  H25_TAGDEF(3.579, "MPa", 3, 0, 0, 6),
  "P2_PRESS":  H25_TAGDEF(2.49,  "MPa", 2, 0, 0, 6),
  "FG_CT":     H25_TAGDEF(102.4, "degC", 1, 0, 0, 200),

  /* ---- screen 5 lube oil ---- */
  "LO_HDR_P":   H25_TAGDEF(0.172, "MPa", 3, 0, 0, 1),
  "LO_HDR_P2":  H25_TAGDEF(0.173, "MPa", 3, 0, 0, 1),
  "LO_FILT_DP": H25_TAGDEF(0.020, "MPa", 3, 0, 0, 1),
  "HYD_OIL_P":  H25_TAGDEF(9.59,  "MPa", 2, 0, 0, 20),
  "MOP_DISCH":  H25_TAGDEF(0.550, "MPa", 3, 0, 0, 1),
  "DRN_GEN_TE": H25_TAGDEF(59.2, "degC", 1, 0, 0, 150),
  "DRN_GEN_EE": H25_TAGDEF(60.9, "degC", 1, 0, 0, 150),
  "DRN_THRUST": H25_TAGDEF(70.0, "degC", 1, 0, 0, 150),
  "DRN_GT2":    H25_TAGDEF(63.6, "degC", 1, 0, 0, 150),
  "DRN_GT1":    H25_TAGDEF(66.6, "degC", 1, 0, 0, 150),
  "DRN_RG_A":   H25_TAGDEF(80.3, "degC", 1, 0, 0, 150),
  "DRN_RG_B":   H25_TAGDEF(87.6, "degC", 1, 0, 0, 150),
  "DRN_RG_C":   H25_TAGDEF(57.6, "degC", 1, 0, 0, 150),
  "DRN_RG_D":   H25_TAGDEF(57.6, "degC", 1, 0, 0, 150),
  "LO_TANK_T":  H25_TAGDEF(71.9, "degC", 1, 0, 0, 150),
  "LO_TANK_L":  H25_TAGDEF(69.9, "%",    1, 0, 0, 100),

  /* ---- screen 6 generator ---- */
  "CLR_OUT_T":  H25_TAGDEF(33.4, "degC", 1, 0, 0, 100),
  "CLR_IN_T":   H25_TAGDEF(24.0, "degC", 1, 0, 0, 100),
  "COLD_AIR_T1": H25_TAGDEF(35.4, "degC", 1, 0, 0, 100),
  "COLD_AIR_T2": H25_TAGDEF(35.8, "degC", 1, 0, 0, 100),
  "WARM_AIR_T": H25_TAGDEF(77.1, "degC", 1, 0, 0, 150),
  "MET_EE":     H25_TAGDEF(60.7, "degC", 1, 0, 0, 150),
  "MET_TE":     H25_TAGDEF(60.0, "degC", 1, 0, 0, 150),
  "STATOR_A":   H25_TAGDEF(89.3, "degC", 1, 0, 0, 150),
  "STATOR_B":   H25_TAGDEF(91.3, "degC", 1, 0, 0, 150),
  "STATOR_C":   H25_TAGDEF(90.8, "degC", 1, 0, 0, 150),
  "JACK_P":     H25_TAGDEF(0.11, "MPa", 2, 0, 0, 1),

  /* ---- screen 7 ventilation ---- */
  "INLET_T1":     H25_TAGDEF(23.5, "degC", 1, 0, -10, 60),
  "INLET_T2":     H25_TAGDEF(23.6, "degC", 1, 0, -10, 60),
  "SC_FILT_DP":   H25_TAGDEF(0.94, "kPa", 2, 0, 0, 5),
  "HEPA_DP":      H25_TAGDEF(0.19, "kPa", 2, 0, 0, 5),
  "TURB_COMPT_T": H25_TAGDEF(66.1, "degC", 1, 0, 0, 200),
  "INNER_BARREL_T": H25_TAGDEF(103.6, "degC", 1, 0, 0, 200),

  /* ---- screen 8 IBH ---- */
  "IBH_OUT_T": H25_TAGDEF(65.9, "degC", 1, 0, 0, 200),
  "IBH_OUT_P": H25_TAGDEF(-0.004, "MPa", 3, 0, -1, 2),
  "IBH_IN_P":  H25_TAGDEF(1.296, "MPa", 3, 0, 0, 3),
  "IBH_REF":   H25_TAGDEF(0.0, "%", 1, 0, 0, 100),
  "IBH_FDBK":  H25_TAGDEF(-0.1, "%", 1, 0, -5, 100),

  /* ---- screen 10 bearing oil ---- */
  "LO_HA":   H25_TAGDEF(52.5, "degC", 1, 0, 0, 150),
  "LO_HB":   H25_TAGDEF(52.5, "degC", 1, 0, 0, 150),
  "LO_HC":   H25_TAGDEF(52.8, "degC", 1, 0, 0, 150),
  "BRG_EE":  H25_TAGDEF(60.7, "degC", 1, 0, 0, 150),
  "BRG_TE":  H25_TAGDEF(59.3, "degC", 1, 0, 0, 150),

  /* ---- screen 11 exhaust ---- */
  "TC01": H25_TAGDEF(616.6, "degC", 1, 0, 0, 800),
  "TC02": H25_TAGDEF(599.0, "degC", 1, 0, 0, 800),
  "TC03": H25_TAGDEF(605.0, "degC", 1, 0, 0, 800),
  "TC04": H25_TAGDEF(595.1, "degC", 1, 0, 0, 800),
  "TC05": H25_TAGDEF(599.0, "degC", 1, 0, 0, 800),
  "TC06": H25_TAGDEF(584.7, "degC", 1, 0, 0, 800),
  "TC07": H25_TAGDEF(591.9, "degC", 1, 0, 0, 800),
  "TC08": H25_TAGDEF(607.1, "degC", 1, 0, 0, 800),
  "TC09": H25_TAGDEF(584.9, "degC", 1, 0, 0, 800),
  "TC10": H25_TAGDEF(616.2, "degC", 1, 0, 0, 800),
  "TC11": H25_TAGDEF(590.6, "degC", 1, 0, 0, 800),
  "TC12": H25_TAGDEF(605.2, "degC", 1, 0, 0, 800),
  "TC13": H25_TAGDEF(602.0, "degC", 1, 0, 0, 800),
  "TC14": H25_TAGDEF(606.9, "degC", 1, 0, 0, 800),
  "TC15": H25_TAGDEF(599.6, "degC", 1, 0, 0, 800),
  "TC16": H25_TAGDEF(602.4, "degC", 1, 0, 0, 800),
  "TC17": H25_TAGDEF(611.8, "degC", 1, 0, 0, 800),
  "TC18": H25_TAGDEF(592.2, "degC", 1, 0, 0, 800),
  "EXH_SPREAD_3": H25_TAGDEF(25.0, "degC", 1, 0, 0, 100),
  "EXH_REF_T": H25_TAGDEF(595.8, "degC", 1, 0, 0, 800),

  /* ---- screen 12 vibration ---- */
  "RG4X": H25_TAGDEF(7.8, "um", 1, 0, 0, 200),
  "RG4Y": H25_TAGDEF(4.6, "um", 1, 0, 0, 200),
  "RG3X": H25_TAGDEF(6.5, "um", 1, 0, 0, 200),
  "RG3Y": H25_TAGDEF(2.6, "um", 1, 0, 0, 200),
  "RG2X": H25_TAGDEF(11.3, "um", 1, 0, 0, 200),
  "RG2Y": H25_TAGDEF(21.7, "um", 1, 0, 0, 200),
  "RG1X": H25_TAGDEF(8.1, "um", 1, 0, 0, 200),
  "RG1Y": H25_TAGDEF(8.4, "um", 1, 0, 0, 200),
  "THR1": H25_TAGDEF(1.13, "mm", 2, 0, 0, 5),
  "THR2": H25_TAGDEF(1.12, "mm", 2, 0, 0, 5),

  /* ---- screen 13 wheelspace ---- */
  "WS1A": H25_TAGDEF(485, "", 0, 0, 0, 800),
  "WS1B": H25_TAGDEF(485, "", 0, 0, 0, 800),
  "WS1C": H25_TAGDEF(475, "", 0, 0, 0, 800),
  "WS1D": H25_TAGDEF(470, "", 0, 0, 0, 800),
  "WS2A": H25_TAGDEF(504, "", 0, 0, 0, 800),
  "WS2B": H25_TAGDEF(494, "", 0, 0, 0, 800),
  "WS2C": H25_TAGDEF(476, "", 0, 0, 0, 800),
  "WS2D": H25_TAGDEF(476, "", 0, 0, 0, 800),
  "WS3A": H25_TAGDEF(488, "", 0, 0, 0, 800),
  "WS3B": H25_TAGDEF(492, "", 0, 0, 0, 800),
  "WS3C": H25_TAGDEF(314, "", 0, 0, 0, 800),
  "WS3D": H25_TAGDEF(329, "", 0, 0, 0, 800),

  /* ---- screen 15 timers ---- */
  "EOH_L": H25_TAGDEF(23076.5, "hrs", 1, 0, 0, 999999),
  "EOH_R": H25_TAGDEF(23076.5, "hrs", 1, 0, 0, 999999),
  "AOH_L": H25_TAGDEF(18476.5, "hrs", 1, 0, 0, 999999),
  "AOH_R": H25_TAGDEF(18476.5, "hrs", 1, 0, 0, 999999),
  "GAS_L": H25_TAGDEF(18476.5, "hrs", 1, 0, 0, 999999),
  "GAS_R": H25_TAGDEF(18476.5, "hrs", 1, 0, 0, 999999),
  "FS_N": H25_TAGDEF(76.0, "CNT", 1, 0, 0, 999999),
  "FS_N_R": H25_TAGDEF(76.0, "CNT", 1, 0, 0, 999999),
  "ET_NT": H25_TAGDEF(48.0, "CNT", 1, 0, 0, 999999),
  "ET_NT_R": H25_TAGDEF(48.0, "CNT", 1, 0, 0, 999999),
  "TOT_ST": H25_TAGDEF(80.0, "CNT", 1, 0, 0, 999999),
  "TOT_ST_R": H25_TAGDEF(80.0, "CNT", 1, 0, 0, 999999),
  "TOT_ET": H25_TAGDEF(50.0, "CNT", 1, 0, 0, 999999),
  "TOT_ET_R": H25_TAGDEF(50.0, "CNT", 1, 0, 0, 999999),
  "RST_DATE": "70/01/01",
  "RST_TIME": "00:00:00",

  /* ---- screen 17-18 data reports ---- */
  "NA_TAG": "N/A",
  "TB_SPEED": H25_TAGDEF(7276, "min-1", 0, 0, 0, 9000),
  "CG006": H25_TAGDEF(26.7, "%", 1, 0, 0, 100),
  "CG001": H25_TAGDEF(24.2, "%", 1, 0, 0, 100),
  "CG002": H25_TAGDEF(46.4, "%", 1, 0, 0, 100),
  "CG003": H25_TAGDEF(46.3, "%", 1, 0, 0, 100),
  "CG004": H25_TAGDEF(46.3, "%", 1, 0, 0, 100),
  "CG005": H25_TAGDEF(46.3, "%", 1, 0, 0, 100),
  "CP002F": H25_TAGDEF(3.556, "MPa", 3, 0, 0, 6),
  "CP001ABC": H25_TAGDEF(2.50, "MPa", 2, 0, 0, 6),
  "CP001ABC_H": H25_TAGDEF(1.30, "MPa", 2, 0, 0, 6),
  "IGV_REF": H25_TAGDEF(82.5, "degA", 1, 0, 0, 100),
  "MAX_VIB": H25_TAGDEF(61.3, "um", 1, 0, 0, 200),
  "CY001A": H25_TAGDEF(27.8, "um", 1, 0, 0, 200),
  "CY001B": H25_TAGDEF(5.3, "um", 1, 0, 0, 200),
  "CY002A": H25_TAGDEF(61.3, "um", 1, 0, 0, 200),
  "CY002B": H25_TAGDEF(40.8, "um", 1, 0, 0, 200),
  "CY001A2": H25_TAGDEF(28.6, "um", 1, 0, 0, 200),
  "CY001B2": H25_TAGDEF(29.2, "um", 1, 0, 0, 200),
  "CY002A2": H25_TAGDEF(18.2, "um", 1, 0, 0, 200),
  "CY002B2": H25_TAGDEF(11.2, "um", 1, 0, 0, 200),
  "CL001": H25_TAGDEF(70.0, "%", 1, 0, 0, 100),
  "CS019": H25_TAGDEF(7268, "min-1", 0, 0, 0, 9000),
  "TX_MED": H25_TAGDEF(595.9, "degC", 1, 0, 0, 800),
  "CT001": H25_TAGDEF(517.8, "degC", 1, 0, 0, 800),
  "CT002": H25_TAGDEF(600.6, "degC", 1, 0, 0, 800),
  "CT003": H25_TAGDEF(605.5, "degC", 1, 0, 0, 800),
  "CT004": H25_TAGDEF(595.9, "degC", 1, 0, 0, 800),
  "CT005": H25_TAGDEF(599.9, "degC", 1, 0, 0, 800),
  "CT006": H25_TAGDEF(585.8, "degC", 1, 0, 0, 800),
  "CT007": H25_TAGDEF(592.2, "degC", 1, 0, 0, 800),
  "CT008": H25_TAGDEF(609.1, "degC", 1, 0, 0, 800),
  "CT009": H25_TAGDEF(585.8, "degC", 1, 0, 0, 800),
  "CT010": H25_TAGDEF(617.8, "degC", 1, 0, 0, 800),
  "CT011": H25_TAGDEF(591.8, "degC", 1, 0, 0, 800),
  "CT012": H25_TAGDEF(605.9, "degC", 1, 0, 0, 800),
  "CT013": H25_TAGDEF(603.6, "degC", 1, 0, 0, 800),
  "CT014": H25_TAGDEF(607.6, "degC", 1, 0, 0, 800),
  "CT015": H25_TAGDEF(600.6, "degC", 1, 0, 0, 800),
  "CT016": H25_TAGDEF(602.3, "degC", 1, 0, 0, 800),
  "CT017": H25_TAGDEF(612.7, "degC", 1, 0, 0, 800),
  "CT018": H25_TAGDEF(594.0, "degC", 1, 0, 0, 800),
  "SGJ02A": H25_TAGDEF(103.2, "degC", 1, 0, 0, 200),
  "SGJ02B": H25_TAGDEF(103.5, "degC", 1, 0, 0, 200),
  "MBA_CT01": H25_TAGDEF(21.4, "degC", 1, 0, -10, 60),
  "MBA_CT02": H25_TAGDEF(408.8, "degC", 1, 0, 0, 600),
  "MBA_CT03": H25_TAGDEF(70.0, "degC", 1, 0, 0, 150),
  "MBA_CT04": H25_TAGDEF(66.7, "degC", 1, 0, 0, 150),
  "MBA_CT05": H25_TAGDEF(63.6, "degC", 1, 0, 0, 150),
  "MBA_CT08": H25_TAGDEF(80.3, "degC", 1, 0, 0, 150),
  "MBA_CT09": H25_TAGDEF(87.5, "degC", 1, 0, 0, 150),
  "MBA_CT10": H25_TAGDEF(57.6, "degC", 1, 0, 0, 150),
  "MBA_CT11": H25_TAGDEF(57.6, "degC", 1, 0, 0, 150),
  "MBA20_01": H25_TAGDEF(72.0, "degC", 1, 0, 0, 150),
  "MBP_CT01A": H25_TAGDEF(102.0, "degC", 1, 0, 0, 200),
  "MBP_CT01B": H25_TAGDEF(102.4, "degC", 1, 0, 0, 200),
  "MBA20_A1": H25_TAGDEF(485, "", 0, 0, 0, 800),
  "MBA20_B1": H25_TAGDEF(486, "", 0, 0, 0, 800),
  "MBA20_A2": H25_TAGDEF(475, "", 0, 0, 0, 800),
  "MBA20_B2": H25_TAGDEF(470, "", 0, 0, 0, 800),
  "MBA20_A3": H25_TAGDEF(504, "", 0, 0, 0, 800),
  "MBA20_B3": H25_TAGDEF(494, "", 0, 0, 0, 800),
  "MBA20_A4": H25_TAGDEF(476, "", 0, 0, 0, 800),
  "MBA20_B4": H25_TAGDEF(476, "", 0, 0, 0, 800),
  "MBA20_A5": H25_TAGDEF(488, "", 0, 0, 0, 800),
  "MBA20_B5": H25_TAGDEF(492, "", 0, 0, 0, 800),
  "MBA20_A6": H25_TAGDEF(314, "", 0, 0, 0, 800),
  "MBA20_B6": H25_TAGDEF(329, "", 0, 0, 0, 800),
  "MBX01A": H25_TAGDEF(0.49, "MPa", 2, 0, 0, 5),
  "MBX01B": H25_TAGDEF(0.49, "MPa", 2, 0, 0, 5),
  "MBX01C": H25_TAGDEF(0.49, "MPa", 2, 0, 0, 5),
  "MBX30_A": H25_TAGDEF(9.58, "MPa", 2, 0, 0, 20),
  "MBX30_B": H25_TAGDEF(9.59, "MPa", 2, 0, 0, 20),
  "MBX30_C": H25_TAGDEF(9.59, "MPa", 2, 0, 0, 20),
  "MBV_P01": H25_TAGDEF(0.546, "MPa", 3, 0, 0, 2),
  "MBV_P02": H25_TAGDEF(0.171, "MPa", 3, 0, 0, 2),
  "MBP20_P01": H25_TAGDEF(3.575, "MPa", 3, 0, 0, 6),
  "MBP20_P51": H25_TAGDEF(20.64, "kPa", 2, 0, 0, 100),
  "MBP20_T01": H25_TAGDEF(104.7, "degC", 1, 0, 0, 200),
  "GAS_FLOW": H25_TAGDEF(6625.2, "kg/h", 1, 0, 0, 9000),
  "MBA_P03": H25_TAGDEF(945.1, "hPa", 1, 0, 0, 2000),
  "IGV_CP51": H25_TAGDEF(209.4, "hPa", 1, 0, 0, 1000),
  "AIR_FLOW": H25_TAGDEF(323439.3, "kg/h", 1, 0, 0, 500000),
  "ACT_P1": H25_TAGDEF(28.61, "MW", 2, 0, 0, 35),
  "ACT_P2": H25_TAGDEF(28.32, "MW", 2, 0, 0, 35),
  "REACT_P": H25_TAGDEF(4.9, "MVAR", 1, 0, 0, 20),
  "GEN_V_DR": H25_TAGDEF(10.93, "kV", 2, 0, 0, 12),
  "GEN_C_DR": H25_TAGDEF(1518.0, "A", 1, 0, 0, 2500),
  "PF_DR": H25_TAGDEF(0.98, "DPF", 2, 0.001, 0.7, 1.0),
  "FREQ_DR": H25_TAGDEF(50.0, "Hz", 1, 0, 0, 60),
  "FLD_V": H25_TAGDEF(46.8, "V", 1, 0, 0, 200),
  "FLD_C": H25_TAGDEF(5.6, "A", 1, 0, 0, 50),
  "BV10_T2A": H25_TAGDEF(52.5, "degC", 1, 0, 0, 150),
  "BV10_T2B": H25_TAGDEF(52.5, "degC", 1, 0, 0, 150),
  "BV10_T2C": H25_TAGDEF(52.9, "degC", 1, 0, 0, 150),
  "BA10_T2A": H25_TAGDEF(405.3, "degC", 1, 0, 0, 600),
  "BA10_T2B": H25_TAGDEF(408.7, "degC", 1, 0, 0, 600),
  "BA10_T1A": H25_TAGDEF(21.8, "degC", 1, 0, -10, 60),
  "BA10_T1B": H25_TAGDEF(21.5, "degC", 1, 0, -10, 60),
  "BA10_T1C": H25_TAGDEF(21.4, "degC", 1, 0, -10, 60),
  "SGJ_T01": H25_TAGDEF(68.3, "degC", 1, 0, 0, 200),
  "BL30_P01": H25_TAGDEF(1.297, "MPa", 3, 0, 0, 3),
  "BL30_P02": H25_TAGDEF(-0.004, "MPa", 3, 0, -1, 2),
  "BL30_T03": H25_TAGDEF(65.9, "degC", 1, 0, 0, 200),
  "BL30_G01": H25_TAGDEF(-1.9, "%", 1, 0, -5, 100),
  "BL30_G02": H25_TAGDEF(-0.1, "%", 1, 0, -5, 100),
  "CP052A": H25_TAGDEF(14.7, "hPa", 1, 0, 0, 100),
  "CP052B": H25_TAGDEF(14.7, "hPa", 1, 0, 0, 100),
  "CP052C": H25_TAGDEF(14.7, "hPa", 1, 0, 0, 100),
  "BV10_P52": H25_TAGDEF(0.020, "MPa", 3, 0, 0, 1),
  "BL10_P53": H25_TAGDEF(0.95, "kPa", 2, 0, 0, 5),
  "BL10_P54": H25_TAGDEF(0.19, "kPa", 2, 0, 0, 5),
  "BD20_A1": H25_TAGDEF(7.6, "um", 1, 0, 0, 200),
  "BD20_B1": H25_TAGDEF(9.6, "um", 1, 0, 0, 200),
  "BD20_A2": H25_TAGDEF(7.2, "um", 1, 0, 0, 200),
  "BD20_B2": H25_TAGDEF(18.9, "um", 1, 0, 0, 200),
  "BD20_A3": H25_TAGDEF(6.4, "um", 1, 0, 0, 200),
  "BD20_B3": H25_TAGDEF(2.8, "um", 1, 0, 0, 200),
  "BD20_A4": H25_TAGDEF(7.6, "um", 1, 0, 0, 200),
  "BD20_B4": H25_TAGDEF(4.5, "um", 1, 0, 0, 200),
  "D10_A5": H25_TAGDEF(1.13, "mm", 2, 0, 0, 5),
  "D10_B5": H25_TAGDEF(1.11, "mm", 2, 0, 0, 5),
  "BV20_P01": H25_TAGDEF(0.12, "MPa", 2, 0, 0, 1),
  "BV10_P03A": H25_TAGDEF(0.169, "MPa", 3, 0, 0, 1),
  "BV10_P03B": H25_TAGDEF(0.169, "MPa", 3, 0, 0, 1),
  "BV10_P03C": H25_TAGDEF(0.170, "MPa", 3, 0, 0, 1),
  "BP10_A1": H25_TAGDEF(2.513, "MPa", 3, 0, 0, 6),
  "BP10_B1": H25_TAGDEF(2.512, "MPa", 3, 0, 0, 6),
  "BP10_C1": H25_TAGDEF(2.516, "MPa", 3, 0, 0, 6),
  "BH10_A1": H25_TAGDEF(1.297, "MPa", 3, 0, 0, 3),
  "BH10_B1": H25_TAGDEF(1.298, "MPa", 3, 0, 0, 3),
  "BH10_C1": H25_TAGDEF(1.298, "MPa", 3, 0, 0, 3),
  "KA10_01": H25_TAGDEF(89.4, "degC", 1, 0, 0, 150),
  "KA10_06": H25_TAGDEF(91.3, "degC", 1, 0, 0, 150),
  "KA10_11": H25_TAGDEF(91.2, "degC", 1, 0, 0, 150),
  "KA10_31": H25_TAGDEF(36.0, "degC", 1, 0, 0, 150),
  "KA10_32": H25_TAGDEF(35.7, "degC", 1, 0, 0, 150),
  "KA10_33": H25_TAGDEF(77.3, "degC", 1, 0, 0, 150),
  "KD10_11": H25_TAGDEF(59.9, "degC", 1, 0, 0, 150),
  "KD10_21": H25_TAGDEF(60.8, "degC", 1, 0, 0, 150),
  "BV20_11": H25_TAGDEF(59.4, "degC", 1, 0, 0, 150),
  "BV20_21": H25_TAGDEF(60.7, "degC", 1, 0, 0, 150),
  "JK10_01": H25_TAGDEF(24.3, "degC", 1, 0, 0, 100),
  "JK10_02": H25_TAGDEF(35.7, "degC", 1, 0, 0, 100),
  "JK10_03": H25_TAGDEF(58.5, "degC", 1, 0, 0, 100),
  "JK10_04": H25_TAGDEF(35.6, "degC", 1, 0, 0, 100),
  "MBL30_T1": H25_TAGDEF(23.6, "degC", 1, 0, -10, 60),
  "MBL30_T2": H25_TAGDEF(23.9, "degC", 1, 0, -10, 60),

  /* ---- screen 19 overspeed ---- */
  "OS_MAX_SPEED": H25_TAGDEF(7812, "min-1", 0, 0, 0, 9000),
  "OS_MAX_VIB": H25_TAGDEF(61.3, "um", 1, 0, 0, 200),
  "OS_EXH_T": H25_TAGDEF(594.6, "degC", 1, 0, 0, 800),
  "OS_TURB_SPEED": H25_TAGDEF(7278, "min-1", 0, 0, 0, 9000),
  "OS_SPEED_REF": H25_TAGDEF(104.9, "%", 1, 0, 0, 120)
};

;
/* UNIT-20 training model v3. Single simulation clock, no DOM in physics.
 * Educational approximations, NOT OEM protection or performance certification.
 * Each tick commits all derived tags before publishing a snapshot. */
(function () {
  'use strict';
  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
  var clone = function (v) {
    return JSON.parse(JSON.stringify(v));
  };
  var motorIds = [
    'eop',
    'mop1',
    'mop2',
    'mist1',
    'mist2',
    'jop',
    'tgm',
    'hop1',
    'hop2',
    'ven1',
    'ven2',
    'bc1',
    'bc2',
    'evac1',
    'gfc1',
    'gfc2',
    'gfc3',
    'crank',
  ];
  var steps = [
    ['Cranking', 3],
    ['Purge', 4],
    ['GT Firing', 3],
    ['Warming up', 5],
    ['Accelerating', 6],
    ['Seq. Complete', 3],
    ['Loading', 8],
  ];
  var initialCtl = {
    gtStatus: 'Base Load',
    ffdStatus: 'FFDT',
    location: 'LOCAL',
    cooldown: 'ON',
    masterMode: 'AUTO',
    master: 'START',
    speedMode: 'AUTO',
    loadMode: 'PRE SELECT',
    governor: 'LLM',
    brk52G: true,
    field41: true,
    fieldMode: 'AUTO',
    avrMode: 'AVR',
    pss: 'OFF',
    s43L: 'OFF',
    s43G: 'AUTO',
    s43OPE: 'TCP-HMI',
    ibhLock: true,
    osTest: 'DISABLE',
    lift: '',
    osMainRun: false,
    osBackupRun: false,
  };
  window.H25 = {
    tags: {},
    ctl: clone(initialCtl),
    motors: {},
    listeners: [],
    events: [],
    sessionId: 'unit20-default',
    tripped: false,
    tripItems: {},
    tripCause: '',
    seq: 'Base Load',
    _simT: 0,
    init: function (mode) {
      this.tags = {};
      for (var k in H25_TAGS)
        this.tags[k] =
          typeof H25_TAGS[k] === 'object' ? H25_TAGS[k].v : H25_TAGS[k];
      this.ctl = clone(initialCtl);
      this.motors = {};
      motorIds.forEach(function (id) {
        this.motors[id] = {
          run:
            [
              'mop1',
              'mist2',
              'hop2',
              'ven1',
              'ven2',
              'bc1',
              'bc2',
              'evac1',
              'gfc1',
              'gfc3',
            ].indexOf(id) >= 0,
          auto: true,
          standby: ['mop2', 'mist1', 'hop1', 'gfc2'].indexOf(id) >= 0,
          stopLatch: false,
        };
      }, this);
      this.tripped = false;
      this.tripCause = '';
      this.tripItems = {};
      this.faults = { vib: false, exh: false, lube: false, fuel: false };
      this.seq = 'Base Load';
      this.recovering = false;
      this.raiseLower = this.vRaiseLower = this.iRaiseLower = 0;
      this._simT = 0;
      this._startup = null;
      this._delays = { vib: 0, fuel: 0, exh: 0 };
      this._spreadSt = { t: 0, alarm: false };
      this.spreadAlarm = false;
      this.voltageSet = 10.92;
      this.reactiveSet = 4.3;
      this.sync = { df: 0, dvPct: 0, dphi: 0 };
      this.kuInput = null;
      this.events = [];
      this.lastReset = 0;
      this.paused = false;
      this.tcGas = [];
      this.tcMetal = [];
      this.tcBias = [];
      this.tcPh1 = [];
      this.tcPh2 = [];
      var rng = H25_RNG(H25_CFG.TC.seed);
      for (var i = 1; i <= 18; i++) {
        var v = this.tags[this.tcTag(i)];
        this.tcGas.push(v);
        this.tcMetal.push(v);
        this.tcBias.push(0);
        this.tcPh1.push(rng() * 6.28);
        this.tcPh2.push(rng() * 6.28);
      }
      if (mode === 'cold') {
        this.seq = 'Ready to Start';
        this.ctl.master = 'STOP';
        this.ctl.brk52G = false;
        this.ctl.field41 = false;
        [
          'SPEED',
          'SPEED_PCT',
          'GEN_POWER',
          'GEN_A',
          'GEN_MVAR',
          'GEN_KV',
          'GEN_HZ',
          'FOFFD',
          'FUEL_FLOW',
          'SRV_POS',
          'F1_GCV',
          'F2_1_GCV',
          'F2_2_GCV',
          'F2_3_GCV',
          'F2_4_GCV',
        ].forEach(function (k) {
          this.tags[k] = 0;
        }, this);
        this.tags.IGV_POS = 34;
        this.tcGas = this.tcGas.map(function () {
          return 25;
        });
        this.tcMetal = this.tcMetal.map(function () {
          return 25;
        });
      }
      this.updateTC(0, 'hold', 595);
      this.recomputeExhaust(0);
      this.derive();
      this.log(
        'SCENARIO',
        mode === 'cold'
          ? 'Cold / stopped initial state'
          : 'Base-load demonstration',
      );
      this.push();
    },
    resetScenario: function (mode) {
      this.init(mode || 'cold');
      this.publish();
    },
    log: function (type, message) {
      this.events.unshift({ t: this._simT, type: type, message: message });
      if (this.events.length > 200) this.events.length = 200;
    },
    onTick: function (fn) {
      this.listeners.push(fn);
      return function () {
        var i = this.listeners.indexOf(fn);
        if (i >= 0) this.listeners.splice(i, 1);
      }.bind(this);
    },
    publish: function () {
      for (var i = 0; i < this.listeners.length; i++)
        this.listeners[i](this.tags);
    },
    baseOf: function (k) {
      return H25_TAGS[k].v;
    },
    tcTag: function (i) {
      return 'TC' + String(i).padStart(2, '0');
    },
    running: function () {
      return (
        !this.tripped &&
        ['Base Load', 'Part Load', 'Loading', 'Unloading'].indexOf(this.seq) >=
          0
      );
    },
    flameOn: function () {
      return (
        !this.tripped &&
        [
          'GT Firing',
          'Warming up',
          'Accelerating',
          'Seq. Complete',
          'Loading',
          'Base Load',
          'Part Load',
          'Unloading',
        ].indexOf(this.seq) >= 0
      );
    },
    updateTC: function (dt, mode, target) {
      var C = H25_CFG.TC,
        meanRef = 0;
      for (var j = 1; j <= 18; j++) meanRef += H25_TAGS[this.tcTag(j)].v / 18;
      for (var i = 0; i < 18; i++) {
        var tgt =
          mode === 'run'
            ? target + H25_TAGS[this.tcTag(i + 1)].v - meanRef
            : 25;
        var r =
          mode === 'hold'
            ? [
                this.tcGas[i],
                this.tcMetal[i],
                (1 - C.metalW) * this.tcGas[i] + C.metalW * this.tcMetal[i],
              ]
            : H25_EXM.tcStep(
                this.tcGas[i],
                this.tcMetal[i],
                tgt,
                mode === 'run' ? C.tauRun : C.tauGasCool,
                mode === 'run' ? C.tauMetalRun : C.tauMetalCool,
                dt,
                C.metalW,
              );
        this.tcGas[i] = r[0];
        this.tcMetal[i] = r[1];
        this.tags[this.tcTag(i + 1)] = r[2];
      }
    },
    recomputeExhaust: function (dt) {
      var a = [];
      for (var i = 1; i <= 18; i++) a.push(this.tags[this.tcTag(i)]);
      var T = this.tags,
        sp = H25_EXM.exSpreads(a);
      T.EXH_T = H25_EXM.exTempMean(a);
      T.SPREAD_1 = sp.s1;
      T.SPREAD_2 = sp.s2;
      T.SPREAD_3 = T.EXH_SPREAD_3 = sp.s3;
      T.ALLOW_SPREAD = H25_EXM.allowSpread(T.GEN_POWER || 0);
      for (i = 1; i <= 18; i++) T['CT' + String(i).padStart(2, '0')] = a[i - 1];
      if (this.flameOn()) {
        var status = H25_EXM.spreadStep(
          this._spreadSt,
          sp.s1,
          T.ALLOW_SPREAD,
          dt,
          H25_CFG.EXH,
        );
        this.spreadAlarm = status !== 'ok';
        if (status === 'trip') this.trip('HIGH EXHAUST SPREAD', '30SPT');
      } else {
        this._spreadSt = { t: 0, alarm: false };
        this.spreadAlarm = false;
      }
    },
    derive: function () {
      var T = this.tags,
        online = this.ctl.brk52G && !this.tripped && this.flameOn();
      if (!online) T.GEN_POWER = 0;
      T.GEN_POWER = Math.max(0, T.GEN_POWER || 0);
      T.MW_FDBK = T.GEN_POWER;
      T.SPEED_PCT = T.SPEED / 72.8;
      T.GEN_HZ = (50 * T.SPEED) / 7280;
      T.GEN_MVAR = online ? T.GEN_MVAR || 0 : 0;
      var apparent = Math.hypot(T.GEN_POWER, T.GEN_MVAR);
      T.GEN_A =
        online && T.GEN_KV > 0
          ? (apparent * 1000) / (Math.sqrt(3) * T.GEN_KV)
          : 0;
      T.GEN_PF = apparent > 0 ? T.GEN_POWER / apparent : 1;
      T.EXC_V = this.ctl.field41 ? (46 * T.GEN_KV) / 10.92 : 0;
      T.EXC_A = this.ctl.field41 ? 5.6 * (0.5 + Math.abs(T.GEN_MVAR) / 8.6) : 0;
      T.TB_SPEED = T.CS019 = T.OS_TURB_SPEED = T.SPEED;
      T.OS_SPEED_REF = T.SPEED_PCT;
      T.OS_MAX_SPEED = Math.max(T.OS_MAX_SPEED || 0, T.SPEED);
      T.OS_MAX_VIB = Math.max(T.OS_MAX_VIB || 0, T.VIB_2BX || 0);
      T.MW_REF = (T.LOAD_SET * 28.6) / 30;
      T.FUEL_GAS_P = T.P1_PRESS;
      T.SPEED_REF = 100;
      T.GAS_FLOW = T.FUEL_FLOW;
      T.ACT_P1 = T.GEN_POWER;
      T.ACT_P2 = Math.max(0, T.GEN_POWER - 0.29);
      T.REACT_P = T.GEN_MVAR;
      T.GEN_V_DR = T.GEN_KV;
      T.GEN_C_DR = T.GEN_A;
      T.FLD_V = T.EXC_V;
      T.FLD_C = T.EXC_A;
      T.TX_MED = T.OS_EXH_T = T.EXH_T;
      T.MAX_VIB = Math.max(T.VIB_2BX || 0, T.VIB_2BY || 0);
      T.IGV_REF = T.IGV_POS;
      T.MBA_CT02 = T.BA10_T2B = T.CPR_OUT_T;
      T.BL30_P01 = T.IBH_IN_P;
      T.BL30_P02 = T.IBH_OUT_P;
      T.BL30_T03 = T.IBH_OUT_T;
      this.ctl.gtStatus = this.seq;
    },
    tick: function (dtMs) {
      if (this.paused) return;
      var dt = (dtMs == null ? H25_CFG.TICK_MS : dtMs) / 1000;
      if (!(dt > 0) || dt > 5) return;
      this._simT += dt;
      this._lastDt = dt;
      var T = this.tags,
        self = this;
      function lag(k, target, tau) {
        T[k] = H25_EXM.lagStep(Number(T[k]) || 0, target, tau, dt);
      }
      if (this._startup && !this.tripped) this.advanceStartup(dt);
      if (this.running())
        T.LOAD_SET = clamp(T.LOAD_SET + this.raiseLower * 0.2 * dt, 0, 32);
      this.voltageSet = clamp(
        this.voltageSet + this.vRaiseLower * 0.02 * dt,
        10,
        11.5,
      );
      this.reactiveSet = clamp(
        this.reactiveSet + this.iRaiseLower * 0.1 * dt,
        -8,
        8,
      );
      var back = (this.kuInput && this.kuInput.backP) || 0;
      if (this.running() && !this._startup) {
        var targetPower = Math.max(0, (T.LOAD_SET * 28.6) / 30);
        if (this.kuInput && this.kuInput.boilerTrip)
          targetPower = Math.min(5, targetPower);
        var d = T.LOAD_SET - 30,
          fuelTarget = clamp(65.2 + d * 1.5, 9.8, 100);
        T.FFD_MIN = 9.8;
        T.FFD_SU = 100;
        T.FFD_SD = 100;
        T.FFD_ACC = clamp(73 + d * 0.8, 9.8, 100);
        T.FFD_SPD = clamp(77.8 + d * 1.2, 9.8, 100);
        T.FFD_LLM = clamp(65.7 + d * 1.5, 9.8, 100);
        T.FFD_TEMP = clamp(
          64 + d * 1.5 - Math.max(0, T.EXH_T - 595) * 0.15,
          9.8,
          100,
        );
        fuelTarget = Math.min(
          fuelTarget,
          this.ctl.governor === 'LLM' ? T.FFD_LLM : T.FFD_SPD,
        );
        T.EXH_REF_T = H25_EXM.lagStep(
          T.EXH_REF_T || 595.8,
          595.8 + d * 3,
          5,
          dt,
        );
        var runback = Math.max(0, T.EXH_T - T.EXH_REF_T - 11);
        fuelTarget = Math.max(9.8, fuelTarget - runback * 0.8);
        targetPower *= clamp(fuelTarget / Math.max(9.8, 65.2 + d * 1.5), 0, 1);
        if (this.faults.fuel) targetPower *= clamp(T.P1_PRESS / 3.579, 0, 1);
        lag('GEN_POWER', this.ctl.brk52G ? targetPower : 0, 2.5);
        lag('FOFFD', fuelTarget, 2);
        lag('SPEED', 7280, 1);
        lag('IGV_POS', clamp(82.6 + d * 0.4, 34, 85), 2);
        lag(
          'FUEL_FLOW',
          this.faults.fuel ? 0 : Math.max(0, 6626 + d * 220),
          this.faults.fuel ? 2 : 3,
        );
        lag('P1_PRESS', this.faults.fuel ? 0 : 3.579, this.faults.fuel ? 2 : 2);
        lag('P2_PRESS', Math.max(0, 2.49 + d * 0.05), 2);
      } else if (!this._startup && !this.flameOn()) {
        T.SPEED = Math.max(0, T.SPEED - 360 * dt);
        lag('FOFFD', 0, 1);
        lag('FUEL_FLOW', 0, 0.5);
        if (T.SPEED === 0 && !this.tripped) this.seq = 'Ready to Start';
      }
      if (!this.faults.fuel) lag('P1_PRESS', 3.579, 2);
      if (this.ctl.osMainRun || this.ctl.osBackupRun) {
        if (!this._osSpeed) this._osSpeed = T.SPEED;
        this._osSpeed += 180 * dt;
        T.SPEED = this._osSpeed;
        if (T.SPEED >= (this.ctl.osMainRun ? 8006 : 8079))
          this.trip(
            this.ctl.osMainRun
              ? 'MAIN OVERSPEED TRIP'
              : 'BACKUP OVERSPEED TRIP',
            this.ctl.osMainRun ? '12H' : '12H_P',
          );
      }
      var fl = this.flameOn(),
        fuel = fl ? T.FOFFD : 0;
      T.SRV_POS = H25_EXM.lagStep(
        T.SRV_POS || 0,
        fl ? clamp(fuel * 0.433, 0, 100) : 0,
        1,
        dt,
      );
      ['F1_GCV', 'F2_1_GCV', 'F2_2_GCV', 'F2_3_GCV', 'F2_4_GCV'].forEach(
        function (k, i) {
          var threshold = [0, 0, 36.3, 44.8, 50.8][i];
          lag(
            k,
            fl && fuel >= threshold
              ? clamp(fuel * (i ? 0.715 : 0.374), 0, 100)
              : 0,
            1,
          );
        },
      );
      if (!fl) {
        T.FUEL_FLOW = Math.max(0, T.FUEL_FLOW);
        if (this.tripped) T.FUEL_FLOW = 0;
      }
      T.LO_HDR_P = this.faults.lube
        ? Math.max(0, (T.LO_HDR_P || 0) - 0.04 * dt)
        : this.motors.mop1.run || this.motors.mop2.run
          ? 0.172
          : this.motors.eop.run
            ? 0.12
            : 0;
      T.LO_HDR_P2 = T.LO_HDR_P + 0.001;
      T.MOP_DISCH = T.LO_HDR_P * 3.2;
      T.HYD_OIL_P = this.motors.hop1.run || this.motors.hop2.run ? 9.59 : 0;
      [
        'VIB_1BX',
        'VIB_1BY',
        'VIB_EEBX',
        'VIB_EEBY',
        'VIB_TEBX',
        'VIB_TEBY',
      ].forEach(function (k) {
        T[k] = H25_TAGS[k].v * clamp(T.SPEED / 7280, 0, 1.2);
      });
      if (this.faults.vib && fl) {
        T.VIB_2BX = Math.min(200, T.VIB_2BX + 12 * dt);
        T.VIB_2BY = Math.min(200, T.VIB_2BY + 8 * dt);
      } else if (!this.faults.vib) {
        lag('VIB_2BX', fl ? 61.6 : 0, 3);
        lag('VIB_2BY', fl ? 41.1 : 0, 3);
      }
      var ratio = clamp(T.SPEED / 7280, 0, 1.12);
      T.GEN_KV = this.ctl.field41 ? this.voltageSet * clamp(ratio, 0, 1) : 0;
      lag('GEN_MVAR', this.ctl.brk52G ? this.reactiveSet : 0, 2);
      T.CPR_OUT_P = 1.3 * ratio;
      T.CPR_OUT_T = 25 + (408.6 - 25) * ratio;
      var targetT = this._startup
        ? this._startup.exh
        : 595 + (T.LOAD_SET - 30) * 5.5;
      if (this.faults.exh && fl) targetT += 150;
      targetT += clamp(back, -20, 20) * 0.1;
      this.updateTC(dt, fl ? 'run' : 'cool', targetT);
      this.recomputeExhaust(dt);
      function delay(name, condition, seconds, cause, item) {
        self._delays[name] = condition ? (self._delays[name] || 0) + dt : 0;
        if (self._delays[name] >= seconds) self.trip(cause, item);
      }
      if (fl && !this.tripped) {
        delay('vib', T.VIB_2BX >= 155, 3, 'HIGH VIBRATION TRIP', '39VTX');
        delay(
          'fuel',
          T.P1_PRESS <= 2.38,
          15,
          'FUEL GAS SUPPLY PRESS LOW',
          '63FGLT',
        );
        delay(
          'exh',
          T.EXH_T > (T.EXH_REF_T || 595.8) + 22,
          3,
          'EXHAUST OVERTEMP TRIP',
          '66TXT',
        );
      }
      if (!this.tripped && T.SPEED > 500 && T.LO_HDR_P < 0.059)
        this.trip('LUBE OIL PRESS LOW', '63QTX');
      if (!this.tripped && T.SPEED > 500 && T.HYD_OIL_P < 1)
        this.trip('HYDRAULIC PRESSURE LOW', '63HQLT');
      this.derive();
      T.GEN_MWH = (T.GEN_MWH ?? 0) + (T.GEN_POWER * dt) / 3600;
      if (this.flameOn())
        ['EOH_L', 'EOH_R', 'AOH_L', 'AOH_R', 'GAS_L', 'GAS_R'].forEach(
          function (k) {
            T[k] = (T[k] ?? 0) + dt / 3600;
          },
        );
      this.push();
      this.publish();
    },
    push: function () {
      if (typeof document === 'undefined') return;
      var els = document.querySelectorAll('[data-tag]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i],
          k = el.getAttribute('data-tag'),
          v = this.tags[k];
        if (v == null) continue;
        var d = H25_TAGS[k];
        var dp = el.getAttribute('data-dp');
        el.textContent =
          typeof v === 'string'
            ? v
            : Number.isFinite(v)
              ? v.toFixed(dp === null ? (d?.dp ?? 1) : Number(dp))
              : 'BAD';
      }
    },
    startReasons: function () {
      var r = [];
      if (this.tripped) r.push('Trip latched');
      if (this.tags.SPEED >= 50) r.push('Rotor not stopped');
      if (this.ctl.brk52G) r.push('52G closed');
      if (this.ctl.masterMode !== 'AUTO') r.push('Select AUTO');
      if (!(this.motors.mop1.run || this.motors.mop2.run))
        r.push('Main lube pump stopped');
      if (!(this.motors.ven1.run || this.motors.ven2.run))
        r.push('Ventilation stopped');
      if (!(this.motors.hop1.run || this.motors.hop2.run))
        r.push('Hydraulic pump stopped');
      if (Object.values(this.faults).some(Boolean))
        r.push('Active instructor fault');
      return r;
    },
    startCheckOk: function () {
      return this.startReasons().length === 0;
    },
    runStartupSeq: function () {
      if (!this.startCheckOk()) {
        this.log('REJECT', this.startReasons().join('; '));
        return false;
      }
      this._startup = { index: 0, t: 0, exh: 25 };
      this.seq = steps[0][0];
      this.ctl.master = 'START';
      this.bumpStarts();
      this.log('START', 'Automatic training sequence (accelerated timing)');
      return true;
    },
    advanceStartup: function (dt) {
      var s = this._startup;
      if (!s) return;
      s.t += dt;
      if (s.t >= steps[s.index][1]) {
        s.t -= steps[s.index][1];
        s.index++;
        if (s.index >= steps.length) {
          this._startup = null;
          this.seq = 'Base Load';
          this.log('SEQUENCE', 'Loading complete');
          return;
        }
        this.seq = steps[s.index][0];
        this.log('SEQUENCE', this.seq);
      }
      var f = clamp(s.t / steps[s.index][1], 0, 1),
        T = this.tags;
      var ranges = [
          [0, 700],
          [700, 700],
          [700, 700],
          [700, 4800],
          [4800, 7280],
          [7280, 7280],
          [7280, 7280],
        ],
        a = ranges[s.index];
      T.SPEED = a[0] + (a[1] - a[0]) * f;
      s.exh = [25, 25, 280, 460, 595, 595, 595][s.index];
      T.FOFFD = s.index < 2 ? 0 : 20 + 45 * clamp((s.index - 2 + f) / 4, 0, 1);
      T.FUEL_FLOW = s.index < 2 ? 0 : T.FOFFD * 100;
      if (s.index >= 4) this.ctl.field41 = true;
      if (s.index >= 6 && !this.ctl.brk52G) {
        if (!this.syncReady()) {
          this._startup = null;
          this.seq = 'Seq. Complete';
          this.log(
            'INHIBIT',
            'Synchronism check failed; close 52G only when permitted',
          );
          return;
        }
        this.ctl.brk52G = true;
      }
      T.GEN_POWER = s.index === 6 ? ((T.LOAD_SET * 28.6) / 30) * f : 0;
    },
    press: function (group, value) {
      if (group === 'master') {
        if (value === 'START') this.runStartupSeq();
        else {
          this._startup = null;
          this._osSpeed = 0;
          this.ctl.osMainRun = this.ctl.osBackupRun = false;
          this.ctl.master = 'STOP';
          this.ctl.brk52G = false;
          this.seq = this.tags.SPEED > 0 ? 'Coast Down' : 'Ready to Start';
          this.log('STOP', 'Sequence cancelled; fuel isolated');
          this.derive();
        }
      } else if (group === 'gtStatus') {
        this.log('REJECT', 'Status is read-only');
        return;
      } else if (group === 'masterMode') {
        if (value === 'OFF') this.press('master', 'STOP');
        this.ctl.masterMode = value;
      } else if (group in this.ctl) {
        this.ctl[group] = value;
        if (group === 'loadMode' && value === 'BASE') this.tags.LOAD_SET = 30;
      }
      this.derive();
      this.push();
      this.publish();
    },
    trip: function (cause, item) {
      if (item) this.tripItems[item] = true;
      if (this.tripped) return;
      this.tripped = true;
      this.tripCause = cause || 'MANUAL TRIP';
      this._startup = null;
      this.recovering = false;
      this.seq = 'Fired Shutdown';
      this.ctl.brk52G = false;
      this.ctl.master = 'STOP';
      this.ctl.osMainRun = this.ctl.osBackupRun = false;
      this._osSpeed = 0;
      this.tags.FUEL_FLOW = 0;
      this.tags.GEN_POWER = this.tags.GEN_MVAR = 0;
      ['ET_NT', 'ET_NT_R', 'TOT_ET', 'TOT_ET_R'].forEach(function (k) {
        this.tags[k] = (this.tags[k] ?? 0) + 1;
      }, this);
      this.log('TRIP', this.tripCause);
      this.derive();
      this.push();
    },
    masterReset: function () {
      if (Object.values(this.faults).some(Boolean)) {
        this.log('REJECT', 'Remove instructor fault before MASTER RESET');
        return false;
      }
      if (this.tags.SPEED > 500) {
        this.log('REJECT', 'Wait for coast-down below 500 rpm');
        return false;
      }
      this.tripped = false;
      this.tripCause = '';
      this.tripItems = {};
      this._delays = { vib: 0, fuel: 0, exh: 0 };
      this._spreadSt = { t: 0, alarm: false };
      this.spreadAlarm = false;
      this._startup = null;
      this.recovering = false;
      this.ctl.brk52G = false;
      this.seq = this.tags.SPEED > 0 ? 'Coast Down' : 'Ready to Start';
      this.lastReset = this._simT;
      this.log('RESET', 'Protection latch cleared; separate START required');
      this.derive();
      this.push();
      this.publish();
      return true;
    },
    bumpStarts: function () {
      ['TOT_ST', 'TOT_ST_R', 'FS_N', 'FS_N_R'].forEach(function (k) {
        this.tags[k] = (this.tags[k] ?? 0) + 1;
      }, this);
    },
    counterReset: function () {
      [
        'EOH_R',
        'AOH_R',
        'GAS_R',
        'FS_N_R',
        'ET_NT_R',
        'TOT_ST_R',
        'TOT_ET_R',
      ].forEach(function (k) {
        this.tags[k] = 0;
      }, this);
      this.tags.RST_DATE = 'SIM DAY ' + Math.floor(this._simT / 86400);
      this.tags.RST_TIME = this._simT.toFixed(1) + ' s';
      this.log('COUNTERS', 'Resettable counters cleared');
      this.push();
    },
    syncReady: function () {
      var C = H25_CFG.SYNC;
      return (
        !this.tripped &&
        this.ctl.field41 &&
        this.tags.SPEED >= 7200 &&
        Math.abs(this.tags.GEN_HZ - 50 + this.sync.df) <= C.dfMax &&
        Math.abs((this.tags.GEN_KV / 10.92 - 1) * 100 + this.sync.dvPct) <=
          C.dvPct &&
        Math.abs(this.sync.dphi) <= C.dphiMax
      );
    },
    release52G: function () {
      if (this.syncReady()) {
        this.ctl.brk52G = true;
        if (this.seq === 'Seq. Complete') this.seq = 'Part Load';
        this.log('BREAKER', '52G closed');
      } else this.log('REJECT', 'Synchronism check not satisfied');
      this.derive();
      this.push();
    },
    close41: function () {
      this.ctl.field41 = true;
      this.log('FIELD', '41 closed');
    },
    open41: function () {
      this.ctl.field41 = false;
      if (this.ctl.brk52G) this.trip('LOSS OF EXCITATION', '86G');
    },
    releaseIBH: function () {
      this.ctl.ibhLock = false;
      this.log('IBH', 'Lockout released');
    },
    setMotorMode: function (id, auto) {
      if (this.motors[id]) {
        this.motors[id].auto = !!auto;
        this.log('MOTOR', id + ' ' + (auto ? 'AUTO' : 'MANUAL'));
      }
    },
    motorStart: function (id) {
      if (this.motors[id]) {
        this.motors[id].run = true;
        this.motors[id].stopLatch = false;
        this.log('MOTOR', id + ' START');
      }
    },
    motorStop: function (id) {
      if (!this.motors[id]) return;
      this.motors[id].run = false;
      this.motors[id].stopLatch = true;
      var pairs = {
        mop1: 'mop2',
        mop2: 'mop1',
        hop1: 'hop2',
        hop2: 'hop1',
        mist1: 'mist2',
        mist2: 'mist1',
      };
      var p = pairs[id];
      if (p && this.motors[p].auto) this.motorStart(p);
      if (
        (id === 'gfc1' || id === 'gfc3') &&
        !this.motors.gfc1.run &&
        !this.motors.gfc3.run &&
        this.motors.gfc2.auto
      )
        this.motorStart('gfc2');
      this.log('MOTOR', id + ' STOP');
    },
    osEnable: function () {
      this.ctl.osTest = 'ENABLE';
    },
    osDisable: function () {
      this.ctl.osTest = 'DISABLE';
      this.osAbortMain();
      this.osAbortBackup();
    },
    osStartMain: function () {
      if (this.running() && this.ctl.osTest === 'ENABLE') {
        this.ctl.osMainRun = true;
        this.ctl.osBackupRun = false;
        this._osSpeed = this.tags.SPEED;
        this.log('TEST', 'Main overspeed started');
      }
    },
    osStartBackup: function () {
      if (this.running() && this.ctl.osTest === 'ENABLE') {
        this.ctl.osBackupRun = true;
        this.ctl.osMainRun = false;
        this._osSpeed = this.tags.SPEED;
        this.log('TEST', 'Backup overspeed started');
      }
    },
    osAbortMain: function () {
      this.ctl.osMainRun = false;
      this._osSpeed = 0;
    },
    osAbortBackup: function () {
      this.ctl.osBackupRun = false;
      this._osSpeed = 0;
    },
    liftCal: function (v) {
      this.ctl.lift = v;
      this.log(
        'INFO',
        'Lift selection ' + v + ' (calibration actuator model not implemented)',
      );
    },
    setFault: function (name, on) {
      if (name in this.faults) {
        this.faults[name] = !!on;
        this.log('INSTRUCTOR', name + ' ' + (on ? 'ON' : 'OFF'));
      }
    },
    clearFaults: function () {
      for (var k in this.faults) this.faults[k] = false;
      this.log('INSTRUCTOR', 'Fault inputs removed; reset separately');
    },
    burnerOpen: function () {
      var r = {},
        keys = ['F1', 'F21', 'F22', 'F23', 'F24'],
        tags = ['F1_GCV', 'F2_1_GCV', 'F2_2_GCV', 'F2_3_GCV', 'F2_4_GCV'];
      keys.forEach(function (k, i) {
        r[k] = !this.flameOn() || this.tags[tags[i]] < 5;
      }, this);
      return r;
    },
    scColor: function (id) {
      var ok = true;
      if (id === 'zero') ok = this.tags.SPEED < 50;
      else if (id === 'brk') ok = !this.ctl.brk52G;
      else if (id === 'sc3_4t') ok = !this.tripped;
      else if (id === 'sc1_off') ok = this.ctl.masterMode !== 'OFF';
      else if (id === 'sc4_qm')
        ok = this.motors.mop1.run || this.motors.mop2.run;
      else if (id === 'sc4_tb')
        ok = this.motors.ven1.run || this.motors.ven2.run;
      else if (id === 'sc1_hd')
        ok = this.motors.hop1.run || this.motors.hop2.run;
      else if (id === 'sc2_fgn') ok = !this.faults.fuel;
      else if (id === 'sc3_vd') ok = !this.faults.vib;
      return ok ? 'rgb(0,200,0)' : 'rgb(255,0,0)';
    },
    startLoop: function () {
      if (this._loop) clearInterval(this._loop);
      var self = this,
        last = performance.now(),
        acc = 0;
      this._loop = setInterval(function () {
        var now = performance.now(),
          elapsed = now - last;
        last = now;
        if (
          self.paused ||
          (typeof document !== 'undefined' && document.hidden)
        ) {
          acc = 0;
          return;
        }
        acc += Math.min(elapsed, 1000);
        while (acc >= 500) {
          self.tick(500);
          acc -= 500;
        }
      }, 100);
    },
  };
})();
