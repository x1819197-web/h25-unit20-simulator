'use strict';
const assert = require('node:assert/strict'),
  fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const s = {
  console,
  document: { querySelectorAll: () => [] },
  setInterval: () => 0,
  clearInterval: () => {},
  performance: { now: () => 0 },
};
s.window = s;
vm.createContext(s);
for (const f of ['config', 'rng', 'exhaust-math', 'tags', 'engine'])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'),
    s,
  );
const H = s.H25;
let count = 0;
function test(name, fn) {
  H.init();
  fn();
  count++;
  console.log('PASS ' + name);
}
function ticks(n) {
  for (let i = 0; i < n; i++) H.tick(500);
}
test('STOP cancels each startup phase', () => {
  for (let n of [0, 4, 10, 16, 25, 35, 45, 55]) {
    H.init('cold');
    assert.equal(H.runStartupSeq(), true);
    ticks(n);
    H.press('master', 'STOP');
    ticks(120);
    assert.equal(H._startup, null);
    assert.equal(H.flameOn(), false);
    assert.equal(H.tags.SPEED, 0);
    assert.equal(H.tags.GEN_POWER, 0);
  }
});
test('START rejects base-load/closed breaker state', () => {
  assert.equal(H.runStartupSeq(), false);
  assert.equal(H._startup, null);
});
test('Cold start completes with synchronized breaker', () => {
  H.init('cold');
  H.runStartupSeq();
  ticks(80);
  assert.equal(H.seq, 'Base Load');
  assert.equal(H.ctl.brk52G, true);
  assert(H.tags.GEN_POWER > 20);
  assert(!H.tripped);
});
test('Sync check gates breaker closure', () => {
  H.ctl.brk52G = false;
  H.sync.df = 0.4;
  H.release52G();
  assert.equal(H.ctl.brk52G, false);
  H.sync.df = 0;
  H.sync.dphi = 40;
  H.release52G();
  assert.equal(H.ctl.brk52G, false);
  H.sync.dphi = 0;
  H.release52G();
  assert.equal(H.ctl.brk52G, true);
});
test('Main overspeed reaches 8006 and latches 12H', () => {
  H.osEnable();
  H.osStartMain();
  ticks(12);
  assert.equal(H.tripped, true);
  assert.equal(H.tripItems['12H'], true);
});
test('Backup overspeed reaches 8079 and latches 12H_P', () => {
  H.osEnable();
  H.osStartBackup();
  ticks(12);
  assert.equal(H.tripped, true);
  assert.equal(H.tripItems['12H_P'], true);
});
test('Trip idempotent and first-out retained', () => {
  let n = H.tags.TOT_ET;
  H.trip('FIRST', '9EX');
  H.trip('SECOND', '66TXT');
  assert.equal(H.tags.TOT_ET, n + 1);
  assert.equal(H.tripCause, 'FIRST');
  assert.equal(H.tripItems['66TXT'], true);
});
test('RESET never restarts turbine', () => {
  H.trip('TEST', '9EX');
  assert.equal(H.masterReset(), false);
  ticks(50);
  assert.equal(H.masterReset(), true);
  ticks(80);
  assert.equal(H.seq, 'Ready to Start');
  assert.equal(H.tags.SPEED, 0);
  assert.equal(H.tags.GEN_POWER, 0);
  assert.equal(H.ctl.brk52G, false);
});
test('Report tags follow all modes and trip fuel isolation', () => {
  H.trip('TEST', '9EX');
  ticks(20);
  assert.equal(H.tags.ACT_P1, H.tags.GEN_POWER);
  assert.equal(H.tags.TB_SPEED, H.tags.SPEED);
  assert.equal(H.tags.GAS_FLOW, H.tags.FUEL_FLOW);
  assert.equal(H.tags.GEN_POWER, 0);
  assert.equal(H.tags.FUEL_FLOW, 0);
});
test('Reset counters stay near zero', () => {
  H.counterReset();
  H.tick(500);
  assert(H.tags.EOH_R > 0 && H.tags.EOH_R < 0.001);
  assert(H.tags.AOH_R < 0.001);
  assert(H.tags.GAS_R < 0.001);
});
test('Zero load cannot produce negative power/current', () => {
  H.tags.LOAD_SET = 0;
  ticks(100);
  assert(H.tags.GEN_POWER >= 0);
  assert(H.tags.GEN_A >= 0);
});
test('Voltage and reactive setpoints persist', () => {
  H.vRaiseLower = 1;
  H.iRaiseLower = 1;
  ticks(20);
  H.vRaiseLower = H.iRaiseLower = 0;
  let v = H.tags.GEN_KV,
    q = H.reactiveSet;
  ticks(20);
  assert(Math.abs(H.tags.GEN_KV - v) < 1e-10);
  assert(q > 4.3);
  assert(H.tags.GEN_MVAR > 4.3);
});
test('Full scenario reset restores equipment and flags', () => {
  H.trip('TEST', '9EX');
  H.motorStop('mop1');
  H.faults.exh = true;
  H.init();
  assert(!H.tripped);
  assert(H.ctl.brk52G);
  assert(H.motors.mop1.run);
  assert(!H.faults.exh);
  assert.equal(H._startup, null);
});
for (const [fault, item, limit] of [
  ['vib', '39VTX', 100],
  ['lube', '63QTX', 100],
  ['fuel', '63FGLT', 100],
  ['exh', '66TXT', 1600],
])
  test(fault + ' fault protective trip', () => {
    H.setFault(fault, true);
    for (let i = 0; i < limit && !H.tripped; i++) H.tick(500);
    assert(H.tripped);
    assert(H.tripItems[item], H.tripCause);
  });
test('Active fault inhibits protection reset', () => {
  H.init('cold');
  H.setFault('lube', true);
  H.trip('TEST', '9EX');
  assert.equal(H.masterReset(), false);
  H.clearFaults();
  assert.equal(H.masterReset(), true);
});
test('Pause does not advance model clock', () => {
  H.paused = true;
  let t = H._simT;
  H.tick(500);
  assert.equal(H._simT, t);
});
test('Model independent of DOM and timers', () => {
  assert(
    !fs
      .readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8')
      .includes('setTimeout('),
  );
});
const KU = require('../ku/model.js');
test('KU selectors calculate real channels', () => {
  assert.equal(KU.select([2, 9, 4], 'MEDIAN'), 4);
  assert.equal(KU.select([2, 9, 4], 'MAX'), 9);
  assert.equal(KU.select([2, 9, 4], 'MIN'), 2);
  assert.equal(KU.select([2, 9, 4], 'AVG'), 5);
});
test('KU saturation increases with pressure', () => {
  assert(KU.saturation(34) > KU.saturation(29));
  assert(KU.saturation(31.8) > 230);
});
test('KU deterministic and nominal stable for 30 minutes', () => {
  let a = KU.create(),
    b = KU.create();
  for (let i = 0; i < 3600; i++) {
    a.step(0.5, null);
    b.step(0.5, null);
  }
  assert.deepEqual(a.valves, b.valves);
  assert.equal(a.level, b.level);
  assert(!a.trip);
  assert(Math.abs(a.level) < 30);
  assert(a.p > 28 && a.p < 34.5);
  assert(a.steam >= 0 && a.feed >= 0);
});
test('KU manual valve affects feed and AUTO owns setpoint', () => {
  let k = KU.create();
  k.command('feed1', 'mode', 'M');
  k.command('feed2', 'mode', 'M');
  k.command('feed1', 'set', 0);
  k.command('feed2', 'set', 0);
  for (let i = 0; i < 50; i++) k.step(0.5, null);
  assert(k.feed < 5);
});
test('KU heat responds to turbine shutdown', () => {
  let k = KU.create(),
    h = k.heat;
  for (let i = 0; i < 600; i++)
    k.step(0.5, { running: false, tripped: true, power: 0, exh_t: 200 });
  assert(k.heat < h * 0.2);
  assert(k.evaporation < 15);
});
test('KU first-out and reset interlock', () => {
  let k = KU.create();
  k.level = 60;
  k.step(0.5, null);
  assert(k.trip);
  let cause = k.firstOut;
  k.tripNow('SECOND');
  assert.equal(k.firstOut, cause);
  assert.equal(k.reset(), false);
  k.level = 0;
  k.p = 31;
  assert.equal(k.reset(), true);
});
console.log(`\nRegression: ${count} passed`);
