// Self-test: open index.html?selftest=1 in headless chrome with --dump-dom.
// Auto-exercises buttons/engine, writes PASS/FAIL into #selftest-result.
function runSelfTest() {
  var res = [];
  function ok(name, cond) { res.push((cond ? 'PASS' : 'FAIL') + ':' + name); }
  try {
    // 1. location toggle + orange highlight
    H25.press('location', 'REMOTE');
    var b = document.querySelector('#page [data-grp="location"][data-val="REMOTE"]');
    ok('location-remote', H25.ctl.location === 'REMOTE' && b && b.classList.contains('orange'));
    H25.press('location', 'LOCAL');

    // 2. gtStatus / ffdStatus — read-only (click does not change the unit)
    var s0 = H25.seq, f0 = H25.ctl.ffdStatus;
    H25.press('gtStatus', 'Cranking');
    H25.press('ffdStatus', 'FFDN');
    ok('status-readonly', H25.seq === s0 && H25.ctl.ffdStatus === f0);
    var st = document.querySelector('#page [data-grp="gtStatus"]');
    ok('status-no-act', st && !st.hasAttribute('data-act') && st.classList.contains('ro'));

    // 3. raise jog moves the load setpoint (0.1 MW/s)
    var l0 = H25.tags['LOAD_SET'];
    H25.raiseLower = 1; H25.tick(1000); H25.raiseLower = 0;
    ok('raise-jogs-loadset', H25.tags['LOAD_SET'] > l0 + 0.05);

    // 4. BASE presets 30 MW, PRE SELECT keeps the operator value
    H25.press('loadMode', 'BASE');
    ok('base-loadset-30', H25.tags['LOAD_SET'] === 30.0);
    H25.press('loadMode', 'PRE SELECT');

    // 5. trip -> breaker opens, load drops, sequence = Fired Shutdown
    H25.trip('SELFTEST', '9EX');
    ok('trip-latch', H25.tripped === true && H25.ctl.brk52G === false);
    ok('trip-load-0', H25.tags['GEN_POWER'] === 0);
    ok('trip-seq', H25.seq === 'Fired Shutdown');
    var exh0 = H25.tags['EXH_T'];

    // 6. master reset = latch only: no value jump, no restart
    H25.masterReset();
    ok('reset-latch', H25.tripped === false && H25.seq === 'Fired Shutdown');
    H25.tick(500);
    ok('reset-no-jump', Math.abs(H25.tags['EXH_T'] - exh0) < 5);

    // 7. time scale multiplies simulated time (not physics)
    var t0 = H25.tags['SPEED'];
    H25.setTimeScale(10); H25.tick(1000); H25.setTimeScale(1);
    ok('timescale-x10', H25.tags['SPEED'] < t0);

    // restore base-load demo state
    H25.init(); H25.seq = 'Base Load'; H25.ctl.gtStatus = 'Base Load'; H25.push(); refreshButtons();

    // 8. all bound tags numeric
    var bad = 0, els = document.querySelectorAll('#page [data-tag]');
    for (var i = 0; i < els.length; i++) if (isNaN(parseFloat(els[i].textContent))) bad++;
    ok('tags-numeric(' + els.length + ')', bad === 0);

    // 9. nav zones exist (19)
    ok('nav-19', document.querySelectorAll('#navzones .ozone').length === 19);
  } catch (e) { res.push('FAIL:exception-' + e.message); }
  var d = document.createElement('div');
  d.id = 'selftest-result';
  d.textContent = res.join(' | ');
  document.body.appendChild(d);
  document.title = 'SELFTEST ' + res.join(' | ');
}
