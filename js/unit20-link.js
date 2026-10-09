/* UNIT-20 bog'lovchi modul: H25 gaz turbina <-> KU-20 qozon (PL3009/PL3010).
 * H25 ga vizual o'zgarish kiritmaydi (1:1 buzilmaydi).
 * Har 500ms tick dan keyin jonli issiqlikni e'lon qiladi:
 *   EXH_T, GEN_POWER, SPEED, LOAD_SET, FUEL_FLOW, running, tripped, seq
 * Qozon tomoni (D:/qozon/simulyatsiya/index.html) shuni o'qiydi va
 * bug' ishlab chiqarishni shunga bog'laydi. Teskari yo'nalish:
 *   ?link=1 bo'lsa, qozon trip/backpressure H25 ga yumshoq ta'sir qiladi.
 *   Odatda (selftest/oddiy rejim) teskari ta'sir O'CHIQ — 7/7 PASS buzilmaydi.
 * Kanal: BroadcastChannel('unit20') + localStorage (h25_live / ku20_live).
 */
(function () {
  if (!window.H25 || !window.H25_TAGS) return;
  var LINK_ON = /(?:\?|&)link=1/.test(location.search || '');
  var bc = null;
  try { bc = ('BroadcastChannel' in window) ? new BroadcastChannel('unit20') : null; } catch (e) { bc = null; }
  window.KU_LIVE = null;
  function readKU() {
    try {
      var raw = localStorage.getItem('ku20_live');
      if (raw) window.KU_LIVE = JSON.parse(raw);
    } catch (e) {}
  }
  if (bc) {
    bc.onmessage = function (ev) {
      var m = ev && ev.data;
      if (m && m.src === 'ku20') window.KU_LIVE = m;
    };
  }
  setInterval(readKU, 2000);
  readKU();
  function broadcast(T) {
    var msg = {
      src: 'h25',
      t: Date.now(),
      exh_t: T['EXH_T'], power: T['GEN_POWER'], speed: T['SPEED'],
      load_set: T['LOAD_SET'], fuel_flow: T['FUEL_FLOW'],
      running: window.H25.running ? window.H25.running() : true,
      tripped: !!window.H25.tripped, seq: window.H25.seq || ''
    };
    try { localStorage.setItem('h25_live', JSON.stringify(msg)); } catch (e) {}
    if (bc) { try { bc.postMessage(msg); } catch (e) {} }
    // Teskari bog'liqlik — FAQAT ?link=1 da (ixtiyoriy, yumshoq)
    if (LINK_ON && window.KU_LIVE && !window.H25.tripped) {
      var ku = window.KU_LIVE;
      if (ku && ku.boilerTrip === true) {
        // Qozon avariyasi -> GT ni yumshoq tushirish (keskin trip emas)
        if (T['GEN_POWER'] > 5) {
          T['GEN_POWER'] = Math.max(5, T['GEN_POWER'] - 0.4);
          T['MW_FDBK'] = T['GEN_POWER'];
          T['EXH_T'] = Math.max(450, (T['EXH_T'] || 595) - 3);
        }
      } else if (ku && typeof ku.backP === 'number') {
        // Qozon qarshiligi chiqish haroratiga kichik tuzatish
        T['EXH_T'] = Math.min(660, Math.max(450, T['EXH_T'] + ku.backP * 0.02));
      }
    }
  }
  if (window.H25.onTick) window.H25.onTick(broadcast);
  else {
    var old = window.H25.tick.bind(window.H25);
    window.H25.tick = function () { old(); broadcast(window.H25.tags); };
  }
})();
