// Self-test: open index.html?selftest=1 in headless chrome with --dump-dom.
// Auto-exercises buttons/engine, writes PASS/FAIL into #selftest-result.
function runSelfTest() {
  var res = [];
  function ok(name, cond) { res.push((cond ? 'PASS' : 'FAIL') + ':' + name); }
  try {
    // 1. location toggle
    H25.press('location', 'REMOTE');
    var b = document.querySelector('#page [data-grp="location"][data-val="REMOTE"]');
    ok('location-remote', H25.ctl.location === 'REMOTE' && b && b.classList.contains('orange'));
    H25.press('location', 'LOCAL');
    // 2. raise jogs load set
    var l0 = H25.tags['LOAD_SET'];
    H25.raiseLower = 1; H25.tick(); H25.tick(); H25.raiseLower = 0;
    ok('raise-jogs-loadset', H25.tags['LOAD_SET'] > l0);
    // 3. BASE resets load set to 30
    H25.press('loadMode', 'BASE');
    ok('base-loadset-30', H25.tags['LOAD_SET'] === 30.0);
    H25.press('loadMode', 'PRE SELECT');
    // 4. trip + coast + reset
    H25.trip('SELFTEST');
    var mw0 = H25.tags['GEN_POWER'];
    H25.tick(); H25.tick();
    ok('trip-coast', H25.tripped === true && H25.tags['GEN_POWER'] < mw0);
    H25.masterReset();
    ok('reset', H25.tripped === false && (H25.seq === 'Recovering' || H25.seq === 'Ready to Start'));
    /* recovering rampasi: bir tick dan keyin qiymatlar sekin o'sishi kerak */
    var exh0 = H25.tags['EXH_T'];
    H25.tick();
    ok('reset-ramp', H25.tags['EXH_T'] >= exh0);
    // restore base-load demo state
    H25.init(); H25.seq = 'Base Load'; H25.ctl.gtStatus = 'Base Load'; H25.push(); refreshButtons();
    // 5. all bound tags numeric
    var bad = 0, els = document.querySelectorAll('#page [data-tag]');
    for (var i = 0; i < els.length; i++) if (isNaN(parseFloat(els[i].textContent))) bad++;
    ok('tags-numeric(' + els.length + ')', bad === 0);
    // 6. nav zones exist (19)
    ok('nav-19', document.querySelectorAll('#navzones .ozone').length === 19);
  } catch (e) { res.push('FAIL:exception-' + e.message); }
  var d = document.createElement('div');
  d.id = 'selftest-result';
  d.textContent = res.join(' | ');
  document.body.appendChild(d);
  document.title = 'SELFTEST ' + res.join(' | ');
}
