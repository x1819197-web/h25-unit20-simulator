/* H25 UNIT-20 simulation engine — HAQIQIY VAQT (real-time), dt asosida.
 *
 * Har tick haqiqiy o'tgan vaqtni oladi (performance.now deltasi yoki 500 ms),
 * SIM.timeScale ga ko'paytiriladi va <= 5 s fizika qadamlariga bo'linadi.
 * Hech qanday setTimeout/Date bilan sekvensiya YO'Q: hamma narsa sim vaqtida.
 *
 * Sekvensiya: PPE-10-1420 "Plant Start-up/Shut-down Curve" (real daqiqalar):
 *   crank 20 %/min -> 1456 rpm -> purge 12 min -> ignition 60 s ->
 *   warm-up 3 min -> accelerate 10.5 %/min -> FSNL -> sync -> load curve
 *   (0.12 -> 2.7 MW, 30 min -> 0.54 -> 6.78 MW, 30 min -> 1.36 MW/min).
 * Himoyalar: Karta ustavok GTU-2,3 (2025) — 12H/12H_P, 39VTX, 63QTX,
 * 26QT, 63FGLT, 66TXT, 30SPT, 63HQLT, 26DT.
 *
 * Displey qiymatlari baza rejimida referens bilan aynan mos: TC bank
 * o'rtachasi 595.0, spread 32.4/31.8/25.0 — hech qanday yashirin
 * kalibrovka (cal offset) ishlatilmaydi. */

window.H25_DEFAULT_MOTORS = function () {
  return {
    eop: {run:false, auto:true, standby:false, stopLatch:false},
    mop1: {run:true, auto:true, standby:false, stopLatch:false},
    mop2: {run:false, auto:true, standby:true, stopLatch:true},
    mist1: {run:false, auto:true, standby:true, stopLatch:true},
    mist2: {run:true, auto:true, standby:false, stopLatch:false},
    jop: {run:false, auto:true, standby:false, stopLatch:false},
    tgm: {run:false, auto:true, standby:false, stopLatch:true},
    hop1: {run:false, auto:true, standby:true, stopLatch:true},
    hop2: {run:true, auto:true, standby:false, stopLatch:false},
    ven1: {run:true, auto:false, standby:true, stopLatch:false},
    ven2: {run:true, auto:true, standby:false, stopLatch:false},
    bc1: {run:true, auto:true, standby:false, stopLatch:false},
    bc2: {run:true, auto:false, standby:true, stopLatch:false},
    evac1: {run:true, auto:true, standby:false, stopLatch:false, startGray:true},
    gfc1: {run:true, auto:true, standby:false, stopLatch:false},
    gfc2: {run:false, auto:true, standby:true, stopLatch:true},
    gfc3: {run:true, auto:true, standby:false, stopLatch:false},
    crank: {run:false, auto:true, standby:false, stopLatch:false}
  };
};

window.H25 = {
  tags: {},
  listeners: [],
  timeScale: 1,

  NOMSPD: 7280,   /* nominal 100 % tezlik, min-1 */
  NOMP: 28.6,     /* nominal quvvat, MW */

  ctl: {
    gtStatus: "Base Load",
    ffdStatus: "FFDT",
    location: "LOCAL",
    cooldown: "ON",
    masterMode: "AUTO",
    master: "STOP",
    speedMode: "AUTO",
    loadMode: "PRE SELECT",
    governor: "LLM",
    /* screen 3 synchro/exciter */
    brk52G: true,
    field41: true,
    fieldMode: "AUTO",
    avrMode: "AVR",
    pss: "OFF",
    s43L: "OFF",
    s43G: "AUTO",
    s43OPE: "TCP-HMI",
    ibhLock: true,
    osTest: "DISABLE",
    lift: "",
    osMainRun: false,
    osBackupRun: false
  },
  /* aux motors: run -> red RUNNING; stop -> green STOPPED. */
  motors: window.H25_DEFAULT_MOTORS(),

  seq: "Base Load",
  tripped: false,
  tripCause: "",
  tripItems: {},
  faults: { vib: false, exh: false, lube: false, fuel: false, flame: false },
  spreadAlarm: false,
  lastReset: 0,
  raiseLower: 0,
  vRaiseLower: 0,
  iRaiseLower: 0,

  /* ------------------------------------------------------------------ */
  init: function () {
    var T = this.tags = {};
    for (var k in H25_TAGS) {
      var d = H25_TAGS[k];
      T[k] = (d && typeof d === "object") ? d.v : d;
    }
    this.motors = window.H25_DEFAULT_MOTORS();
    this.timeScale = (H25_CFG.SIM && H25_CFG.SIM.timeScale) || 1;
    try {
      var mts = (location.search || "").match(/[?&]ts=(\d+)/);
      if (mts) this.setTimeScale(+mts[1]);
    } catch (e) {}

    this.seq = "Base Load";
    this.ctl.gtStatus = "Base Load";
    this.ctl.ffdStatus = "FFDT";
    this.ctl.brk52G = true;
    this.ctl.field41 = true;
    this.ctl.master = "STOP";
    this.ctl.masterMode = "AUTO";
    this.ctl.loadMode = "PRE SELECT";
    this.ctl.speedMode = "AUTO";
    this.ctl.governor = "LLM";
    this.ctl.cooldown = "ON";
    this.ctl.location = "LOCAL";
    this.ctl.osTest = "DISABLE";
    this.ctl.osMainRun = false;
    this.ctl.osBackupRun = false;
    this.ctl.osTestRun = "";
    this.tripped = false;
    this.tripCause = "";
    this.tripItems = {};
    this.faults = { vib: false, exh: false, lube: false, fuel: false, flame: false };
    this.spreadAlarm = false;

    /* TC ikki-inersiyali holati: seedli bias/fazalar, Math.random YO'Q. */
    var C = H25_CFG.TC;
    var rng = H25_RNG(C.seed);
    this.tcBias = []; this.tcPh1 = []; this.tcPh2 = [];
    this.tcGas = []; this.tcMetal = [];
    for (var i = 0; i < 18; i++) {
      this.tcBias.push(C.biasMin + rng() * (C.biasMax - C.biasMin));
      this.tcPh1.push(rng() * 2 * Math.PI);
      this.tcPh2.push(rng() * 2 * Math.PI);
      var bk = this.tcTag(i + 1);
      this.tcGas.push(T[bk]);
      this.tcMetal.push(T[bk]);
    }

    this._simT = 0;
    this._phaseT = 0;
    this._loadT = 0;
    this._dphi = 0;
    this._wheel = 499.9;
    this._flame = true;
    this._exhTgt = 595;
    this._exhFault = 0;
    this._vibRamp = 0;
    this._kvSet = 10.92;
    this._qSet = 4.3;
    this._delays = {};
    this._spreadSt = { t: 0, alarm: false };
    this._prevSeq = "Base Load";

    /* ?fault=vib,exh,lube,fuel,flame preselects trainer faults */
    try {
      var m = (location.search || "").match(/[?&]fault=([^&]+)/);
      if (m) {
        var parts = m[1].split(",");
        for (var q = 0; q < parts.length; q++) {
          var f = parts[q].replace("fuelgas", "fuel").replace("vibration", "vib");
          if (f in this.faults) this.faults[f] = true;
        }
      }
    } catch (e) {}
  },

  onTick: function (fn) { this.listeners.push(fn); },
  baseOf: function (k) { return H25_TAGS[k].v; },
  tcTag: function (i) { return "TC" + (i < 10 ? "0" + i : i); },
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  setTimeScale: function (v) {
    this.timeScale = Math.max(1, Math.min(300, +v || 1));
    return this.timeScale;
  },

  /* birinchi tartibli kechikish: h sekundda tgt ga intiladi */
  lag: function (k, tgt, tau, h) {
    var T = this.tags, cur = +T[k];
    if (!isFinite(cur)) cur = tgt;
    T[k] = cur + (tgt - cur) * (1 - Math.exp(-h / (tau || 1)));
  },

  /* ------------------------------------------------------------------ */
  /* ASOSIY TICK: haqiqiy dt -> sim dt -> <=5 s qadamlar */
  tick: function (dtMs) {
    var realS = (dtMs == null ? H25_CFG.TICK_MS : dtMs) / 1000;
    if (!(realS > 0)) { this.push(); return; }
    var sim = realS * (this.timeScale || 1);
    this._simT += sim;
    var maxH = (H25_CFG.SIM && H25_CFG.SIM.maxSubstepS) || 5;
    var rem = sim, guard = 0;
    while (rem > 1e-9 && guard < 20000) {
      var h = Math.min(rem, maxH);
      this.step(h);
      rem -= h;
      guard++;
    }
    this.push();
    for (var i = 0; i < this.listeners.length; i++) this.listeners[i](this.tags);
  },

  step: function (h) {
    this._phaseT += h;
    this.applyJogs(h);
    this.updateSequence(h);
    this.updateFuel(h);
    this.updateExhaustTarget(h);
    this.updateOverspeed(h);
    this.updateElectrical(h);
    this.updateAux(h);
    this.updateTC(h, this._flame ? "run" : "cool", this._exhTgt);
    this.recomputeExhaust(h);
    this.updateDerived(h);
    this.updateFfdStatus();
    this.protections(h);
  },

  /* ------------------------------------------------------------------ */
  /* RAISE / LOWER jog buyruqlari (bosib turiladi) */
  applyJogs: function (h) {
    var T = this.tags;
    if (this.raiseLower) {
      if (this.ctl.osMainRun || this.ctl.osBackupRun) {
        this._osRefPct = this.clamp((this._osRefPct || 110) +
          0.2 * this.raiseLower * h, 100, 112);
      } else if (this.running()) {
        T["LOAD_SET"] = this.clamp((+T["LOAD_SET"] || 30) +
          0.1 * this.raiseLower * h, 0, 32);
      }
    }
    if (this.vRaiseLower && !this.ctl.brk52G) {
      this._kvSet = this.clamp(this._kvSet + 0.02 * this.vRaiseLower * h, 9.5, 11.5);
    }
    if (this.iRaiseLower && this.ctl.brk52G) {
      this._qSet = this.clamp(this._qSet + 0.08 * this.iRaiseLower * h, -12, 16);
    }
  },

  setLoadSet: function (v) {
    this.tags["LOAD_SET"] = this.clamp(+v || 0, 0, 32);
    this.push();
    this.refreshUI();
  },

  /* ------------------------------------------------------------------ */
  /* SEKVENSIYA (PPE-10-1420) */
  setSeq: function (s) {
    if (this.seq !== s) {
      this._prevSeq = this.seq;
      this.seq = s;
      this._phaseT = 0;
      if (s === "Cranking" || s === "Purge") {
        this.motors.crank.run = true;
        this.motors.crank.stopLatch = false;
      } else {
        this.motors.crank.run = false;
      }
      if (s === "Cooling Down") {
        this.motors.tgm.run = true;
        this.motors.tgm.stopLatch = false;
      } else {
        this.motors.tgm.run = false;
      }
      if (this._prevSeq === "Seq. Complete") this.tags["PURGE_CURRENT"] = 0;
    }
    this.ctl.gtStatus = s;
  },

  updateSequence: function (h) {
    var T = this.tags, S = H25_CFG.SEQ, sp = +T.SPEED || 0;

    if (this.seq === "Cranking") {
      sp += this.NOMSPD * (S.crankRatePctPerMin / 100) / 60 * h;
      if (sp >= S.purgeSpeed) { sp = S.purgeSpeed; this.setSeq("Purge"); }
      T["PURGE_CURRENT"] = 0;
    } else if (this.seq === "Purge") {
      sp = Math.min(S.purgeSpeed, sp + 300 * h);
      T["PURGE_CURRENT"] = Math.min(S.purgeMin, this._phaseT / 60);
      if (this._phaseT >= S.purgeMin * 60 && this.ctl.masterMode !== "CRANK") {
        this.setSeq("GT Firing");
      }
    } else if (this.seq === "GT Firing") {
      sp = S.purgeSpeed;
      T["PURGE_CURRENT"] = 0;
      if (this._phaseT >= S.ignitionHoldS) this.setSeq("Warming up");
    } else if (this.seq === "Warming up") {
      sp = S.purgeSpeed;
      if (this._phaseT >= S.warmupMin * 60 && this.ctl.masterMode !== "FIRE") {
        this.setSeq("Accelerating");
      }
    } else if (this.seq === "Accelerating") {
      sp += this.NOMSPD * (S.accelPctPerMin / 100) / 60 * h;
      if (sp >= this.NOMSPD) { sp = this.NOMSPD; this.setSeq("Seq. Complete"); }
    } else if (this.seq === "Seq. Complete") {
      /* sinxronoskop sekin aylanadi: 0.035 Hz slip */
      if (this.ctl.osMainRun || this.ctl.osBackupRun) {
        sp = +T["SPEED"] || this.NOMSPD;       /* overspeed test boshqaradi */
      } else if (this.ctl.speedMode === "MANUAL" && this.raiseLower) {
        sp = this.clamp(sp + 3 * this.raiseLower * h, 7000, 7480);
      } else {
        sp = this.NOMSPD * 1.0007;
      }
    } else if (this.seq === "Loading" || this.seq === "Base Load" ||
               this.seq === "Part Load" || this.seq === "Unloading") {
      sp = this.NOMSPD;
      this.updateLoad(h);
    } else if (this.seq === "Fired Shutdown") {
      if (this._phaseT >= 2) this.setSeq("Coast Down");
    } else if (this.seq === "Coast Down") {
      sp = sp * Math.exp(-h / (S.coastTauS || 420));
      if (sp < 150) { sp = 0; this.setSeq("Cooling Down"); }
    } else if (this.seq === "Cooling Down") {
      sp = 0;
      if (!this.tripped && this._wheel < (S.coolTargetC || 66)) this.setSeq("Ready to Start");
    } else if (this.seq === "Ready to Start") {
      sp = sp * Math.exp(-h / (S.coastTauS || 420));
      if (sp < 1) sp = 0;
    }

    T["SPEED"] = sp;
    T["SPEED_PCT"] = sp / (this.NOMSPD / 100);
    this._updateWheel(h);
  },

  /* yuklama egri chizig'i: t - yuklash boshlanganidan (s), set - MW */
  loadCurve: function (t, set) {
    var S = H25_CFG.SEQ;
    var r0 = S.loadRate0to10 / 60;         /* MW/s */
    var r1 = S.loadRate10to25 / 60;
    var r2 = S.loadRate25plus / 60;
    var t1 = S.p10MW / r0;                              /* 1350 s */
    var t2 = t1 + S.hold10Min * 60;                     /* +30 min */
    var t3 = t2 + (S.p25MW - S.p10MW) / r1;             /* +453 s */
    var t4 = t3 + S.hold25Min * 60;                     /* +30 min */
    var t5 = t4 + Math.max(0, set - S.p25MW) / r2;      /* +963 s */
    if (t < t1) return r0 * t;
    if (t < t2) return S.p10MW;
    if (t < t3) return S.p10MW + r1 * (t - t2);
    if (t < t4) return S.p25MW;
    if (t < t5) return S.p25MW + r2 * (t - t4);
    return set;
  },

  setpointPower: function () {
    var s = +this.tags["LOAD_SET"];
    if (!isFinite(s)) s = 30;
    return this.clamp(s - 1.4, 0, 30.6);
  },

  updateLoad: function (h) {
    var T = this.tags, S = H25_CFG.SEQ;
    var P = Math.max(0, +T["GEN_POWER"] || 0);
    var set = this.setpointPower();

    if (this.seq === "Loading") {
      this._loadT += h;
      P = this.loadCurve(this._loadT, set);
      T["GEN_POWER"] = P;
      if (P >= set - 0.001 && this._loadT > 120) {
        this.setSeq(set >= 27.5 ? "Base Load" : "Part Load");
      }
    } else if (this.seq === "Unloading") {
      P -= (S.unloadRate / 60) * h;
      if (P <= 0.01) {
        P = 0;
        T["GEN_POWER"] = 0;
        this.ctl.brk52G = false;
        this._dphi = 0;
        this._qSet = 0;
        this.setSeq("Fired Shutdown");
      } else {
        T["GEN_POWER"] = P;
      }
    } else { /* Base Load / Part Load: setpointga 1.36 MW/min */
      var step = (S.loadRate25plus / 60) * h;
      if (P < set - 0.001) P = Math.min(set, P + step);
      else if (P > set + 0.001) P = Math.max(set, P - step);
      T["GEN_POWER"] = P;
      var want = set >= 27.5 ? "Base Load" : "Part Load";
      if (Math.abs(P - set) < 0.03 && this.seq !== want) this.setSeq(want);
    }
    T["MW_FDBK"] = T["GEN_POWER"];
  },

  _updateWheel: function (h) {
    var T = this.tags, S = H25_CFG.SEQ;
    var sp = +T["SPEED"] || 0, P = Math.max(0, +T["GEN_POWER"] || 0);
    var wTgt;
    if (this._flame) wTgt = 490 + 9.9 * Math.min(1, P / 28.6);
    else if (sp > 200) wTgt = 120 + 350 * Math.min(1, sp / this.NOMSPD);
    else wTgt = 60;
    var tau = (this.ctl.cooldown === "ON") ? (S.coolTauOnS || 300) : (S.coolTauOffS || 900);
    if (wTgt < this._wheel) this._wheel += (wTgt - this._wheel) * (1 - Math.exp(-h / tau));
    else this._wheel += (wTgt - this._wheel) * (1 - Math.exp(-h / 60));
    T["WHEEL_MAX_T"] = this._wheel;
    if (this.seq === "Cooling Down" && !this.tripped &&
        this._wheel < (S.coolTargetC || 66)) this.setSeq("Ready to Start");
  },

  /* ------------------------------------------------------------------ */
  /* YONILG'I: FFD -> SRV/GCV -> sarf */
  updateFuel: function (h) {
    var T = this.tags, S = H25_CFG.SEQ;
    var P = Math.max(0, +T["GEN_POWER"] || 0);
    var seq = this.seq, tgt = 0;

    if (seq === "GT Firing") tgt = S.ignFfd;
    else if (seq === "Warming up") tgt = S.warmFfd;
    else if (seq === "Accelerating") {
      var k = this.clamp(((+T["SPEED"] || 0) - S.purgeSpeed) / (this.NOMSPD - S.purgeSpeed), 0, 1);
      tgt = S.warmFfd + k * 8;
    } else if (seq === "Seq. Complete") tgt = 30;
    else if (seq === "Loading" || seq === "Base Load" || seq === "Part Load" || seq === "Unloading") {
      tgt = 30 + 35.2 * Math.min(1, P / 28.6);
    }
    if (this.faults.flame && this.running()) tgt = 0;
    if (this.tripped) tgt = 0;

    /* FFD limiterlari (screen 2 barlari) yuk bilan siljiydi */
    var d = (+T["LOAD_SET"] || 30) - 30;
    T["FFD_MIN"] = 9.8;
    T["FFD_SU"] = 100.0;
    T["FFD_SD"] = 100.0;
    T["FFD_ACC"] = 73.0 + d * 0.8;
    T["FFD_SPD"] = 77.8 + d * 1.2;
    T["FFD_LLM"] = 65.7 + d * 1.5;
    T["FFD_TEMP"] = 64.0 + d * 1.5;
    if (this.ctl.governor === "LLM") tgt = Math.min(tgt, T["FFD_LLM"]);
    else tgt = Math.min(tgt, T["FFD_SPD"]);

    var tau = (tgt > (+T["FOFFD"] || 0)) ? 2.5 : 1.5;
    this.lag("FOFFD", Math.max(0, tgt), tau, h);

    var f = +T["FOFFD"] || 0;
    this.lag("SRV_POS", 0.432 * f, 2, h);
    this.lag("F1_GCV", 0.374 * f, 2, h);
    this.lag("F2_1_GCV", 0.716 * f, 2, h);
    var kd2 = +T["KD2H"] || 36.3, kd3 = +T["KD3H"] || 44.8, kd4 = +T["KD4H"] || 50.8;
    this.lag("F2_2_GCV", f >= kd2 ? 0.716 * f : 0, 2, h);
    this.lag("F2_3_GCV", f >= kd3 ? 0.716 * f : 0, 2, h);
    this.lag("F2_4_GCV", f >= kd4 ? 0.716 * f : 0, 2, h);
    T["F20RATIO"] = 0.92;

    this._flame = !this.tripped && tgt > 5 && f > 5 &&
      ["GT Firing", "Warming up", "Accelerating", "Seq. Complete",
       "Loading", "Base Load", "Part Load", "Unloading"].indexOf(seq) >= 0;
  },

  /* ------------------------------------------------------------------ */
  /* ELEKTRIKA, SINXRONIZATSIYA (43-25L / 43-25G / 52G / 41) */
  syncOk: function () {
    var T = this.tags, SY = H25_CFG.SYNC;
    return !this.tripped && !this.ctl.brk52G && this.ctl.field41 &&
      (+T["SPEED"] || 0) >= 7200 &&
      Math.abs(+T["SYNC_DF"] || 0) <= SY.dfMax &&
      Math.abs(+T["SYNC_DV"] || 0) <= SY.dvPct &&
      Math.abs(+T["SYNC_DPHI"] || 0) <= SY.dphiMax;
  },

  closeBreaker: function () {
    if (this.tripped || this.ctl.brk52G) return false;
    this.ctl.brk52G = true;
    this._dphi = 0;
    this._qSet = 4.3;
    this._loadT = 0;
    this.tags["GEN_POWER"] = 0;
    this.tags["MW_FDBK"] = 0;
    this.setSeq("Loading");
    this.refreshUI();
    return true;
  },

  updateElectrical: function (h) {
    var T = this.tags, SY = H25_CFG.SYNC;
    var sp = +T["SPEED"] || 0;
    var ratio = this.clamp(sp / this.NOMSPD, 0, 1.2);
    var closed = !!this.ctl.brk52G;

    T["GRID_HZ"] = SY.gridHz;
    T["GRID_KV"] = SY.gridKV;
    T["GEN_HZ"] = closed ? SY.gridHz : SY.gridHz * ratio;

    var vTgt;
    if (closed) vTgt = SY.gridKV;
    else if (this.ctl.field41) vTgt = this._kvSet * Math.min(1, sp / 4000);
    else vTgt = 0;
    this.lag("GEN_KV", vTgt, 2.0, h);

    this.lag("GEN_MVAR", closed ? this._qSet : 0, 3.0, h);

    var P = Math.max(0, +T["GEN_POWER"] || 0);
    var Q = Math.max(0, +T["GEN_MVAR"] || 0);
    T["GEN_A"] = closed ? 53.035 * P : 0;
    T["GEN_PF"] = closed ? (P > 0.05 ? P / Math.sqrt(P * P + Q * Q) : 0.99) : 0;
    T["EXC_V"] = this.ctl.field41 ? 46.0 * (+T["GEN_KV"] || 0) / 10.92 : 0;
    T["EXC_A"] = this.ctl.field41 ? 5.6 * (0.6 + 0.4 * Math.min(1, P / 28.6)) : 0;

    T["SYNC_DF"] = (+T["GEN_HZ"] || 0) - SY.gridHz;
    T["SYNC_DV"] = ((+T["GEN_KV"] || 0) - SY.gridKV) / SY.gridKV * 100;

    var before = this._dphi;
    if (closed) this._dphi = 0;
    else {
      this._dphi += 360 * (+T["SYNC_DF"] || 0) * h;
      while (this._dphi > 180) this._dphi -= 360;
      while (this._dphi < -180) this._dphi += 360;
    }
    T["SYNC_DPHI"] = this._dphi;
    T["SYNC_OK"] = this.syncOk() ? 1 : 0;

    /* avtosinxronizator: Seq. Complete da faza oynasidan o'tishda yopadi */
    var crossed = before !== 0 && this._dphi !== 0 && (before > 0) !== (this._dphi > 0);
    if (this.seq === "Seq. Complete" && !closed && this.ctl.s43G === "AUTO" &&
        !this.ctl.osMainRun && !this.ctl.osBackupRun &&
        this._phaseT > 2 &&
        Math.abs(+T["SYNC_DF"] || 0) <= SY.dfMax &&
        Math.abs(+T["SYNC_DV"] || 0) <= SY.dvPct &&
        (Math.abs(this._dphi) <= SY.dphiMax || crossed)) {
      this.closeBreaker();
    }

    T["GEN_MWH"] = (+T["GEN_MWH"] || 488380.5) + P * h / 3600;

    if (this.running()) {
      var dh = h / 3600;
      T["EOH_L"] = (+T["EOH_L"] || 23076.5) + dh;
      T["EOH_R"] = (+T["EOH_R"] || 23076.5) + dh;
      T["AOH_L"] = (+T["AOH_L"] || 18476.5) + dh;
      T["AOH_R"] = (+T["AOH_R"] || 18476.5) + dh;
      T["GAS_L"] = (+T["GAS_L"] || 18476.5) + dh;
      T["GAS_R"] = (+T["GAS_R"] || 18476.5) + dh;
    }
  },

  running: function () {
    return !this.tripped && !!this.ctl.brk52G &&
      (this.seq === "Base Load" || this.seq === "Part Load" ||
       this.seq === "Loading" || this.seq === "Unloading");
  },

  spinning: function () {
    return (+this.tags["SPEED"] || 0) > 500 || this._flame;
  },

  /* ------------------------------------------------------------------ */
  /* YORDAMCHI TIZIMLAR: moy, gidravlika, sovutish, tebranish, gaz */
  updateAux: function (h) {
    var T = this.tags, sp = +T["SPEED"] || 0;
    var ratio = this.clamp(sp / this.NOMSPD, 0, 1);
    var P = Math.max(0, +T["GEN_POWER"] || 0);
    var mop = this.motors.mop1.run || this.motors.mop2.run;
    var eop = this.motors.eop.run;

    /* lube oil header (63QTX) */
    if (!this.faults.lube) {
      this.lag("LO_HDR_P", mop ? 0.172 : (eop ? 0.115 : 0), 1.5, h);
      this.lag("MOP_DISCH", mop ? 0.550 : (eop ? 0.400 : 0), 1.5, h);
    } else {
      T["LO_HDR_P"] = Math.max(0, (+T["LO_HDR_P"] || 0) - 0.04 * h);
      T["MOP_DISCH"] = Math.max(0, (+T["MOP_DISCH"] || 0) - 0.06 * h);
    }
    T["LO_HDR_P2"] = (+T["LO_HDR_P"] || 0) + 0.001;
    T["LO_FILT_DP"] = 0.020;

    /* EOP avtomatik ishga tushadi bosim pasaysa (real interlock) */
    if (!this.motors.eop.run && this.motors.eop.auto &&
        (+T["LO_HDR_P"] || 0) < 0.10 && (sp > 100 || this._flame)) {
      this.motors.eop.run = true;
      this.motors.eop.stopLatch = false;
    }

    this.lag("LUBE_HDR_T", this._flame ? 52.5 : 35, 240, h);

    /* hydraulic supply (63HQLT) */
    var hop = this.motors.hop1.run || this.motors.hop2.run;
    this.lag("HYD_OIL_P", hop ? 9.59 : 0, 1.5, h);

    /* fuel gas supply (63FGLT) */
    if (this.faults.fuel) {
      var p1 = +T["P1_PRESS"];
      if (!isFinite(p1)) p1 = 3.579;
      T["P1_PRESS"] = Math.max(0, p1 - 0.5 * h);
    } else {
      this.lag("P1_PRESS", 3.579, 2, h);
    }

    /* tebranish: tezlikka proporsional + fault rampasi */
    var vb = function (k) { return (H25_TAGS[k].v || 0) * ratio; };
    if (this.faults.vib && this.running()) this._vibRamp += 12 * h;
    else this._vibRamp = Math.max(0, this._vibRamp - 6 * h);
    T["VIB_2BX"] = vb("VIB_2BX") + this._vibRamp;
    T["VIB_2BY"] = vb("VIB_2BY") + this._vibRamp * 0.65;
    T["VIB_1BX"] = vb("VIB_1BX") + this._vibRamp * 0.20;
    T["VIB_1BY"] = vb("VIB_1BY");
    T["VIB_EEBX"] = vb("VIB_EEBX");
    T["VIB_EEBY"] = vb("VIB_EEBY");
    T["VIB_TEBX"] = vb("VIB_TEBX");
    T["VIB_TEBY"] = vb("VIB_TEBY");

    /* kompressor / generator issiqlik nuqtalari */
    this.lag("CPR_IN_T", 23.6 - 2.3 * ratio, 30, h);
    this.lag("CPR_OUT_P", 1.30 * Math.pow(Math.max(0, ratio), 1.6), 4, h);
    this.lag("CPR_OUT_T", 25 + 383.6 * (0.55 * ratio + 0.45 * Math.min(1, P / 28.6)), 20, h);
    this.lag("GAS_FLOW", Math.max(0, (+T["FOFFD"] || 0) - 9.8) / 55.4 * 6626, 2, h);
    this.lag("FUEL_FLOW", Math.max(0, (+T["FOFFD"] || 0) - 9.8) / 55.4 * 6626, 2, h);
    T["FUEL_GAS_T"] = this._flame ? 104.7 : 23.6;
    T["FUEL_GAS_P"] = Math.min(3.577, +T["P1_PRESS"] || 0);
    T["FG_CT"] = 102.4;
    T["P2_PRESS"] = 0.3 + 2.19 * Math.min(1, Math.max(0, (+T["FOFFD"] || 0) / 65.2));

    /* stator / cooling air follows load */
    this.lag("STATOR_A", 40 + 49.3 * Math.min(1, P / 28.6), 120, h);
    this.lag("STATOR_B", 42 + 49.3 * Math.min(1, P / 28.6), 120, h);
    this.lag("STATOR_C", 41 + 49.8 * Math.min(1, P / 28.6), 120, h);
    this.lag("WARM_AIR_T", 30 + 47.1 * Math.min(1, P / 28.6), 120, h);
    this.lag("CLR_OUT_T", 23.4 + 10.0 * Math.min(1, P / 28.6), 120, h);
  },

  /* ------------------------------------------------------------------ */
  /* CHIQISH HARORATI: 18 TC ikki-inersiyali model */
  updateTC: function (h, mode, exhTgt) {
    var C = H25_CFG.TC, T = this.tags, EXM = H25_EXM;
    var tamb = +T["AMB_T"] || 23.6;
    var tauG = (mode === "run") ? C.tauRun : C.tauGasCool;
    var tauM = (mode === "run") ? C.tauMetalRun : C.tauMetalCool;
    for (var i = 1; i <= 18; i++) {
      var tag = this.tcTag(i);
      var off = H25_TAGS[tag].v - 595.0;
      var gasTgt = (mode === "run") ? exhTgt + off + this.tcBias[i - 1] : tamb;
      var r = EXM.tcStep(this.tcGas[i - 1], this.tcMetal[i - 1],
                         gasTgt, tauG, tauM, h, C.metalW);
      this.tcGas[i - 1] = r[0];
      this.tcMetal[i - 1] = r[1];
      T[tag] = r[2] + EXM.smoothNoise(this._simT, this.tcPh1[i - 1], this.tcPh2[i - 1]);
    }
  },

  updateExhaustTarget: function (h) {
    var T = this.tags, P = Math.max(0, +T["GEN_POWER"] || 0);
    var sp = +T["SPEED"] || 0, base = 25;
    if (this._flame) {
      var seq = this.seq;
      if (seq === "GT Firing") base = 300;
      else if (seq === "Warming up") base = 320;
      else if (seq === "Accelerating") {
        base = 320 + 30 * this.clamp((sp - 1456) / (this.NOMSPD - 1456), 0, 1);
      } else if (seq === "Seq. Complete") base = 350;
      else base = 350 + 245 * Math.sqrt(Math.min(1, P / 28.6));
      if (P > 28.6) base += (P - 28.6) * 5.5;
    }
    if (this.faults.exh && this._flame) this._exhFault = Math.min(90, this._exhFault + 8 * h);
    else this._exhFault = Math.max(0, this._exhFault - 4 * h);
    this._exhTgt = base + this._exhFault;
  },

  recomputeExhaust: function (h) {
    var T = this.tags, EXM = H25_EXM, tcs = [];
    for (var i = 1; i <= 18; i++) tcs.push(+T[this.tcTag(i)] || 0);
    var mean = EXM.exTempMean(tcs);
    T["EXH_T"] = mean;
    var sp = EXM.exSpreads(tcs);
    T["SPREAD_1"] = sp.s1;
    T["SPREAD_2"] = sp.s2;
    T["SPREAD_3"] = sp.s3;
    T["EXH_SPREAD_3"] = sp.s3;
    T["ALLOW_SPREAD"] = EXM.allowSpread(Math.max(0, +T["GEN_POWER"] || 0));
    for (var j = 1; j <= 18; j++) {
      var ct = "CT" + (j < 10 ? "0" + j : j);
      T[ct] = T[this.tcTag(j)];
    }
    T["TX_MED"] = mean;
    T["OS_EXH_T"] = mean;

    if (!this.tripped) {
      var st = EXM.spreadStep(this._spreadSt, sp.s1, T["ALLOW_SPREAD"], h);
      this.spreadAlarm = (st !== "ok");
      if (st === "trip") this.trip("HIGH EXHAUST TEMPERATURE SPREAD", "30SPT");
    } else {
      this._spreadSt.t = 0;
      this.spreadAlarm = false;
    }
  },

  /* ------------------------------------------------------------------ */
  /* OVERS SPEED TEST (screen 19): faqat yuksiz, 52G ochiq holatda */
  updateOverspeed: function (h) {
    var T = this.tags;
    if (!(this.ctl.osMainRun || this.ctl.osBackupRun)) return;
    if (this.tripped || this.ctl.brk52G) return;
    if ((+T["SPEED"] || 0) < 7000) return;
    var target = 72.8 * (this._osRefPct || (this.ctl.osMainRun ? 110 : 111.2));
    var sp = Math.min(target, (+T["SPEED"] || 0) + 12 * h);
    T["SPEED"] = sp;
    T["SPEED_PCT"] = sp / (this.NOMSPD / 100);
    T["OS_TURB_SPEED"] = Math.round(sp);
    T["OS_SPEED_REF"] = T["SPEED_PCT"];
    if ((+T["OS_MAX_SPEED"] || 0) < sp) T["OS_MAX_SPEED"] = Math.round(sp);
  },

  /* ------------------------------------------------------------------ */
  /* HIMOYALAR (Karta ustavok GTU-2,3 2025) */
  _held: function (key, cond, delay, h) {
    var d = this._delays[key];
    if (!d) d = this._delays[key] = { t: 0 };
    d.t = cond ? d.t + h : 0;
    return d.t >= delay;
  },

  protections: function (h) {
    if (this.tripped) return;
    var T = this.tags, PR = H25_CFG.PROT;
    var sp = +T["SPEED"] || 0;
    var spin = sp > 500 || this._flame;

    /* 12H / 12H_P overspeed */
    if (!this.ctl.osBackupRun && sp >= 72.8 * PR.overSpeedPct) {
      this.trip("MAIN OVERSPEED TRIP", "12H"); return;
    }
    if (this.ctl.osBackupRun && sp >= 72.8 * PR.overSpeed2Pct) {
      this.trip("BACKUP OVERSPEED TRIP", "12H_P"); return;
    }

    /* 39VTX high vibration, 3 s */
    var mv = Math.max(+T["VIB_2BX"] || 0, +T["VIB_2BY"] || 0,
                      +T["VIB_1BX"] || 0, +T["VIB_1BY"] || 0,
                      +T["VIB_EEBX"] || 0, +T["VIB_EEBY"] || 0,
                      +T["VIB_TEBX"] || 0, +T["VIB_TEBY"] || 0);
    if (this._held("vib", spin && mv >= PR.vibTrip, PR.vibDelayS, h)) {
      this.trip("HIGH VIBRATION TRIP", "39VTX"); return;
    }

    /* 63QTX lube oil pressure low, 3 s */
    if (this._held("lubep", spin && (+T["LO_HDR_P"] || 0) <= PR.lubePTrip, PR.lubePDelayS, h)) {
      this.trip("LUBE OIL PRESS LOW", "63QTX"); return;
    }
    /* 26QT lube oil header temperature high, 3 s */
    if (this._held("lubet", spin && (+T["LUBE_HDR_T"] || 0) >= PR.lubeTTrip, 3, h)) {
      this.trip("LUBE OIL HEADER TEMP HIGH", "26QT"); return;
    }
    /* 63FGLT fuel gas supply pressure low, 15 s */
    if (this._held("fuelp", spin && (+T["P1_PRESS"] || 0) <= PR.fuelPTrip, PR.fuelPDelayS, h)) {
      this.trip("FUEL GAS SUPPLY PRESS LOW", "63FGLT"); return;
    }
    /* 63HQLT hydraulic supply pressure low, 2 s */
    if (this._held("hyd", spin && (+T["HYD_OIL_P"] || 0) <= PR.hydTrip, PR.hydDelayS, h)) {
      this.trip("HYDRAULIC SUPPLY PRESS LOW", "63HQLT"); return;
    }

    /* 66TXT exhaust overtemperature: EXH_REF + 22, 3 s, faqat o'sishda */
    var eNow = +T["EXH_T"] || 0, eRef = (+T["EXH_REF_T"] || 350) + PR.exhTripMargin;
    var rising = (this._prevExh == null) || (eNow >= this._prevExh - 0.5);
    this._prevExh = eNow;
    if (this._held("exh", this.running() && eNow >= eRef && rising, PR.exhDelayS, h)) {
      this.trip("EXHAUST OVERTEMP TRIP", "66TXT"); return;
    }

    /* 26DT loss of flame: yuk ostida olov bor, EXH juda past, 3 s */
    if (this._held("flame", this.running() && eNow < PR.flameLossExhC, PR.flameLossDelayS, h)) {
      this.trip("LOSS OF FLAME TRIP", "26DT"); return;
    }
  },

  /* ------------------------------------------------------------------ */
  /* HOLAT MATNI / DISPLEYLAR */
  updateFfdStatus: function () {
    var s = this.seq;
    if (s === "Cranking" || s === "Purge") this.ctl.ffdStatus = "FFDN";
    else if (s === "GT Firing" || s === "Warming up") this.ctl.ffdStatus = "FFDSU";
    else if (s === "Accelerating") this.ctl.ffdStatus = "FFDAOC";
    else if (s === "Loading" || s === "Part Load") this.ctl.ffdStatus = "FFDNLL";
    else if (s === "Base Load") this.ctl.ffdStatus = "FFDT";
    else this.ctl.ffdStatus = "FFDSD";
  },

  updateDerived: function (h) {
    var T = this.tags;
    var P = Math.max(0, +T["GEN_POWER"] || 0);
    var sp = +T["SPEED"] || 0;
    var ratio = this.clamp(sp / this.NOMSPD, 0, 1);

    T["MW_FDBK"] = P;
    T["MW_REF"] = this.setpointPower() + 0.9;

    /* tezlik buyrug'i (SPEED REF): sekvensiya fazasiga mos */
    var sref = 0;
    if (this.seq === "Cranking" || this.seq === "Purge" ||
        this.seq === "GT Firing" || this.seq === "Warming up") sref = 20;
    else if (this.seq === "Accelerating") sref = sp / (this.NOMSPD / 100);
    else if (this.seq === "Seq. Complete" || this.seq === "Loading" ||
             this.seq === "Base Load" || this.seq === "Part Load") sref = 100;
    T["SPEED_REF"] = sref;

    var igvTgt;
    if (sp < 3000) igvTgt = 34;
    else if (!this.running()) igvTgt = 34 + 20 * ratio;
    else igvTgt = 54 + Math.min(28.6, P);
    this.lag("IGV_POS", igvTgt, 5, h);

    var refTgt = 350 + 245.8 * Math.sqrt(Math.min(1, P / 28.6));
    this.lag("EXH_REF_T", refTgt, 10, h);

    this.lag("IBH_POS", -0.1, 5, h);
    T["IBH_REF"] = Math.max(0, +T["IBH_POS"] || 0);
    T["IBH_FDBK"] = +T["IBH_POS"] || 0;
    T["PURGE_FINAL"] = H25_CFG.SEQ.purgeMin;

    /* data-report ko'zgulari */
    T["TB_SPEED"] = Math.round(sp);
    T["CS019"] = Math.round(sp);
    T["ACT_P1"] = P;
    T["ACT_P2"] = Math.max(0, P - 0.29);
    T["REACT_P"] = (+T["GEN_MVAR"] || 0) + 0.6;
    T["GEN_V_DR"] = T["GEN_KV"];
    T["GEN_C_DR"] = T["GEN_A"];
    T["FLD_V"] = T["EXC_V"];
    T["FLD_C"] = T["EXC_A"];
    T["TX_MED"] = T["EXH_T"];
    T["IGV_REF"] = (+T["IGV_POS"] || 0) - 0.2;
    T["MBA_CT02"] = T["CPR_OUT_T"];
    T["BA10_T2B"] = T["CPR_OUT_T"];
    T["BL30_P01"] = T["IBH_IN_P"];
    T["BL30_P02"] = T["IBH_OUT_P"];
    T["BL30_T03"] = T["IBH_OUT_T"];
    T["OS_EXH_T"] = T["EXH_T"];
    T["OS_TURB_SPEED"] = Math.round(sp);
    T["OS_SPEED_REF"] = T["SPEED_PCT"];
    T["LO_HDR_P2"] = (+T["LO_HDR_P"] || 0) + 0.001;

    var mv = Math.max(+T["VIB_2BX"] || 0, +T["VIB_2BY"] || 0,
                      +T["VIB_1BX"] || 0, +T["VIB_1BY"] || 0,
                      +T["VIB_EEBX"] || 0, +T["VIB_EEBY"] || 0,
                      +T["VIB_TEBX"] || 0, +T["VIB_TEBY"] || 0);
    T["MAX_VIB"] = mv;
    if (mv > (+T["OS_MAX_VIB"] || 0)) T["OS_MAX_VIB"] = mv;

    /* wheelspace nuqtalari issiqlik bilan kichrayadi */
    var wr = this._wheel / 499.9;
    var wsTags = ["WS1A", "WS1B", "WS1C", "WS1D", "WS2A", "WS2B", "WS2C", "WS2D",
                  "WS3A", "WS3B", "WS3C", "WS3D"];
    for (var i = 0; i < wsTags.length; i++) {
      T[wsTags[i]] = Math.round(H25_TAGS[wsTags[i]].v * wr);
    }
    var mb = ["MBA20_A1", "MBA20_B1", "MBA20_A2", "MBA20_B2", "MBA20_A3", "MBA20_B3",
              "MBA20_A4", "MBA20_B4", "MBA20_A5", "MBA20_B5", "MBA20_A6", "MBA20_B6"];
    for (var k = 0; k < mb.length; k++) {
      T[mb[k]] = Math.round(H25_TAGS[mb[k]].v * wr);
    }
  },

  /* ------------------------------------------------------------------ */
  push: function () {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    var els = document.querySelectorAll("[data-tag]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], k = el.getAttribute("data-tag");
      if (!(k in this.tags)) continue;
      var v = this.tags[k];
      if (typeof v === "string") { el.textContent = v; continue; }
      if (!isFinite(v)) v = 0;
      var def = H25_TAGS[k] || {};
      var dp = el.getAttribute("data-dp");
      dp = (dp === null) ? (def.dp || 0) : parseInt(dp, 10);
      el.textContent = (+v).toFixed(dp);
    }
  },

  refreshUI: function () {
    try { if (typeof refreshButtons === "function") refreshButtons(); } catch (e) {}
    try { if (typeof refreshCustom === "function") refreshCustom(); } catch (e) {}
  },

  /* ------------------------------------------------------------------ */
  /* OPERATOR BUYRUQLARI */
  press: function (group, value) {
    switch (group) {
      case "location": this.ctl.location = value; break;
      case "cooldown": this.ctl.cooldown = value; break;
      case "governor": this.ctl.governor = value; break;
      case "masterMode":
        this.ctl.masterMode = value;
        if (value === "OFF" && this.spinning()) this.stopSeq();
        break;
      case "master":
        this.ctl.master = value;
        if (value === "START") this.startSeq();
        else if (value === "STOP") this.stopSeq();
        break;
      case "speedMode": this.ctl.speedMode = value; break;
      case "loadMode":
        this.ctl.loadMode = value;
        if (value === "BASE") this.tags["LOAD_SET"] = 30.0;
        break;
      case "s43L": this.ctl.s43L = value; break;
      case "s43G": this.ctl.s43G = value; break;
      case "s43OPE": this.ctl.s43OPE = value; break;
      case "avrMode": this.ctl.avrMode = value; break;
      case "fieldMode": this.ctl.fieldMode = value; break;
      case "pss": this.ctl.pss = value; break;
      /* gtStatus / ffdStatus — FAQAT o'qish uchun (real DIASYS displeyi) */
    }
    this.refreshUI();
  },

  canStart: function () {
    return !this.tripped && this.seq === "Ready to Start" &&
      (+this.tags["SPEED"] || 0) < 50 && !this._flame;
  },

  startSeq: function () {
    if (!this.canStart()) return false;
    var T = this.tags;
    this.ctl.master = "START";
    this.ctl.brk52G = false;
    this.ctl.field41 = true;
    this._loadT = 0;
    this._dphi = 0;
    this._exhFault = 0;
    this._vibRamp = 0;
    this._delays = {};
    this._spreadSt = { t: 0, alarm: false };
    T["SPEED"] = 0; T["SPEED_PCT"] = 0;
    T["GEN_POWER"] = 0; T["MW_FDBK"] = 0;
    T["FOFFD"] = 0; T["IGV_POS"] = 34;
    T["PURGE_CURRENT"] = 0;
    T["GEN_MVAR"] = 0;
    T["SYNC_DPHI"] = 0;
    /* sovuq yonish yo'li: gaz+metall atrof-muhitda */
    for (var i = 0; i < 18; i++) {
      var v = 25 + (H25_TAGS[this.tcTag(i + 1)].v - 595.0) * 0.03;
      this.tcGas[i] = v;
      this.tcMetal[i] = v;
    }
    this._wheel = 60;
    this.motors.mop1.run = true;
    this.motors.mop1.stopLatch = false;
    this.bumpStarts();
    this.setSeq("Cranking");
    this.refreshUI();
    return true;
  },

  stopSeq: function () {
    this.ctl.master = "STOP";
    if (this.running()) this.setSeq("Unloading");
    else if (this.seq === "Seq. Complete" || this.seq === "Accelerating" ||
             this.seq === "Warming up" || this.seq === "GT Firing" ||
             this.seq === "Purge" || this.seq === "Cranking") {
      this.setSeq("Fired Shutdown");
    } else if ((+this.tags["SPEED"] || 0) > 100) this.setSeq("Coast Down");
    else if (this.seq !== "Cooling Down" && this.seq !== "Ready to Start") this.setSeq("Cooling Down");
    this.refreshUI();
  },

  release52G: function () {
    if (this.tripped || this.ctl.brk52G) return;
    if (!this.syncOk()) return;
    this.closeBreaker();
  },

  releaseIBH: function () { this.ctl.ibhLock = false; this.refreshUI(); },

  /* ---- aux motor control (screen 9) ---- */
  setMotorMode: function (id, auto) {
    if (!this.motors[id]) return;
    this.motors[id].auto = auto;
    this.refreshUI();
  },
  motorStart: function (id) {
    if (!this.motors[id]) return;
    this.motors[id].run = true;
    this.motors[id].stopLatch = false;
    this.refreshUI();
  },
  motorStop: function (id) {
    if (!this.motors[id]) return;
    this.motors[id].run = false;
    this.motors[id].stopLatch = true;
    var pair = { mop1: "mop2", hop2: "hop1", mist2: "mist1" };
    var sb = pair[id];
    if (sb && this.motors[sb].auto && !this.motors[sb].run) {
      this.motors[sb].run = true;
      this.motors[sb].stopLatch = false;
    }
    if ((id === "gfc1" || id === "gfc3") && !this.motors.gfc1.run &&
        !this.motors.gfc3.run && this.motors.gfc2.auto) {
      this.motors.gfc2.run = true;
      this.motors.gfc2.stopLatch = false;
    }
    this.refreshUI();
  },
  close41: function () { this.ctl.field41 = true; this.refreshUI(); },
  open41: function () {
    /* 52G yopiq bo'lganda qo'zg'atish uzgichi ochilmaydi (interlock) */
    if (this.ctl.brk52G) return;
    this.ctl.field41 = false;
    this.refreshUI();
  },

  /* ---- screen 3 lampalar / uzgichlar ranglari ---- */
  stateColor: function (id) {
    var GRN = "rgb(0,255,0)", RED = "rgb(255,0,0)", GRY = "#808080";
    switch (id) {
      case "sync1": return this.ctl.field41 && (+this.tags["GEN_KV"] || 0) > 9 ? GRN : GRY;
      case "sync2": return GRN;
      case "sync3": return this.ctl.brk52G ? RED : GRN;
      case "sync4": return this.syncOk() ? GRN : RED;
      case "ready": return (this.ctl.brk52G && !this.tripped) ? "#FFFFFF" : GRY;
      case "ibhlock": return this.ctl.ibhLock ? GRN : GRY;
      case "sym52L": return RED;
      case "sym52G": return this.ctl.brk52G ? RED : GRN;
      case "sym41": return this.ctl.field41 ? RED : GRN;
      default: return GRY;
    }
  },

  /* ---- start-check permissive ranglari (real signallar) ---- */
  scColor: function (id) {
    var GRN = "rgb(0,200,0)", RED = "rgb(255,0,0)";
    var T = this.tags, M = this.motors;
    var sp = +T["SPEED"] || 0;
    switch (id) {
      case "zero": return sp < 100 ? GRN : RED;
      case "brk": return !this.ctl.brk52G ? GRN : RED;
      case "reset": return !this.tripped ? GRN : RED;
      case "sc3_4t": return !this.tripped ? GRN : RED;
      case "sc1_off": return this.ctl.masterMode !== "OFF" ? GRN : RED;
      case "sc1_hd": return (!this.tripped && (M.hop1.run || M.hop2.run || sp < 100)) ? GRN : RED;
      case "sc1_qn": return (+T["LO_TANK_T"] || 0) < 80 ? GRN : RED;
      case "sc1_ql": return (+T["LO_TANK_L"] || 0) > 20 ? GRN : RED;
      case "sc4_qe": return !M.eop.run ? GRN : RED;
      case "sc4_qm": return (M.mop1.run || M.mop2.run) ? GRN : RED;
      case "sc4_tb": return (M.ven1.run || M.ven2.run) ? GRN : RED;
      case "sc5_cr": return !M.crank.stopLatch ? GRN : RED;
      case "sc5_tg": return !M.tgm.stopLatch ? GRN : RED;
      case "sc5_qe": return GRN;   /* EOP o'chirilgan bo'lsa ham ishga tayyor */
      case "sc6_qm": return (!M.mop1.stopLatch || !M.mop2.stopLatch) ? GRN : RED;
      case "sc6_qv": return (!M.mist1.stopLatch || !M.mist2.stopLatch) ? GRN : RED;
      case "sc6_qt": return true;
      case "sc6_hq": return (!M.hop1.stopLatch || !M.hop2.stopLatch) ? GRN : RED;
      case "sc6_tb": return (M.ven1.run || M.ven2.run || M.ven1.auto || M.ven2.auto) ? GRN : RED;
      case "sc6_bn": return (M.bc1.run || M.bc2.run || M.bc1.auto) ? GRN : RED;
      case "sc7_jop": return !M.jop.stopLatch ? GRN : RED;
      case "sc7_ng": return true;
      case "sc7_gfc": return (!M.gfc1.stopLatch || !M.gfc2.stopLatch || !M.gfc3.stopLatch) ? GRN : RED;
      default: return GRN;
    }
  },

  startCheckIds: ["sc0_bus", "sc0_tci", "sc0_igv", "sc0_cp", "zero", "sc1_qn", "sc1_ql",
    "sc1_off", "sc1_hd", "brk", "sc2_cb", "reset", "sc2_fgn", "sc3_4t", "sc3_vd", "sc3_tflt",
    "sc3_cps", "sc4_qe", "sc4_qm", "sc4_tb", "sc4_hs", "sc4_gax", "sc5_cr", "sc5_tg",
    "sc5_qe", "sc6_qm", "sc6_qv", "sc6_qt", "sc6_hq", "sc6_tb", "sc6_bn", "sc7_jop",
    "sc7_ng", "sc7_gfc", "sc_ps"],

  startCheckOk: function () {
    for (var i = 0; i < this.startCheckIds.length; i++) {
      if (this.scColor(this.startCheckIds[i]) === "rgb(255,0,0)") return false;
    }
    return true;
  },

  /* ---- overspeed test (screen 19) ---- */
  osEnable: function () { this.ctl.osTest = "ENABLE"; this.refreshUI(); },
  osDisable: function () {
    this.ctl.osTest = "DISABLE";
    this.ctl.osMainRun = false;
    this.ctl.osBackupRun = false;
    this.refreshUI();
  },
  osStartMain: function () {
    if (this.ctl.osTest !== "ENABLE" || this.tripped || this.ctl.brk52G) return;
    if ((+this.tags["SPEED"] || 0) < 7000) return;
    this.ctl.osMainRun = true;
    this.ctl.osBackupRun = false;
    this._osRefPct = 110;
    this.refreshUI();
  },
  osAbortMain: function () { this.ctl.osMainRun = false; this.refreshUI(); },
  osStartBackup: function () {
    if (this.ctl.osTest !== "ENABLE" || this.tripped || this.ctl.brk52G) return;
    if ((+this.tags["SPEED"] || 0) < 7000) return;
    this.ctl.osBackupRun = true;
    this.ctl.osMainRun = false;
    this._osRefPct = 111.2;
    this.refreshUI();
  },
  osAbortBackup: function () { this.ctl.osBackupRun = false; this.refreshUI(); },
  liftCal: function (v) { this.ctl.lift = v; this.refreshUI(); },

  /* ---- burners / flame ---- */
  flameOn: function () { return this._flame; },
  burnerOpen: function () {
    var T = this.tags, fl = this._flame;
    var g = function (k) { return (+T[k] || 0) < 5; };
    return {
      F1: !fl || g("F1_GCV"),
      F21: !fl || g("F2_1_GCV"),
      F22: !fl || g("F2_2_GCV"),
      F23: !fl || g("F2_3_GCV"),
      F24: !fl || g("F2_4_GCV")
    };
  },

  /* ---- counterlar ---- */
  bumpStarts: function () {
    var T = this.tags;
    T["TOT_ST"] = (+T["TOT_ST"] || 0) + 1;
    T["TOT_ST_R"] = (+T["TOT_ST_R"] || 0) + 1;
    T["FS_N"] = (+T["FS_N"] || 0) + 1;
    T["FS_N_R"] = (+T["FS_N_R"] || 0) + 1;
    this.push();
  },

  counterReset: function () {
    var T = this.tags, d = new Date();
    T["EOH_R"] = 0; T["AOH_R"] = 0; T["GAS_R"] = 0;
    T["FS_N_R"] = 0; T["ET_NT_R"] = 0; T["TOT_ST_R"] = 0; T["TOT_ET_R"] = 0;
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    T["RST_DATE"] = String(d.getFullYear()).slice(2) + "/" + p2(d.getMonth() + 1) + "/" + p2(d.getDate());
    T["RST_TIME"] = p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
    this.push();
  },

  /* ---- TRIP / MASTER RESET ---- */
  trip: function (cause, item) {
    if (this.tripped) return;
    var T = this.tags;
    this.tripped = true;
    this.tripCause = cause || "MANUAL TRIP";
    this.tripItems[item || "9EX"] = true;
    this.ctl.brk52G = false;
    this.ctl.osMainRun = false;
    this.ctl.osBackupRun = false;
    this._flame = false;
    this._loadT = 0;
    this._dphi = 0;
    this._qSet = 0;
    T["GEN_POWER"] = 0;
    T["MW_FDBK"] = 0;
    T["GEN_A"] = 0;
    T["GEN_PF"] = 0;
    T["ET_NT"] = (+T["ET_NT"] || 0) + 1;
    T["ET_NT_R"] = (+T["ET_NT_R"] || 0) + 1;
    T["TOT_ET"] = (+T["TOT_ET"] || 0) + 1;
    T["TOT_ET_R"] = (+T["TOT_ET_R"] || 0) + 1;
    this.setSeq("Fired Shutdown");
    this.refreshUI();
  },

  /* Latch-only reset: unitni QAYTA ISHGA TUSHIRMAYDI, qiymatlarni
   * baza holatiga SAKRATMAYDI. Sekvensiya o'z holatidan davom etadi. */
  masterReset: function () {
    var T = this.tags;
    this.tripped = false;
    this.tripCause = "";
    this.tripItems = {};
    this.faults = { vib: false, exh: false, lube: false, fuel: false, flame: false };
    this._delays = {};
    this._spreadSt = { t: 0, alarm: false };
    this.spreadAlarm = false;
    this._exhFault = 0;
    this._vibRamp = 0;
    this.lastReset = Date.now();
    if (window.H25_polarHist) window.H25_polarHist = [];
    /* statik bosimlar darhol tiklanadi (issiqlik/mexanika sekin qoladi) */
    var mop = this.motors.mop1.run || this.motors.mop2.run;
    T["LO_HDR_P"] = mop ? 0.172 : (this.motors.eop.run ? 0.115 : 0);
    T["LO_HDR_P2"] = T["LO_HDR_P"] + 0.001;
    T["MOP_DISCH"] = mop ? 0.550 : (this.motors.eop.run ? 0.400 : 0);
    T["P1_PRESS"] = 3.579;
    if (this.seq === "Cooling Down" && (+T["SPEED"] || 0) < 150 &&
        this._wheel < (H25_CFG.SEQ.coolTargetC || 66)) this.setSeq("Ready to Start");
    this.push();
    this.refreshUI();
  },

  /* ---- trainer fault injection ---- */
  setFault: function (name, on) {
    if (name in this.faults) this.faults[name] = !!on;
  },
  clearFaults: function () {
    this.faults = { vib: false, exh: false, lube: false, fuel: false, flame: false };
  },

  /* ---- real-time loop ---- */
  startLoop: function () {
    var self = this, last = performance.now();
    setInterval(function () {
      var now = performance.now();
      var dt = now - last;
      last = now;
      if (!(dt > 0)) return;
      if (dt > H25_CFG.MAX_DT_MS) dt = H25_CFG.MAX_DT_MS;
      self.tick(dt);
    }, H25_CFG.ACCUM_MS);
  }
};
