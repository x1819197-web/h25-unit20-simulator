/* UNIT-20 avariya ovozi (H25 oynasi): WebAudio, faylsiz.
 * TRIP (turbina trip, overspeed, qozon trip ?link=1 da) = ikki tonli sirena.
 * Fault/ogohlantirish (vib/exh/lube/fuel aktiv, lekin hali trip yo'q) = davriy beep.
 * Brauzer ovozni faqat foydalanuvchi birinchi klikidan keyin beradi —
 * shu sababli AudioContext birinchi click/keydown da ochiladi.
 * O'chirish: pastki o'ng burchakdagi 🔊 tugma.
 */
(function () {
  if (!window.H25) return;
  var SND_ON = true, AC = null, beepT = 0, sirenT = 0, sirenHi = false;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  document.addEventListener('click', function () { ac(); }, { once: true });
  document.addEventListener('keydown', function () { ac(); }, { once: true });
  function tone(f, ms) {
    var c = ac();
    if (!c || !SND_ON) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.10, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + ms / 1000);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + ms / 1000);
    } catch (e) {}
  }
  function alarm(isTrip, isWarn) {
    if (!SND_ON) return;
    var now = Date.now();
    if (isTrip) {
      if (now - sirenT > 450) { sirenT = now; sirenHi = !sirenHi; tone(sirenHi ? 880 : 620, 380); }
    } else if (isWarn) {
      if (now - beepT > 1100) { beepT = now; tone(990, 160); }
    }
  }
  var LINK_ON = /(?:\?|&)link=1/.test(location.search || '');
  if (window.H25.onTick) window.H25.onTick(function () {
    var kuTrip = (LINK_ON && window.KU_LIVE && window.KU_LIVE.boilerTrip === true);
    var F = window.H25.faults || {};
    var warn = !!(F.vib || F.exh || F.lube || F.fuel);
    alarm(!!(window.H25.tripped || kuTrip), warn);
  });
  /* suzuvchi ovoz tugmasi (HMI 1:1 buzilmaydi — burchakda) */
  function mkBtn() {
    var b = document.createElement('div');
    b.id = 'sndbtn';
    b.title = "Avariya ovozi on/off";
    b.textContent = '🔊';
    b.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;font-size:22px;cursor:pointer;background:#0c2a0c;color:#7dff7d;border:1px solid #00c000;border-radius:6px;padding:2px 10px;user-select:none;';
    b.onclick = function (e) {
      if (e) e.stopPropagation();
      SND_ON = !SND_ON;
      b.textContent = SND_ON ? '🔊' : '🔇';
    };
    document.body.appendChild(b);
  }
  if (document.body) mkBtn();
  else document.addEventListener('DOMContentLoaded', mkBtn);
})();
