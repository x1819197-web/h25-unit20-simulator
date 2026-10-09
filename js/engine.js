/* H25 UNIT-20 simulation engine — 500 ms tick.
 * Displayed values are EXACT reference operating points at rest (no drift).
 * Operator actions (RAISE/LOWER, START/STOP, TRIP, modes) drive deterministic
 * responses; everything is pushed into [data-tag] elements on all screens. */

window.H25 = {
  tags: {},
  listeners: [],

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
  /* aux motors: run -> red RUNNING; stop -> green STOPPED.
   * standby units show STANDBY orange; stopLatch -> STOP orange. */
  motors: {
    eop: {run:false, auto:true, standby:false, stopLatch:false},
    mop1: {run:true, auto:true, standby:false, stopLatch:false},
    mop2: {run:false, auto:true, standby:true, stopLatch:true},
    mist1: {run:false, auto:true, standby:true, stopLatch:true},
    mist2: {run:true, auto:true, standby:false, stopLatch:false},
    jop: {run:false, auto:true, standby:false, stopLatch:true},
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
  },
  seq: "Base Load",
  tripped: false,
  tripCause: "",
  tripItems: {},
  /* trainer fault injection (?trainer=1 panel or ?fault=vib,exh,lube,fuel) */
  faults: { vib: false, exh: false, lube: false, fuel: false },
  lastReset: 0,
  raiseLower: 0,
  vRaiseLower: 0,
  iRaiseLower: 0,

  init: function () {
    for (var k in H25_TAGS) {
      var d = H25_TAGS[k];
      this.tags[k] = (d && typeof d === "object") ? d.v : d;
    }
    this.seq = "Base Load";
    this.ctl.gtStatus = "Base Load";
    /* ---- TC ikki-inersiyali holati (2A): seedli bias/fazalar, Math.random YO'Q ---- */
    var rng = H25_RNG(H25_CFG.TC.seed);
    this.tcBias = []; this.tcPh1 = []; this.tcPh2 = [];
    this.tcGas = []; this.tcMetal = [];
    for (var bi = 0; bi < 18; bi++) {
      this.tcBias.push(H25_CFG.TC.biasMin + rng() * (H25_CFG.TC.biasMax - H25_CFG.TC.biasMin));
      this.tcPh1.push(rng() * 2 * Math.PI);
      this.tcPh2.push(rng() * 2 * Math.PI);
      var bk = this.tcTag(bi + 1);
      var bv = (this.tags[bk] != null) ? this.tags[bk] : 600;
      this.tcGas.push(bv); this.tcMetal.push(bv);
    }
    this._simT = 0; this._lastDt = 0.5;
    this._exhOverride = null; this._exhAuto = 595.0;
    this._exhFaultOn = false;
    this._spreadSt = { t: 0, alarm: false };
    this.spreadAlarm = false;
    /* ?fault=vib,exh,lube,fuel preselects trainer faults */
    try {
      var m = (location.search || "").match(/fault=([^&]+)/);
      if (m) {
        var parts = m[1].split(",");
        for (var i = 0; i < parts.length; i++) {
          var f = parts[i].replace("fuelgas", "fuel").replace("vibration", "vib");
          if (f in this.faults) this.faults[f] = true;
        }
      }
    } catch (e) {}
  },

  onTick: function (fn) { this.listeners.push(fn); },
  baseOf: function (k) { return H25_TAGS[k].v; },

  tcTag: function (i) { return "TC" + (i < 10 ? "0" + i : i); },

  /* TC gaz+metall yangilash (2A): run = tauRun (4 s), cool = ikki eksponensial.
   * Ko'rsatkich = 0.35*gaz + 0.65*metall + silliq shovqin (<=0.3 C). */
  updateTC: function (dtS, mode, exhTgt) {
    var C = H25_CFG.TC, T = this.tags, EXM = H25_EXM;
    var tamb = (T["AMB_T"] != null) ? T["AMB_T"] : 25;
    var tauG = (mode === "run") ? C.tauRun : C.tauGasCool;
    var tauM = (mode === "run") ? C.tauMetalRun : C.tauMetalCool;
    for (var i = 1; i <= 18; i++) {
      var tag = this.tcTag(i);
      var off = H25_TAGS[tag].v - 595.0;
      var gasTgt = (mode === "run") ? exhTgt + off + this.tcBias[i - 1] : tamb;
      var r = EXM.tcStep(this.tcGas[i - 1], this.tcMetal[i - 1], gasTgt, tauG, tauM, dtS, C.metalW);
      this.tcGas[i - 1] = r[0]; this.tcMetal[i - 1] = r[1];
      T[tag] = r[2] + EXM.smoothNoise(this._simT, this.tcPh1[i - 1], this.tcPh2[i - 1]);
    }
  },

  /* EXH_T / SPREAD_1..3 / ALLOW / CT nusxalar — FAQAT 18 TC dan (2A). */
  recomputeExhaust: function (dtS) {
    var T = this.tags, EXM = H25_EXM, tcs = [];
    for (var i = 1; i <= 18; i++) tcs.push(T[this.tcTag(i)]);
    var mean = EXM.exTempMean(tcs);
    T["EXH_T"] = mean;
    var sp = EXM.exSpreads(tcs);
    T["SPREAD_1"] = sp.s1; T["SPREAD_2"] = sp.s2; T["SPREAD_3"] = sp.s3;
    T["ALLOW_SPREAD"] = EXM.allowSpread(T["GEN_POWER"] || 0);
    for (var j = 1; j <= 18; j++) {
      var ct = "CT" + (j < 10 ? "0" + j : j);
      T[ct] = T[this.tcTag(j)]; // bitta manba: CT = TC nusxasi
    }
    T["TX_MED"] = mean; T["OS_EXH_T"] = mean;
    /* spread alarm (10 s) -> trip (20 s uzluksiz) */
    if (!this.tripped) {
      var st = EXM.spreadStep(this._spreadSt, sp.s1, T["ALLOW_SPREAD"], dtS || 0.5);
      this.spreadAlarm = (st !== "ok");
      if (st === "trip") this.trip("HIGH EXHAUST SPREAD", H25_CFG.EXH.spreadTripItem);
    } else { this._spreadSt.t = 0; }
  },

  /* Yagona TC qadami: flame yo'q rejimlarda "cool", startup isitishda "run". */
  stepExhaust: function (dtS) {
    var coolSeq = {
      "Cranking": 1, "Purge": 1, "Ready to Start": 1,
      "Coast Down": 1, "Fired Shutdown": 1, "Cooling Down": 1
    };
    var cool = this.tripped || coolSeq[this.seq];
    var tgt = (this._exhOverride != null) ? this._exhOverride : (this._exhAuto || 595.0);
    this.updateTC(dtS || 0.5, cool ? "cool" : "run", tgt);
    this.recomputeExhaust(dtS || 0.5);
  },

  running: function () {
    return !this.tripped && (this.seq === "Base Load" || this.seq === "Part Load" ||
      this.seq === "Loading" || this.seq === "Unloading");
  },

  /* ---- main tick (qat'iy 500 ms qadam; accumulator orqali chaqiriladi) ---- */
  tick: function (dtMs) {
    var T = this.tags;
    var dtS = (dtMs || H25_CFG.TICK_MS) / 1000;
    this._lastDt = dtS;
    this._simT = (this._simT || 0) + dtS;

    /* MASTER RESET dan keyingi sekin tiklanish: tripdagi tushish tezligi
     * bilan bir xil pog'onada ko'tariladi (SPEED +180, EXH +8, FFD +3, MW +1.2).
     * Birdan sakrash yo'q — xuddi o'chayotgandagi sekin perepad kabi. */
    if (this.recovering && !this.tripped) {
      var bSpd = H25_TAGS["SPEED"].v, bExh = H25_TAGS["EXH_T"].v,
          bFfd = H25_TAGS["FOFFD"].v, bPow = H25_TAGS["GEN_POWER"].v;
      T["SPEED"] = Math.min(bSpd, (T["SPEED"] || 0) + 180);
      T["SPEED_PCT"] = T["SPEED"] / 72.8;
      T["FOFFD"] = Math.min(bFfd, (T["FOFFD"] || 0) + 3.0);
      T["GEN_POWER"] = Math.min(bPow, (T["GEN_POWER"] || 0) + 1.2);
      T["MW_FDBK"] = T["GEN_POWER"];
      T["GEN_A"] = T["GEN_POWER"] * 53.05;
      T["IGV_POS"] = Math.min(82.6, (T["IGV_POS"] || 34) + 2);
      /* recovering isishi TC dinamikasi orqali (silliq, sakrash yo'q) */
      var _recMean = 0;
      for (var _ri = 1; _ri <= 18; _ri++) _recMean += T[this.tcTag(_ri)];
      _recMean /= 18;
      this._exhOverride = Math.min(595.0 + (T["LOAD_SET"] - 30) * 5.5, _recMean + 8);
      this.stepExhaust(dtS);
      /* chastota/bosim tezlik bilan birga sekin tiklanadi (sakrash yo'q) */
      var rk2 = T["SPEED"] / 7280;
      T["GEN_HZ"] = 50 * rk2;
      T["GEN_KV"] = 10.92 * Math.min(1, rk2 * 1.15);
      T["GEN_MVAR"] = 4.3 * rk2;
      T["CPR_OUT_P"] = 1.30 * rk2;
      T["CPR_OUT_T"] = 25 + (408.6 - 25) * rk2;
      if (T["SPEED"] >= bSpd && T["EXH_T"] >= bExh && T["FOFFD"] >= bFfd) {
        this.recovering = false;
        this._exhOverride = null;
        this.seq = "Base Load"; this.ctl.gtStatus = "Base Load";
      }
      this.push();
      for (var li = 0; li < this.listeners.length; li++) this.listeners[li](T);
      return;
    }

    /* RAISE / LOWER jogs LOAD_SET */
    if (this.raiseLower !== 0 && !this.tripped && this.running()) {
      T["LOAD_SET"] = Math.min(32, Math.max(0, T["LOAD_SET"] + this.raiseLower * 0.1));
    }
    /* exciter voltage/current adjust */
    if (this.vRaiseLower !== 0 && !this.tripped) {
      T["GEN_KV"] = Math.min(11.5, Math.max(10.0, T["GEN_KV"] + this.vRaiseLower * 0.01));
    }
    if (this.iRaiseLower !== 0 && !this.tripped) {
      T["GEN_MVAR"] = Math.min(8, Math.max(0, T["GEN_MVAR"] + this.iRaiseLower * 0.05));
    }
    /* MWH energy counter */
    T["GEN_MWH"] = (T["GEN_MWH"] || 488380.5) + Math.max(0, T["GEN_POWER"] || 0) * 0.5 / 3600;
    /* operating-hours timers integrate while running */
    if (this.running()) {
      var dh = 0.5 / 3600;
      T["EOH_L"] = (T["EOH_L"] || 23076.5) + dh;
      T["EOH_R"] = (T["EOH_R"] || 23076.5) + dh;
      T["AOH_L"] = (T["AOH_L"] || 18476.5) + dh;
      T["AOH_R"] = (T["AOH_R"] || 18476.5) + dh;
      T["GAS_L"] = (T["GAS_L"] || 18476.5) + dh;
      T["GAS_R"] = (T["GAS_R"] || 18476.5) + dh;
    }

    /* TC flame-off/on dinamikasi stepExhaust() da (yagona joy) — 2A. */

    /* Coast fizikasi: hamma aylanuvchi parametr tezlikka bog'liq.
     * Oldin tripda SPEED tushsa ham chastota/kuchlanish/bosim muzlab qolardi. */
    var coastPhysics = function (spd) {
      var k = spd / 7280;
      T["GEN_HZ"] = 50 * k;
      /* 52G ochiq: yuk 0, reaktiv 0; kuchlanish qo'zg'atish bilan tushadi */
      T["GEN_KV"] = 10.92 * Math.min(1, k * 1.15);
      T["GEN_MVAR"] = 4.3 * k;
      T["EXC_V"] = 46.0 * T["GEN_KV"] / 10.92;
      T["EXC_A"] = 5.6 * k;
      T["CPR_OUT_P"] = 1.30 * k;
      T["CPR_OUT_T"] = 25 + (408.6 - 25) * k;
      T["CPR_IN_T"] = 21.3 * k + 23.5 * (1 - k) * 0.2;
    };
    if (this.tripped) {
      /* trip coast-down: slower, real-time feel (~30 s to standstill) */
      T["GEN_POWER"] = Math.max(0, T["GEN_POWER"] - 1.2);
      T["MW_FDBK"] = T["GEN_POWER"];
      T["FOFFD"] = Math.max(0, T["FOFFD"] - 3.0);
      T["SPEED"] = Math.max(0, T["SPEED"] - 180);
      T["SPEED_PCT"] = T["SPEED"] / 72.8;
      T["GEN_A"] = T["GEN_POWER"] * 53.05;
      T["IGV_POS"] = Math.max(34, T["IGV_POS"] - 2);
      coastPhysics(T["SPEED"]);
    } else if (this.seq === "Coast Down" || this.seq === "Fired Shutdown" ||
               this.seq === "Cooling Down") {
      /* normal STOP coast-down (no trip flag): gentle ramp like real GT */
      T["GEN_POWER"] = Math.max(0, T["GEN_POWER"] - 1.0);
      T["MW_FDBK"] = T["GEN_POWER"];
      T["FOFFD"] = Math.max(0, T["FOFFD"] - 2.5);
      T["SPEED"] = Math.max(0, T["SPEED"] - 150);
      T["SPEED_PCT"] = T["SPEED"] / 72.8;
      T["GEN_A"] = T["GEN_POWER"] * 53.05;
      T["IGV_POS"] = Math.max(34, T["IGV_POS"] - 2);
      coastPhysics(T["SPEED"]);
    } else if (this.running()) {
      /* Base-load chain: LOAD_SET -> FFD limiters -> FOFFD (fuel demand)
       * -> SRV/GCV/FUEL_FLOW -> GEN_POWER (lag) -> EXH_T/CPR/IGV.
       * Hamma narsa bir-biriga bog'liq: RAISE/LOWER LOAD_SET ni,
       * LOAD_SET FFD ni, FFD quvvat va haroratni tortadi.
       * Birinchi darajali kechikish (lag) — qiymatlar sakramaydi,
       * original SCADA dagi kabi silliq intiladi. */
      /* Seedli silliq shovqin (2A): har kadrda yangi Math.random YO'Q.
       * Bir xil faza taqsimoti, |nz| <= a, davrlar 47 s / 23 s. */
      var nzSeed = 0, selfNz = this;
      var nz = function (a) {
        nzSeed++;
        var t = selfNz._simT || 0;
        return a * (0.6 * Math.sin(2 * Math.PI * t / 47 + nzSeed * 2.399963) +
                    0.4 * Math.sin(2 * Math.PI * t / 23 + nzSeed * 1.618034));
      };
      var lag = function (k, tgt, k2) {
        T[k] = T[k] + (tgt - T[k]) * k2;
      };
      var d = T["LOAD_SET"] - 30.0;
      /* --- FFD limiters (screen 2 bars) move with load --- */
      T["FFD_MIN"] = 9.8;
      T["FFD_SU"] = 100.0;
      T["FFD_SD"] = 100.0;
      T["FFD_ACC"] = 73.0 + d * 0.8;
      T["FFD_SPD"] = 77.8 + d * 1.2;
      T["FFD_LLM"] = 65.7 + d * 1.5;
      /* temp limiter drops when exhaust hot (temperature control) */
      var exhHot = Math.max(0, (T["EXH_T"] || 595) - 595);
      T["FFD_TEMP"] = 64.0 + d * 1.5 - exhHot * 0.15;
      /* --- fuel demand: LOAD_SET target, governor selects regime --- */
      var foffdTgt = 65.2 + d * 1.5;
      if (this.ctl.governor === "LLM") {
        /* LLM = load limiter caps fuel */
        foffdTgt = Math.min(foffdTgt, T["FFD_LLM"]);
      } else {
        /* DROOP = speed/load governor follows FFD_SPD ceiling */
        foffdTgt = Math.min(foffdTgt, T["FFD_SPD"]);
      }
      /* temperature runback (30TXA: EXH_REF+11 -> runback).
       * EXH_REF silliq intiladi — yuk keskin tushganda soxta trip yo'q. */
      var exhRefTgt = 595.8 + d * 3.0;
      if (!(T["EXH_REF_T"] > 0)) T["EXH_REF_T"] = exhRefTgt;
      lag("EXH_REF_T", exhRefTgt, 0.20);
      var exhRef = T["EXH_REF_T"];
      if ((T["EXH_T"] || 595) > exhRef + 11) {
        foffdTgt -= ((T["EXH_T"] || 595) - (exhRef + 11)) * 0.8;
      }
      foffdTgt = Math.max(9.8, foffdTgt);
      lag("FOFFD", foffdTgt + nz(0.12), 0.25);
      /* --- fuel valves follow fuel demand (sekin, lag bilan) ---
       * Gorelka staging (KD2H/KD3H/KD4H kaskad):
       * FOFFD tegishli KD ostiga tushsa — o'sha F2 klapani sekin yopiladi (0%),
       * qaytib ko'tarilsa — sekin ochiladi. Birdan sakrash yo'q.
       * Yopiq gorelka ekranda oqaradi (refreshCustom: opacity 0.45). */
      var kd2 = T["KD2H"] || 36.3, kd3 = T["KD3H"] || 44.8, kd4 = T["KD4H"] || 50.8;
      var f1t = 24.4 + d * 0.5;
      var f21t = 46.7 + d * 0.9;
      var f22t = (T["FOFFD"] < kd2) ? 0 : (46.6 + d * 0.9);
      var f23t = (T["FOFFD"] < kd3) ? 0 : (46.5 + d * 0.9);
      var f24t = (T["FOFFD"] < kd4) ? 0 : (46.7 + d * 0.9);
      lag("SRV_POS", 28.2 + d * 0.9, 0.25);
      lag("F1_GCV", f1t, 0.25);
      lag("F2_1_GCV", f21t, 0.20);
      lag("F2_2_GCV", f22t, 0.15);
      lag("F2_3_GCV", f23t, 0.15);
      lag("F2_4_GCV", f24t, 0.15);
      T["F20RATIO"] = 0.92 + d * 0.001 + nz(0.0005);
      /* --- power follows fuel with inertia --- */
      var pTgt = 28.6 + d * 0.955;
      lag("GEN_POWER", pTgt + nz(0.04), 0.18);
      T["MW_FDBK"] = T["GEN_POWER"] + nz(0.02);
      T["MW_REF"] = 29.5 + d * 0.985 + nz(0.03);
      /* --- turbine follows power/fuel --- */
      lag("IGV_POS", 82.6 + d * 0.4, 0.20);
      /* --- turbina yonish maqsadi: TC dinamikasi stepExhaust() da qo'llaydi --- */
      this._exhAuto = 595.0 + d * 5.5 - Math.max(0, T["IGV_POS"] - 82.6) * 0.5;
      lag("WHEEL_MAX_T", 499.9 + d * 4.0, 0.15);
      T["GEN_A"] = T["GEN_POWER"] * 53.05 + nz(1.2);
      lag("GEN_MVAR", 4.3 + d * 0.08, 0.20);
      lag("CPR_OUT_P", 1.30 + d * 0.012, 0.20);
      lag("CPR_OUT_T", 408.6 + d * 4.5, 0.20);
      T["SPEED"] = 7280 + nz(2);
      T["SPEED_PCT"] = T["SPEED"] / 72.8;
      T["IBH_POS"] = -0.1 + nz(0.05);
      T["EXC_V"] = 46.0 * T["GEN_KV"] / 10.92;
      T["EXC_A"] = 5.6 * (0.5 + 0.5 * T["GEN_MVAR"] / 4.3);
      /* fuel supply: fault aktiv bo'lganda lag tortmaydi — utechka yutadi */
      if (!this.faults.fuel) {
        lag("FUEL_FLOW", 6626.0 + d * 220, 0.25);
        lag("P1_PRESS", 3.579 + d * 0.008, 0.25);
        lag("P2_PRESS", 2.49 + d * 0.05, 0.25);
      }
      T["FG_CT"] = 102.4 + d * 0.4 + nz(0.2);
      /* lube/hydraulic follow pump states.
       * Lube-utechka faultida bosim yutadi — nasos overwrite ishlamaydi. */
      if (!this.faults.lube) {
        var lop = (this.motors.mop1.run || this.motors.mop2.run) ? 0.172
          : (this.motors.eop.run ? 0.12 : 0.0);
        T["LO_HDR_P"] = lop;
        T["LO_HDR_P2"] = lop + 0.001;
        T["MOP_DISCH"] = (this.motors.mop1.run || this.motors.mop2.run) ? 0.550
          : (this.motors.eop.run ? 0.40 : 0.0);
      }
      T["HYD_OIL_P"] = (this.motors.hop1.run || this.motors.hop2.run) ? 9.59 : 0.0;
      /* exhaust TC lar stepExhaust() da yangilanadi (yagona joy) — 2A. */
      /* data-report mirrors (screens 17-18 live) */
      T["TB_SPEED"] = T["SPEED"]; T["CS019"] = T["SPEED"];
      T["GAS_FLOW"] = T["FUEL_FLOW"]; T["ACT_P1"] = T["GEN_POWER"];
      T["ACT_P2"] = T["GEN_POWER"] - 0.29; T["REACT_P"] = T["GEN_MVAR"] + 0.6;
      T["GEN_V_DR"] = T["GEN_KV"]; T["GEN_C_DR"] = T["GEN_A"];
      T["FLD_V"] = T["EXC_V"]; T["FLD_C"] = T["EXC_A"];
      T["TX_MED"] = T["EXH_T"]; T["MAX_VIB"] = T["VIB_2BX"];
      T["IGV_REF"] = T["IGV_POS"] - 0.2; T["MBA_CT02"] = T["CPR_OUT_T"];
      T["BA10_T2B"] = T["CPR_OUT_T"]; T["BL30_P01"] = T["IBH_IN_P"];
      T["BL30_P02"] = T["IBH_OUT_P"]; T["BL30_T03"] = T["IBH_OUT_T"];
      T["OS_EXH_T"] = T["EXH_T"];
      /* the rest hold near reference values with tiny live flicker.
       * Vib-faultda 2B datchiklar rampa bilan o'sadi — overwrite ishlamaydi. */
      T["FUEL_GAS_T"] = 104.7 + nz(0.15); T["FUEL_GAS_P"] = 3.577 + nz(0.002);
      /* ALLOW/SPREAD FAQAT TC dan (recomputeExhaust) — 2A. */
      if (!this.faults.vib) {
        T["VIB_2BX"] = 61.6 + nz(0.25); T["VIB_2BY"] = 41.1 + nz(0.2);
      }
      T["VIB_1BX"] = 27.9 + nz(0.2); T["VIB_1BY"] = 5.2 + nz(0.15);
      T["VIB_EEBX"] = 18.0 + nz(0.2); T["VIB_EEBY"] = 11.5 + nz(0.15); T["VIB_TEBX"] = 28.7 + nz(0.2); T["VIB_TEBY"] = 29.2 + nz(0.2);
      T["GEN_KV"] = 10.92 + nz(0.008); T["GEN_PF"] = 0.99; T["GEN_HZ"] = 50.0 + nz(0.015);
      T["LUBE_HDR_T"] = 52.5 + nz(0.1); T["INLET_AIR_T"] = 23.5 + nz(0.1); T["CPR_IN_T"] = 21.3 + nz(0.1);
    }

    /* overspeed test ramp (screen 19) */
    if ((this.ctl.osMainRun || this.ctl.osBackupRun) && !this.tripped && this.running()) {
      var target = this.ctl.osMainRun ? 8006 : 8079;
      T["SPEED"] = Math.min(target, (T["SPEED"] || 7280) + 90);
      T["SPEED_PCT"] = T["SPEED"] / 72.8;
      T["OS_TURB_SPEED"] = T["SPEED"];
      T["OS_SPEED_REF"] = T["SPEED_PCT"];
      T["OS_MAX_SPEED"] = Math.max(T["OS_MAX_SPEED"] || 0, T["SPEED"]);
      T["OS_MAX_VIB"] = 61.3 + (T["SPEED"] - 7280) / 800;
      T["OS_EXH_T"] = (T["EXH_T"] || 595) + 2;
      if (T["SPEED"] >= target) {
        if (this.ctl.osMainRun) {
          this.ctl.osMainRun = false;
          this.trip("MAIN OVERSPEED TRIP", "12H");
        } else {
          this.ctl.osBackupRun = false;
          this.trip("BACKUP OVERSPEED TRIP", "12H_P");
        }
      }
    } else if (this.running() && !this.tripped) {
      T["OS_TURB_SPEED"] = T["SPEED"];
      T["OS_SPEED_REF"] = T["SPEED_PCT"];
    }

    /* ---- trainer fault injection (ramps, then protective trip) ----
     * Chegaralar: Karta ustavok GTU-2,3 (2025):
     * vib trip 155 um / 3 s (39VTX), exh trip EXH_REF+22 (86TXT->66TXT),
     * lube trip 0.059 MPa (63QTX), fuel trip 2.38 MPa / 15 s (63FGLT). */
    if (!this.tripped && this.running()) {
      /* NOTE: nullish-check (== null), NOT || — 0 haqiqiy qiymat,
       * || 0 ni baza bilan almashtirib yuboradi (drain to'xtab qoladi). */
      if (this.faults.vib) {
        T["VIB_2BX"] = Math.min(200, (T["VIB_2BX"] == null ? 61.6 : T["VIB_2BX"]) + 6);
        T["VIB_2BY"] = Math.min(200, (T["VIB_2BY"] == null ? 41.1 : T["VIB_2BY"]) + 4);
        T["MAX_VIB"] = T["VIB_2BX"];
      }
      /* vibration trip 155 um with 3 s delay (6 ticks x 500 ms) */
      if ((T["VIB_2BX"] || 0) >= 155) {
        this._vibDelay = (this._vibDelay || 0) + 1;
        if (this._vibDelay >= 6) { this._vibDelay = 0; this.trip("HIGH VIBRATION TRIP", "39VTX"); }
      } else { this._vibDelay = 0; }
      if (this.faults.exh) {
        /* yonish maqsadini ko'taradi — TC dinamikasi orqali silliq o'sadi (2A) */
        var _base = (this._exhOverride != null) ? this._exhOverride : (this._exhAuto || 595);
        this._exhOverride = Math.min(750, _base + 8);
        this._exhFaultOn = true;
      } else if (this._exhFaultOn) {
        this._exhOverride = null;
        this._exhFaultOn = false;
      }
      /* exhaust overtemp: EXH_REF+22 trip (66TXT), 3 s persistence —
       * yuk o'tish davridagi qisqa oshishlar trip bermaydi. */
      var _ref = T["EXH_REF_T"] || 595.8;
      if ((T["EXH_T"] || 0) >= _ref + 22) {
        this._exhDelay = (this._exhDelay || 0) + 1;
        if (this._exhDelay >= 6) { this._exhDelay = 0; this.trip("EXHAUST OVERTEMP TRIP", "66TXT"); }
      } else { this._exhDelay = 0; }
      if (this.faults.lube) {
        T["LO_HDR_P"] = Math.max(0, (T["LO_HDR_P"] == null ? 0.172 : T["LO_HDR_P"]) - 0.02);
        T["LO_HDR_P2"] = T["LO_HDR_P"] + 0.001;
        T["MOP_DISCH"] = Math.max(0, (T["MOP_DISCH"] == null ? 0.55 : T["MOP_DISCH"]) - 0.06);
        /* low lube-oil trip fires via existing guard below (63QTX) */
      }
      if (this.faults.fuel) {
        T["P1_PRESS"] = Math.max(0, (T["P1_PRESS"] == null ? 3.579 : T["P1_PRESS"]) - 0.25);
        T["FUEL_FLOW"] = Math.max(0, (T["FUEL_FLOW"] == null ? 6626 : T["FUEL_FLOW"]) - 500);
        T["GAS_FLOW"] = T["FUEL_FLOW"];
        T["GEN_POWER"] = Math.max(0, T["GEN_POWER"] - 2.5);
        T["MW_FDBK"] = T["GEN_POWER"];
      }
      /* fuel-gas low trip 2.38 MPa with 15 s delay (30 ticks) */
      if ((T["P1_PRESS"] == null ? 99 : T["P1_PRESS"]) <= 2.38) {
        this._fuelDelay = (this._fuelDelay || 0) + 1;
        if (this._fuelDelay >= 30) { this._fuelDelay = 0; this.trip("FUEL GAS SUPPLY PRESS LOW", "63FGLT"); }
      } else { this._fuelDelay = 0; }
    }

    /* low lube-oil trip 0.059 MPa (63QTX), alarm 0.078 */
    if (!this.tripped && this.tags["SPEED"] > 500 && this.tags["LO_HDR_P"] < 0.059 &&
        (this.seq === "Base Load" || this.seq === "Part Load" || this.seq === "Loading")) {
      this.trip("LUBE OIL PRESS LOW", "63QTX");
    }

    /* TC ikki-inersiyali qadami + EXH/SPREAD qayta hisoblash (yagona joy, 2A) */
    this.stepExhaust(dtS);

    this.push();
    for (var i = 0; i < this.listeners.length; i++) this.listeners[i](T);
  },

  push: function () {
    var els = document.querySelectorAll("[data-tag]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], k = el.getAttribute("data-tag");
      if (!(k in this.tags)) continue;
      var v = this.tags[k];
      if (typeof v === "string") { el.textContent = v; continue; }
      var dp = el.getAttribute("data-dp");
      dp = (dp === null) ? H25_TAGS[k].dp : parseInt(dp, 10);
      el.textContent = v.toFixed(dp);
    }
  },

  press: function (group, value) {
    switch (group) {
      case "location": this.ctl.location = value; break;
      case "cooldown": this.ctl.cooldown = value; break;
      case "governor": this.ctl.governor = value; break;
      case "masterMode":
        this.ctl.masterMode = value;
        if (value === "OFF") { this.seq = "Ready to Start"; this.ctl.gtStatus = "Ready to Start"; }
        if (value === "CRANK") { this.seq = "Cranking"; this.ctl.gtStatus = "Cranking"; }
        if (value === "FIRE") { this.seq = "GT Firing"; this.ctl.gtStatus = "GT Firing"; }
        if (value === "AUTO" && !this.tripped) { this.seq = "Base Load"; this.ctl.gtStatus = "Base Load"; }
        break;
      case "master":
        this.ctl.master = value;
        if (value === "START" && !this.tripped) {
          this.bumpStarts();
          this.runStartupSeq();
        }
        else if (value === "STOP") {
          this.seq = "Fired Shutdown"; this.ctl.gtStatus = "Fired Shutdown";
          var self = this;
          setTimeout(function () {
            if (!self.tripped) { self.seq = "Coast Down"; self.ctl.gtStatus = "Coast Down"; }
          }, 2500);
        }
        break;
      case "speedMode": this.ctl.speedMode = value; break;
      case "loadMode":
        this.ctl.loadMode = value;
        if (value === "BASE") this.tags["LOAD_SET"] = 30.0;
        break;
      case "gtStatus": this.ctl.gtStatus = value; this.seq = value; break;
      case "s43L": this.ctl.s43L = value; break;
      case "s43G": this.ctl.s43G = value; break;
      case "s43OPE": this.ctl.s43OPE = value; break;
      case "avrMode": this.ctl.avrMode = value; break;
      case "fieldMode": this.ctl.fieldMode = value; break;
      case "pss": this.ctl.pss = value; break;
    }
    refreshButtons();
  },

  release52G: function () {
    if (this.tags["SPEED"] > 7000 && !this.tripped) this.ctl.brk52G = true;
    refreshCustom();
  },
  releaseIBH: function () { this.ctl.ibhLock = false; refreshCustom(); },

  /* ---- aux motor control (screen 9) ---- */
  setMotorMode: function (id, auto) {
    if (!this.motors[id]) return;
    this.motors[id].auto = auto;
    refreshMcells(); refreshCustom();
  },
  motorStart: function (id) {
    if (!this.motors[id]) return;
    this.motors[id].run = true;
    this.motors[id].stopLatch = false;
    refreshMcells(); refreshCustom();
  },
  motorStop: function (id) {
    if (!this.motors[id]) return;
    this.motors[id].run = false;
    this.motors[id].stopLatch = true;
    /* standby auto-cascade */
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
    refreshMcells(); refreshCustom();
  },
  close41: function () { this.ctl.field41 = true; refreshCustom(); },
  open41: function () { this.ctl.field41 = false; refreshCustom(); },

  /* status colors for lamps / SLD symbols on screen 3 */
  stateColor: function (id) {
    switch (id) {
      case "sync1": return this.running() ? "rgb(0,255,0)" : "#808080";
      case "sync2": return this.ctl.field41 ? "rgb(0,255,0)" : "#808080";
      case "sync3": return this.tags["GEN_KV"] > 5 ? "rgb(255,0,0)" : "#808080";
      case "sync4": return this.ctl.brk52G ? "rgb(255,0,0)" : "#808080";
      case "ready": return (this.ctl.brk52G && !this.tripped) ? "#FFFFFF" : "#808080";
      case "ibhlock": return this.ctl.ibhLock ? "rgb(0,255,0)" : "#808080";
      case "sym52L": return "rgb(255,0,0)";
      case "sym52G": return this.ctl.brk52G ? "rgb(255,0,0)" : "rgb(0,192,0)";
      case "sym41": return this.ctl.field41 ? "rgb(255,0,0)" : "rgb(0,192,0)";
      default: return "#808080";
    }
  },

  runStartupSeq: function () {
    /* Real H25-like start: gradual ramps, not instant jumps.
     * Cranking (0->800) -> Purge (hold) -> Firing (EXH rises)
     * -> Warming (SPEED->5000) -> Accelerating (->7280 FSNL)
     * -> Loading (POWER ramps) -> Base Load. */
    var self = this;
    var steps = ["Cranking", "Purge", "GT Firing", "Warming up", "Accelerating",
                 "Seq. Complete", "Loading", "Base Load"];
    var i = 0;
    this.tags["SPEED"] = 0; this.tags["SPEED_PCT"] = 0;
    this.tags["GEN_POWER"] = 0; this.tags["MW_FDBK"] = 0;
    this.tags["FOFFD"] = 0;
    this.tags["IGV_POS"] = 34;
    /* burner cold: gaz+metall atrof-muhitda, poligon markazdan silliq o'sadi (2A).
     * EXH_T to'g'ridan yozilmaydi — tick dagi TC o'rtachasi hisoblaydi. */
    for (var ci = 0; ci < 18; ci++) {
      var ck0 = this.tcTag(ci + 1);
      this.tcGas[ci] = this.tcMetal[ci] = 25 + (H25_TAGS[ck0].v - 595.0) * 0.05;
    }
    this._exhOverride = 25;
    if (this._startTimer) clearInterval(this._startTimer);
    (function next() {
      if (self.tripped) return;
      if (i >= steps.length) return;
      self.seq = steps[i]; self.ctl.gtStatus = steps[i];
      refreshButtons();
      var step = steps[i];
      i++;
      if (step === "Cranking") {
        /* 0 -> 700 rpm over this step */
        var t0 = Date.now();
        if (self._startTimer) clearInterval(self._startTimer);
        self._startTimer = setInterval(function () {
          if (self.tripped || self.seq !== "Cranking") { clearInterval(self._startTimer); return; }
          var k = Math.min(1, (Date.now() - t0) / 2200);
          self.tags["SPEED"] = Math.round(700 * k);
          self.tags["SPEED_PCT"] = self.tags["SPEED"] / 72.8;
        }, 100);
        setTimeout(next, 2400);
      } else if (step === "GT Firing") {
        /* ignition: maqsad 280 — poligon markazdan silliq kengayadi (sakrash yo'q) */
        self._exhOverride = 280;
        self.tags["FOFFD"] = 20;
        setTimeout(next, 2000);
      } else if (step === "Warming up") {
        var s0 = self.tags["SPEED"] || 700, t1 = Date.now();
        if (self._startTimer) clearInterval(self._startTimer);
        self._startTimer = setInterval(function () {
          if (self.tripped || self.seq !== "Warming up") { clearInterval(self._startTimer); return; }
          var k = Math.min(1, (Date.now() - t1) / 2400);
          self.tags["SPEED"] = Math.round(s0 + (4800 - s0) * k);
          self.tags["SPEED_PCT"] = self.tags["SPEED"] / 72.8;
          self._exhOverride = 280 + 180 * k;
        }, 100);
        setTimeout(next, 2600);
      } else if (step === "Accelerating") {
        var s1 = self.tags["SPEED"] || 4800, t2 = Date.now();
        if (self._startTimer) clearInterval(self._startTimer);
        self._startTimer = setInterval(function () {
          if (self.tripped || self.seq !== "Accelerating") { clearInterval(self._startTimer); return; }
          var k = Math.min(1, (Date.now() - t2) / 2600);
          self.tags["SPEED"] = Math.round(s1 + (7280 - s1) * k);
          self.tags["SPEED_PCT"] = self.tags["SPEED"] / 72.8;
          self._exhOverride = 460 + 135 * k;
          self.tags["IGV_POS"] = 34 + 30 * k;
        }, 100);
        setTimeout(next, 2800);
      } else if (step === "Seq. Complete") {
        self._exhOverride = 595;
        setTimeout(next, 1800);
      } else if (step === "Loading") {
        if (self._startTimer) clearInterval(self._startTimer);
        self.tags["SPEED"] = 7280; self.tags["SPEED_PCT"] = 100;
        var p0 = 0, t3 = Date.now();
        self._startTimer = setInterval(function () {
          if (self.tripped || self.seq !== "Loading") { clearInterval(self._startTimer); return; }
          var k = Math.min(1, (Date.now() - t3) / 2600);
          self.tags["GEN_POWER"] = 12 * k;
          self.tags["MW_FDBK"] = self.tags["GEN_POWER"];
        }, 100);
        setTimeout(next, 2800);
      } else {
        if (step === "Base Load") {
          if (self._startTimer) clearInterval(self._startTimer);
          /* yuklama formulasi ishga tushadi — override o'chiriladi */
          self._exhOverride = null;
        }
        setTimeout(next, 1800);
      }
    })();
  },

  trip: function (cause, item) {
    this.tripped = true;
    this.recovering = false;
    this.tripCause = cause || "MANUAL TRIP";
    this.seq = "Fired Shutdown";
    this.ctl.gtStatus = "Fired Shutdown";
    this.ctl.brk52G = false;
    if (item) this.tripItems[item] = true;
    var T = this.tags;
    T["ET_NT"] = (T["ET_NT"] || 0) + 1; T["ET_NT_R"] = (T["ET_NT_R"] || 0) + 1;
    T["TOT_ET"] = (T["TOT_ET"] || 0) + 1; T["TOT_ET_R"] = (T["TOT_ET_R"] || 0) + 1;
    refreshButtons();
    refreshCustom();
  },

  bumpStarts: function () {
    var T = this.tags;
    T["TOT_ST"] = (T["TOT_ST"] || 0) + 1; T["TOT_ST_R"] = (T["TOT_ST_R"] || 0) + 1;
    T["FS_N"] = (T["FS_N"] || 0) + 1; T["FS_N_R"] = (T["FS_N_R"] || 0) + 1;
    H25.push();
  },

  counterReset: function () {
    var T = this.tags, d = new Date();
    T["EOH_R"] = 0; T["AOH_R"] = 0; T["GAS_R"] = 0;
    T["FS_N_R"] = 0; T["ET_NT_R"] = 0; T["TOT_ST_R"] = 0; T["TOT_ET_R"] = 0;
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    T["RST_DATE"] = String(d.getFullYear()).slice(2) + "/" + p2(d.getMonth() + 1) + "/" + p2(d.getDate());
    T["RST_TIME"] = p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
    H25.push();
  },

  /* start-check permissive colors */
  scColor: function (id) {
    var GRN = "rgb(0,200,0)", RED = "rgb(255,0,0)";
    if (id === "zero") return this.tags["SPEED"] < 500 ? GRN : RED;
    if (id === "brk") return !this.ctl.brk52G ? GRN : RED;
    if (id === "reset") return (Date.now() - this.lastReset < 10000) ? GRN : RED;
    if (id === "sc3_4t") return this.tripped ? RED : GRN;
    /* at Base Load these two show red in ref screenshot; green when stopped */
    if (id === "sc6_tb" || id === "sc6_bn") return this.running() ? RED : GRN;
    if (id === "sc4_qm") return this.motors.mop1.run || this.motors.mop2.run ? GRN : RED;
    if (id === "sc4_tb") return this.motors.ven1.run || this.motors.ven2.run ? GRN : RED;
    return GRN;
  },

  startCheckIds: ["sc0_bus","sc0_tci","sc0_igv","sc0_cp","zero","sc1_qn","sc1_ql",
    "sc1_off","sc1_hd","brk","sc2_cb","reset","sc2_fgn","sc3_4t","sc3_vd","sc3_tflt",
    "sc3_cps","sc4_qe","sc4_qm","sc4_tb","sc4_hs","sc4_gax","sc5_cr","sc5_tg",
    "sc5_qe","sc6_qm","sc6_qv","sc6_qt","sc6_hq","sc6_tb","sc6_bn","sc7_jop",
    "sc7_ng","sc7_gfc","sc_ps"],

  startCheckOk: function () {
    for (var i = 0; i < this.startCheckIds.length; i++) {
      if (this.scColor(this.startCheckIds[i]) === "rgb(255,0,0)") return false;
    }
    return true;
  },

  osEnable: function () { this.ctl.osTest = "ENABLE"; refreshButtons(); },
  osDisable: function () {
    this.ctl.osTest = "DISABLE";
    this.ctl.osMainRun = false; this.ctl.osBackupRun = false;
    refreshButtons();
  },
  osStartMain: function () {
    if (this.ctl.osTest !== "ENABLE" || this.tripped) return;
    if (!this.running()) return;
    this.ctl.osMainRun = true; this.ctl.osBackupRun = false;
    refreshButtons();
  },
  osAbortMain: function () { this.ctl.osMainRun = false; refreshButtons(); },
  osStartBackup: function () {
    if (this.ctl.osTest !== "ENABLE" || this.tripped) return;
    if (!this.running()) return;
    this.ctl.osBackupRun = true; this.ctl.osMainRun = false;
    refreshButtons();
  },
  osAbortBackup: function () { this.ctl.osBackupRun = false; refreshButtons(); },
  liftCal: function (v) { this.ctl.lift = v; refreshButtons(); },

  /* trainer fault helpers (called from ?trainer=1 panel) */
  setFault: function (name, on) {
    if (name in this.faults) this.faults[name] = !!on;
    if (typeof buildTrainer === "function") buildTrainer();
  },
  clearFaults: function () {
    this.faults = { vib: false, exh: false, lube: false, fuel: false };
    if (typeof buildTrainer === "function") buildTrainer();
  },

  masterReset: function () {
    this.tripped = false;
    this.tripCause = "";
    this.tripItems = {};
    this.faults = { vib: false, exh: false, lube: false, fuel: false };
    this._vibDelay = 0; this._fuelDelay = 0; this._exhDelay = 0;
    this._exhOverride = null; this._exhFaultOn = false;
    this._spreadSt = { t: 0, alarm: false }; this.spreadAlarm = false;
    this.lastReset = Date.now();
    if (window.H25_polarHist) window.H25_polarHist = [];
    /* Muhimi: init() chaqirilmaydi — barcha qiymatlar bazaga SAKRAB emas,
     * tick() dagi recovering rampasi bilan SEKIN ko'tariladi. */
    this.recovering = true;
    this.seq = "Recovering";
    this.ctl.gtStatus = "Recovering";
    /* statik bosimlar darhol tiklanadi (issiqlik/mexanika sekin): */
    this.tags["LO_HDR_P"] = H25_TAGS["LO_HDR_P"].v;
    this.tags["LO_HDR_P2"] = H25_TAGS["LO_HDR_P2"].v;
    this.tags["MOP_DISCH"] = H25_TAGS["MOP_DISCH"].v;
    this.tags["P1_PRESS"] = H25_TAGS["P1_PRESS"].v;
    this.tags["FUEL_FLOW"] = H25_TAGS["FUEL_FLOW"].v;
    this.push();
    refreshButtons();
  },

  startLoop: function () {
    /* performance.now() + accumulator: fon tabda sekinlashsa ham fizika
     * to'g'ri davom etadi (yetib olish, dt cheklangan). Qadam qat'iy 500 ms. */
    var self = this, last = performance.now(), acc = 0;
    var STEP = H25_CFG.TICK_MS, MAXD = H25_CFG.MAX_DT_MS;
    setInterval(function () {
      var now = performance.now(), dt = now - last;
      last = now;
      if (dt > MAXD) dt = MAXD;
      if (dt < 0) dt = 0;
      acc += dt;
      var n = 0;
      while (acc >= STEP && n < 10) { self.tick(STEP); acc -= STEP; n++; }
      if (n >= 10) acc = 0;
    }, H25_CFG.ACCUM_MS);
  }
};
