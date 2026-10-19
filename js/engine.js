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
          // F2-4 switching follows the live KD4H setting, not a duplicated constant.
          var threshold = i === 4 ? T.KD4H : [0, 0, 36.3, 44.8][i];
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
        // Operator-confirmed indication: below KD4H ONLY F2-4 turns white.
        // No KC4L hysteresis or delay is applied to this indication. Actual GCV
        // position remains a lagged feedback signal and may still be closing.
        if (k === 'F24') {
          var ffd = this.tags.FOFFD, kd4h = this.tags.KD4H;
          r[k] = !this.flameOn() || !Number.isFinite(ffd) ||
            !Number.isFinite(kd4h) || ffd < kd4h;
        } else r[k] = !this.flameOn() || this.tags[tags[i]] < 5;
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
