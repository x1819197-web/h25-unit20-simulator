/* KU-20 reduced-order educational model. Flows t/h, inventory t, heat MW.
 * Not IAPWS-IF97, not an OEM boiler/protection model. Deterministic fixed dt.
 * Saturation interpolation is a limited-range training approximation. */
(function (root) {
  'use strict';
  var clamp = function (x, a, b) {
    return Math.max(a, Math.min(b, x));
  };
  function sat(pGauge) {
    var p = pGauge + 1.01325,
      table = [
        [1, 99.6],
        [5, 151.8],
        [10, 179.9],
        [20, 212.4],
        [30, 233.9],
        [40, 250.4],
      ];
    p = clamp(p, 1, 40);
    for (var i = 1; i < table.length; i++)
      if (p <= table[i][0]) {
        var a = table[i - 1],
          b = table[i];
        return a[1] + ((b[1] - a[1]) * (p - a[0])) / (b[0] - a[0]);
      }
    return 250.4;
  }
  function model() {
    var M = {
      t: 0,
      p: 31.8,
      level: 0,
      feed: 55.5,
      steam: 51,
      blow: 3.9,
      heat: 29.75,
      tSH: 410,
      trip: false,
      firstOut: '',
      protection: true,
      paused: false,
      events: [],
      valves: {
        feed1: { pct: 35, set: 35, mode: 'A' },
        feed2: { pct: 50, set: 50, mode: 'A' },
        blow1: { pct: 65, set: 65, mode: 'M' },
        blow2: { pct: 65, set: 65, mode: 'M' },
        main: { pct: 85, set: 85, mode: 'M' },
        bypass: { pct: 0, set: 0, mode: 'M' },
        spray: { pct: 29, set: 29, mode: 'A' },
        drain: { pct: 0, set: 0, mode: 'M' },
      },
      selectP: 'MEDIAN',
      selectL: 'MEDIAN',
    };
    M.log = function (type, message) {
      this.events.unshift({ t: this.t, type: type, message: message });
      this.events = this.events.slice(0, 150);
    };
    M.reset = function () {
      if (Math.abs(this.level) >= 30 || this.p >= 34) {
        this.log(
          'REJECT',
          'Reset requires |level| < 30 mm and pressure < 34 bar g',
        );
        return false;
      }
      this.trip = false;
      this.firstOut = '';
      this.log('RESET', 'Boiler trip latch cleared');
      return true;
    };
    M.tripNow = function (cause) {
      if (this.trip) return;
      this.trip = true;
      this.firstOut = cause;
      this.log('TRIP', cause);
    };
    M.command = function (id, command, value) {
      var v = this.valves[id];
      if (!v) return;
      if (command === 'mode') {
        v.mode = value === 'A' ? 'A' : 'M';
        this.log('MODE', id + ' ' + v.mode);
      } else if (v.mode === 'M') {
        v.set = clamp(Number(value) || 0, 0, 100);
        this.log('VALVE', id + ' ' + v.set + '%');
      }
    };
    M.step = function (dt, H) {
      if (this.paused || !(dt > 0) || dt > 5) return;
      this.t += dt;
      var self = this;
      var linked = !!H,
        run = linked ? H.running && !H.tripped : true,
        exh = linked ? H.exh_t : 595,
        power = linked ? H.power : 28.6;
      var gasMass = run
        ? 110 * clamp(0.55 + (0.45 * power) / 28.6, 0.2, 1.2)
        : 0;
      var heatTarget = (gasMass * 1.12 * Math.max(0, exh - 180) * 0.58) / 1000;
      this.heat +=
        (heatTarget - this.heat) * (1 - Math.exp(-dt / (run ? 45 : 120)));
      var produced = Math.max(0, (this.heat * 3600) / 2100),
        demand = this.steam + this.blow - this.level * 0.25;
      ['feed1', 'feed2'].forEach(function (id) {
        var v = self.valves[id];
        if (v.mode === 'A') v.set = clamp((demand / 130) * 100, 0, 100);
      });
      if (this.valves.spray.mode === 'A')
        this.valves.spray.set = clamp(29 + (this.tSH - 410) * 1.3, 0, 100);
      Object.values(this.valves).forEach(function (v) {
        v.pct += clamp(v.set - v.pct, -14 * dt, 14 * dt);
      });
      var V = this.valves;
      var feedTarget =
        ((V.feed1.pct + V.feed2.pct) / 200) *
        130 *
        Math.sqrt(clamp((48 - this.p) / 16.2, 0, 2));
      this.feed += (feedTarget - this.feed) * (1 - Math.exp(-dt / 4));
      this.blow =
        ((V.blow1.pct + V.blow2.pct) / 100) * 3 + (V.drain.pct / 100) * 6;
      var outlet =
        (V.main.pct / 85 + (V.bypass.pct / 100) * 0.5) * (this.trip ? 0.15 : 1);
      var steamTarget =
        51 * outlet * Math.sqrt(clamp((this.p - 20) / 11.8, 0, 3));
      this.steam += (steamTarget - this.steam) * (1 - Math.exp(-dt / 4));
      this.level = clamp(
        this.level + ((this.feed - produced - this.blow) * dt) / 3600 / 0.01,
        -100,
        100,
      );
      this.p = clamp(this.p + (produced - this.steam) * dt * 0.0015, 0, 38);
      var satT = sat(this.p),
        shTarget = run
          ? Math.min(exh - 30, satT + 180) - V.spray.pct * 0.4
          : satT;
      this.tSH +=
        (Math.max(satT, shTarget) - this.tSH) * (1 - Math.exp(-dt / 40));
      this.sat = satT;
      this.massBalance = this.feed - produced - this.blow;
      this.evaporation = produced;
      this.pChannels = [this.p + 0.02, this.p - 0.01, this.p];
      this.levelChannels = [this.level + 1.5, this.level - 1, this.level];
      this.pSelected = select(this.pChannels, this.selectP);
      this.levelSelected = select(this.levelChannels, this.selectL);
      if (this.protection && !this.trip) {
        if (Math.abs(this.levelSelected) > 50)
          this.tripNow(
            'DRUM LEVEL ' + (this.levelSelected > 0 ? 'HIGH' : 'LOW'),
          );
        else if (this.pSelected > 34.5) this.tripNow('DRUM PRESSURE HIGH');
      }
      this.linked = linked;
      this.exhaust = exh;
      this.h25Power = power;
      this.h25Trip = linked && H.tripped;
    };
    M.log('SCENARIO', 'Nominal boiler state');
    M.step(0.00001, null);
    return M;
  }
  function select(a, mode) {
    if (mode === 'MAX') return Math.max.apply(null, a);
    if (mode === 'MIN') return Math.min.apply(null, a);
    if (mode === 'AVG')
      return (
        a.reduce(function (s, v) {
          return s + v;
        }, 0) / a.length
      );
    return a.slice().sort(function (a, b) {
      return a - b;
    })[1];
  }
  var api = { create: model, saturation: sat, select: select };
  root.KU_MODEL = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
