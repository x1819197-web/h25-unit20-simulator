/* Native boiler views: no PNG backgrounds or image hotspots. */
'use strict';
var S = KU_MODEL.create(),
  view = '9',
  test = false,
  audio = null,
  sound = true,
  lastBeep = 0;
var names = {
  feed1: 'Питательный клапан №1',
  feed2: 'Питательный клапан №2',
  blow1: 'Непрерывная продувка',
  blow2: 'Периодическая продувка',
  main: 'Главная паровая задвижка',
  bypass: 'Байпас пара',
  spray: 'Впрыск / охлаждение',
  drain: 'Дренаж',
};
var $ = function (id) {
  return document.getElementById(id);
};
function escapeText(v) {
  return String(v).replace(/[&<>"']/g, function (c) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c];
  });
}
function value(k, u) {
  return (
    '<output><span data-value="' +
    k +
    '">—</span><span class="unit">' +
    u +
    '</span></output>'
  );
}
function row(label, k, u) {
  return (
    '<div class="reading"><label>' + label + '</label>' + value(k, u) + '</div>'
  );
}
function panel(title, body) {
  return '<section class="panel"><h2>' + title + '</h2>' + body + '</section>';
}
function selection(id, label, current) {
  return (
    '<label>' +
    label +
    ' <select id="' +
    id +
    '">' +
    ['MEDIAN', 'AVG', 'MIN', 'MAX']
      .map(function (x) {
        return (
          '<option' + (x === current ? ' selected' : '') + '>' + x + '</option>'
        );
      })
      .join('') +
    '</select></label>'
  );
}
function scheme() {
  var body =
    view === '9'
      ? '<rect class="equip" x="170" y="80" width="560" height="115" rx="57"/><path d="M190 148H710V175Q710 185 695 185H205Q190 185 190 170Z" fill="#80b7d2"/><path class="pipe air flow" d="M40 230H300V195"/><path class="pipe steam flow" d="M600 80V35H850"/><path class="pipe flow" d="M550 195V250H850"/><text x="65" y="255">ПИТАТЕЛЬНАЯ ВОДА</text><text x="690" y="25">ПАР К ПЕРЕГРЕВАТЕЛЮ</text><text x="665" y="275">ПРОДУВКА</text><text x="335" y="125">БАРАБАН КУ-20</text><text class="label" x="340" y="162">УРОВЕНЬ / ДАВЛЕНИЕ / НАСЫЩЕНИЕ</text><path d="M100 212L120 248V212L100 248Z" fill="#34789b"/><text class="label" x="62" y="201">FEED 1 / 2</text>'
      : '<path class="pipe steam flow" d="M30 110H175M370 110H550M640 110H860"/><rect class="equip" x="175" y="65" width="195" height="90" rx="5"/><path d="M190 135L215 85L240 135L265 85L290 135L315 85L340 135" fill="none" stroke="#ba5144" stroke-width="3"/><text x="170" y="185">ПАРОПЕРЕГРЕВАТЕЛЬ</text><path class="equip" d="M550 85L590 135V85L550 135Z"/><text class="label" x="525" y="63">MAIN STEAM</text><path class="pipe air flow" d="M265 250V155M590 250H800"/><path class="pipe flow" d="M465 110V220H850"/><text x="53" y="46">ПАР ИЗ БАРАБАНА</text><text x="740" y="90">КОЛЛЕКТОР</text><text x="280" y="253">ВПРЫСК</text><text x="740" y="243">БАЙПАС</text><path d="M248 195L282 215V195L248 215Z" fill="#34789b"/>';
  return (
    '<svg class="schematic ku-scheme" viewBox="0 0 900 290" role="img" aria-label="' +
    (view === '9'
      ? 'Векторная схема барабана'
      : 'Векторная схема пароперегревателя') +
    '">' +
    body +
    '</svg>'
  );
}
function valves(ids) {
  return (
    '<div class="panel-body valve-grid">' +
    ids
      .map(function (id) {
        var v = S.valves[id];
        return (
          '<article class="valve-card"><h3>' +
          names[id] +
          '</h3><div class="load-row"><strong><span data-valve="' +
          id +
          '">—</span>%</strong><span class="unit">факт</span><span class="badge" data-mode="' +
          id +
          '">' +
          v.mode +
          '</span></div><input type="range" min="0" max="100" step="1" value="' +
          v.set +
          '" aria-label="' +
          names[id] +
          ' уставка" data-slider="' +
          id +
          '"><div class="load-row"><button data-valve-command="' +
          id +
          '" data-mode-set="M">MANUAL</button><button data-valve-command="' +
          id +
          '" data-mode-set="A" ' +
          (['blow1', 'blow2', 'main', 'bypass', 'drain'].includes(id)
            ? 'disabled title="Автоматический регулятор не моделируется для этого клапана"'
            : '') +
          '>AUTO</button><button data-step="-5" data-id="' +
          id +
          '">−5%</button><button data-step="5" data-id="' +
          id +
          '">+5%</button></div></article>'
        );
      })
      .join('') +
    '</div>'
  );
}
function render() {
  $('screen-title').textContent =
    view === '9'
      ? 'PL3009 · Система барабана'
      : 'PL3010 · Пар и питательная вода';
  $('screen-select').value = view;
  document.querySelectorAll('[data-view]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.view === view);
  });
  var main = panel('ТЕХНОЛОГИЧЕСКАЯ СХЕМА · SVG', scheme());
  main += panel(
    'КЛАПАНЫ · ФАКТ / УСТАВКА / РЕЖИМ',
    valves(
      view === '9'
        ? ['feed1', 'feed2', 'blow1', 'blow2']
        : ['main', 'bypass', 'spray', 'drain'],
    ),
  );
  var right =
    view === '9'
      ? panel(
          'БАРАБАН · ЖИВЫЕ ИЗМЕРЕНИЯ',
          '<div class="readings">' +
            row('Давление · канал 1', 'p1', 'bar g') +
            row('Давление · канал 2', 'p2', 'bar g') +
            row('Давление · канал 3', 'p3', 'bar g') +
            row('Выбранное давление', 'pSelected', 'bar g') +
            row('Уровень · канал 1', 'l1', 'mm') +
            row('Уровень · канал 2', 'l2', 'mm') +
            row('Уровень · канал 3', 'l3', 'mm') +
            row('Выбранный уровень', 'levelSelected', 'mm') +
            row('Температура насыщения', 'sat', '°C') +
            row('Расход продувки', 'blow', 't/h') +
            '</div><div class="controls">' +
            selection('select-p', 'Давление', S.selectP) +
            selection('select-l', 'Уровень', S.selectL) +
            '</div>',
        ) +
        panel(
          'ХИМИЯ · НОМИНАЛЬНЫЕ СПРАВОЧНЫЕ ЗНАЧЕНИЯ',
          '<div class="readings">' +
            row('Электропроводность', 'conductivity', 'µS/cm') +
            row('pH питательной воды', 'ph', 'pH') +
            row('Растворённый кислород', 'oxygen', 'µg/L') +
            '</div><div class="quality-note">Химическая динамика не моделируется. Отрицательные значения не используются.</div>',
        )
      : panel(
          'ПАР / ВОДА · ЖИВЫЕ ИЗМЕРЕНИЯ',
          '<div class="readings">' +
            row('Расход пара в коллектор', 'steam', 't/h') +
            row('Давление барабана', 'p', 'bar g') +
            row('Перегретый пар', 'tSH', '°C') +
            row('Насыщенный пар', 'sat', '°C') +
            row('Питательная вода', 'feed', 't/h') +
            row('Испарение', 'evaporation', 't/h') +
            row('Продувка и дренаж', 'blow', 't/h') +
            row('Массовый небаланс', 'massBalance', 't/h') +
            '</div>',
        );
  right += panel(
    'ИСТОЧНИК ТЕПЛА · H25',
    '<div class="readings">' +
      row('Выхлоп H25', 'exhaust', '°C') +
      row('Мощность H25', 'h25Power', 'MW') +
      row('Усвоенное тепло', 'heat', 'MW') +
      '</div><div class="info-line" id="heat-mode"></div>',
  );
  $('page').innerHTML =
    '<div class="ku-layout"><div class="stack">' +
    main +
    '</div><div class="stack">' +
    right +
    '</div></div>';
  document.querySelectorAll('[data-slider]').forEach(function (el) {
    el.oninput = function () {
      S.command(el.dataset.slider, 'set', el.value);
      update();
    };
  });
  document.querySelectorAll('[data-valve-command]').forEach(function (el) {
    el.onclick = function () {
      S.command(el.dataset.valveCommand, 'mode', el.dataset.modeSet);
      update();
    };
  });
  document.querySelectorAll('[data-step]').forEach(function (el) {
    el.onclick = function () {
      var v = S.valves[el.dataset.id];
      S.command(el.dataset.id, 'set', v.set + Number(el.dataset.step));
      update();
    };
  });
  if ($('select-p'))
    $('select-p').onchange = function () {
      S.selectP = this.value;
      S.pSelected = KU_MODEL.select(S.pChannels, S.selectP);
      update();
    };
  if ($('select-l'))
    $('select-l').onchange = function () {
      S.selectL = this.value;
      S.levelSelected = KU_MODEL.select(S.levelChannels, S.selectL);
      update();
    };
  update();
  history.replaceState(null, '', '#' + view);
}
function update() {
  var data = Object.assign({}, S, {
    p1: S.pChannels[0],
    p2: S.pChannels[1],
    p3: S.pChannels[2],
    l1: S.levelChannels[0],
    l2: S.levelChannels[1],
    l3: S.levelChannels[2],
    conductivity: 0.6,
    ph: 8.9,
    oxygen: 16,
  });
  document.querySelectorAll('[data-value]').forEach(function (e) {
    var x = data[e.dataset.value];
    e.textContent = Number.isFinite(x) ? x.toFixed(2) : '—';
  });
  document.querySelectorAll('[data-valve]').forEach(function (e) {
    e.textContent = S.valves[e.dataset.valve].pct.toFixed(1);
  });
  document.querySelectorAll('[data-slider]').forEach(function (e) {
    var v = S.valves[e.dataset.slider];
    e.disabled = v.mode === 'A';
    if (document.activeElement !== e) e.value = v.set;
  });
  document.querySelectorAll('[data-mode]').forEach(function (e) {
    e.textContent = S.valves[e.dataset.mode].mode === 'A' ? 'AUTO' : 'MANUAL';
  });
  document.querySelectorAll('[data-valve-command]').forEach(function (e) {
    e.setAttribute(
      'aria-pressed',
      String(S.valves[e.dataset.valveCommand].mode === e.dataset.modeSet),
    );
  });
  document.querySelectorAll('[data-step]').forEach(function (e) {
    e.disabled = S.valves[e.dataset.id].mode === 'A';
  });
  $('ku-state').textContent = S.trip
    ? 'TRIPPED'
    : S.paused
      ? 'PAUSED'
      : 'NORMAL';
  $('sim-clock').textContent = S.t.toFixed(1) + ' s';
  $('trip-banner').hidden = !S.trip;
  $('trip-banner').textContent = 'FIRST-OUT · ' + S.firstOut;
  $('pause-button').textContent = S.paused ? 'RESUME' : 'PAUSE';
  $('protection-button').textContent = S.protection
    ? 'PROTECTION ON'
    : 'PROTECTION BYPASSED';
  $('protection-button').setAttribute('aria-pressed', String(S.protection));
  $('link-status').textContent = UNIT20_LINK.status();
  $('link-quality').textContent = test
    ? 'H25 TEST SOURCE'
    : UNIT20_LINK.status();
  $('heat-mode').textContent = test
    ? 'TEST: 595 °C / 28.6 MW (не реальный H25)'
    : S.linked
      ? 'Связь с H25 активна'
      : 'Автономно: номинальный источник 595 °C / 28.6 MW';
  if ($('events-dialog').open) events();
  if (
    sound &&
    audio &&
    audio.state === 'running' &&
    (S.trip || S.h25Trip) &&
    performance.now() - lastBeep > 600
  ) {
    lastBeep = performance.now();
    var o = audio.createOscillator(),
      g = audio.createGain();
    o.frequency.value = 740;
    g.gain.setValueAtTime(0.06, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.22);
  }
}
function events() {
  $('events-body').innerHTML = S.events
    .map(function (e) {
      return (
        '<div class="event ' +
        escapeText(e.type) +
        '"><time>' +
        e.t.toFixed(1) +
        ' s</time><strong>' +
        escapeText(e.type) +
        '</strong><span>' +
        escapeText(e.message) +
        '</span></div>'
      );
    })
    .join('');
}
document.querySelectorAll('[data-view]').forEach(function (b) {
  b.onclick = function () {
    view = b.dataset.view;
    render();
  };
});
$('screen-select').onchange = function () {
  view = this.value;
  render();
};
$('h25-link').href = window.UNIT20_H25_ENTRY || '../index.html';
var h25URL = new URL($('h25-link').href);
h25URL.searchParams.set(
  'session',
  new URLSearchParams(location.search).get('session') || 'unit20-default',
);
$('h25-link').href = h25URL.href;
$('fsbtn').onclick = function () {
  if (document.fullscreenElement)
    document.exitFullscreen().catch(function () {});
  else
    document.documentElement.requestFullscreen?.().catch(function () {
      $('command-message').textContent = 'Полноэкранный режим недоступен';
    });
};
$('h25test').onclick = function () {
  test = !test;
  this.textContent = test ? 'H25 TEST ON' : 'H25 TEST OFF';
  this.setAttribute('aria-pressed', String(test));
  S.log(
    'SOURCE',
    test ? 'Test heat source enabled' : 'Test heat source disabled',
  );
  update();
};
$('pause-button').onclick = function () {
  S.paused = !S.paused;
  update();
};
$('trip-button').onclick = function () {
  S.tripNow('LOCAL BOILER SHUTDOWN');
  update();
};
$('reset-button').onclick = function () {
  S.reset();
  update();
  $('command-message').textContent = S.events[0].message;
};
$('scenario-button').onclick = function () {
  if (confirm('Загрузить номинальный сценарий котла?')) {
    S = KU_MODEL.create();
    render();
  }
};
$('protection-button').onclick = function () {
  if (
    S.protection &&
    !confirm('Отключить учебные защиты по уровню и давлению?')
  )
    return;
  S.protection = !S.protection;
  S.log('PROTECTION', S.protection ? 'Enabled' : 'Bypassed by instructor');
  update();
};
$('events-button').onclick = function () {
  events();
  $('events-dialog').showModal();
};
$('events-close').onclick = function () {
  $('events-dialog').close();
};
document.addEventListener(
  'pointerdown',
  function () {
    if (!audio)
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    if (audio?.state === 'suspended') audio.resume().catch(function () {});
  },
  { once: true },
);
$('sndbtn').onclick = function () {
  sound = !sound;
  this.textContent = sound ? 'SOUND ON' : 'SOUND OFF';
  this.setAttribute('aria-pressed', String(sound));
};
view = location.hash === '#10' ? '10' : '9';
render();
var last = performance.now(),
  acc = 0;
setInterval(function () {
  var now = performance.now(),
    elapsed = now - last;
  last = now;
  if (document.hidden || S.paused) {
    acc = 0;
    if (!document.hidden) update();
    return;
  }
  acc += Math.min(elapsed, 1000);
  while (acc >= 500) {
    var H = test
      ? { exh_t: 595, power: 28.6, running: true, tripped: false }
      : UNIT20_LINK.read();
    S.step(0.5, H);
    acc -= 500;
  }
  update();
  UNIT20_LINK.send({
    steam: S.steam,
    drumP: S.p,
    drumLevel: S.level,
    boilerTrip: S.trip,
    backP: Math.max(-20, Math.min(20, (S.steam - 51) * 0.5)),
    feed: S.feed,
    paused: false,
  });
}, 100);
setInterval(function () {
  UNIT20_LINK.send({
    boilerTrip: S.trip,
    backP: Math.max(-20, Math.min(20, (S.steam - 51) * 0.5)),
    paused: S.paused || document.hidden,
  });
}, 1500);
