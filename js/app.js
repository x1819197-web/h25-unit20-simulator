/* Native UNIT-20 HMI: semantic controls + SVG mimics. Reference PNGs are never loaded. */
'use strict';
var H25_SCREENS = {},
  H25_current = 'startup';
var H25_NAMES = {
  GEN_POWER: 'Active power',
  FOFFD: 'Fuel demand',
  IGV_POS: 'Inlet guide vanes',
  IBH_POS: 'Inlet bleed heating',
  SPEED: 'Turbine speed',
  SPEED_PCT: 'Rated speed',
  EXH_T: 'Exhaust mean · 18 TC',
  EXH_REF_T: 'Reference temperature',
  GEN_KV: 'Generator voltage',
  GEN_A: 'Generator current',
  GEN_MVAR: 'Reactive power',
  GEN_PF: 'Power factor',
  GEN_HZ: 'Generator frequency',
  GEN_MWH: 'Generated energy',
  FUEL_GAS_T: 'Fuel gas temperature',
  FUEL_GAS_P: 'Fuel supply pressure',
  FUEL_FLOW: 'Fuel flow',
  P1_PRESS: 'Fuel P1',
  P2_PRESS: 'Fuel P2',
  SRV_POS: 'Stop / ratio valve',
  ALLOW_SPREAD: 'Allowable spread',
  SPREAD_1: 'Spread · max − min',
  SPREAD_2: 'Spread · max − 2nd min',
  SPREAD_3: 'Spread · max − 3rd min',
  EXH_SPREAD_3: 'Spread · max − 3rd min',
  MW_REF: 'Power reference',
  MW_FDBK: 'Power feedback',
  LOAD_SET: 'Load setpoint',
  LO_HDR_P: 'Lube oil header pressure',
  LO_HDR_P2: 'Lube header · channel 2',
  HYD_OIL_P: 'Hydraulic pressure',
  EXC_V: 'Field voltage',
  EXC_A: 'Field current',
  LUBE_HDR_T: 'Lube header temperature',
  WHEEL_MAX_T: 'Wheel-space max temperature',
  CPR_IN_T: 'Compressor inlet temperature',
  CPR_OUT_P: 'Compressor discharge pressure',
  CPR_OUT_T: 'Compressor discharge temperature',
  INLET_AIR_T: 'Inlet air temperature',
  FFD_MIN: 'Minimum fuel',
  FFD_SU: 'Start-up limit',
  FFD_SD: 'Shutdown limit',
  FFD_ACC: 'Acceleration limit',
  FFD_SPD: 'Speed governor',
  FFD_LLM: 'Load limiter',
  FFD_TEMP: 'Temperature limit',
  OS_MAX_SPEED: 'Maximum test speed',
  OS_MAX_VIB: 'Maximum test vibration',
  OS_EXH_T: 'Exhaust mean',
  OS_TURB_SPEED: 'Turbine speed',
  OS_SPEED_REF: 'Speed reference',
  F1_GCV: 'Pilot valve F1',
  F2_1_GCV: 'Fuel stage F2-1',
  F2_2_GCV: 'Fuel stage F2-2',
  F2_3_GCV: 'Fuel stage F2-3',
  F2_4_GCV: 'Fuel stage F2-4',
};
var MOTOR_NAMES = {
  eop: 'Emergency lube oil pump',
  mop1: 'Main lube pump №1',
  mop2: 'Main lube pump №2',
  mist1: 'Oil mist extractor №1',
  mist2: 'Oil mist extractor №2',
  hop1: 'Hydraulic pump №1',
  hop2: 'Hydraulic pump №2',
  jop: 'Generator jacking oil pump',
  tgm: 'Turning gear motor',
  ven1: 'Turbine ventilation №1',
  ven2: 'Turbine ventilation №2',
  bc1: 'Bearing cooling fan №1',
  bc2: 'Bearing cooling fan №2',
  evac1: 'Inlet filter evacuation',
  gfc1: 'Generator cooling №1',
  gfc2: 'Generator cooling №2',
  gfc3: 'Generator cooling №3',
  crank: 'Cranking motor',
};
var nativeAudio = null,
  soundOn = true,
  lastTone = 0;
function $(id) {
  return document.getElementById(id);
}
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, function (c) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c];
  });
}
function unit(k, u) {
  return (
    { degC: '°C', degA: '°', um: 'µm', 'min-1': 'rpm', hrs: 'h', CNT: 'count' }[
      u ?? H25_TAGS[k]?.unit
    ] ||
    (u ?? H25_TAGS[k]?.unit ?? '')
  );
}
function isModeled(k) {
  return (
    /^(TC\d|CT\d|VIB_|OS_|GEN_|FFD_|SPREAD_|EXH_|ACT_P|REACT_P|FLD_|F[12]_)/.test(
      k,
    ) ||
    [
      'SPEED',
      'SPEED_PCT',
      'SPEED_REF',
      'FOFFD',
      'IGV_POS',
      'IBH_POS',
      'LOAD_SET',
      'MW_REF',
      'MW_FDBK',
      'FUEL_FLOW',
      'FUEL_GAS_P',
      'P1_PRESS',
      'P2_PRESS',
      'SRV_POS',
      'LO_HDR_P',
      'LO_HDR_P2',
      'MOP_DISCH',
      'HYD_OIL_P',
      'CPR_OUT_P',
      'CPR_OUT_T',
      'TB_SPEED',
      'CS019',
      'GAS_FLOW',
      'TX_MED',
      'MAX_VIB',
      'ALLOW_SPREAD',
      'IGV_REF',
      'MBA_CT02',
      'BA10_T2B',
      'RST_DATE',
      'RST_TIME',
    ].includes(k) ||
    /^(EOH_|AOH_|GAS_|FS_N|ET_NT|TOT_)/.test(k)
  );
}
function label(k) {
  return H25_NAMES[k] || k.replace(/_/g, ' ');
}
function tag(k) {
  return '<span data-tag="' + esc(k) + '">—</span>';
}
function output(k, u) {
  return (
    '<output>' +
    tag(k) +
    '<span class="unit">' +
    esc(unit(k, u)) +
    '</span></output>'
  );
}
function panel(title, body, extra) {
  return (
    '<section class="panel ' +
    (extra || '') +
    '"><h2>' +
    title +
    '</h2>' +
    body +
    '</section>'
  );
}
function reading(k, u) {
  return (
    '<div class="reading"><label>' +
    esc(label(k)) +
    '<small class="tag-code">' +
    esc(k) +
    (isModeled(k) ? '' : ' <span class="nominal">REF</span>') +
    '</small></label>' +
    output(k, u) +
    '</div>'
  );
}
function readings(values) {
  var seen = {};
  return (
    '<div class="readings">' +
    values
      .filter(function (v) {
        if (seen[v[0]]) return false;
        seen[v[0]] = 1;
        return true;
      })
      .map(function (v) {
        return reading(v[0], v[6]);
      })
      .join('') +
    '</div>'
  );
}
function sensor(k, u) {
  return (
    '<div class="sensor"><label>' +
    esc(label(k)) +
    (isModeled(k) ? '' : ' <span class="nominal">REF</span>') +
    '</label>' +
    output(k, u) +
    '<div class="bar-track"><div class="bar-fill" data-bar="' +
    k +
    '"></div></div></div>'
  );
}
function badge(text, good) {
  return (
    '<span class="badge ' +
    (good ? 'good' : 'bad') +
    '"><span class="dot"></span>' +
    esc(text) +
    '</span>'
  );
}
function stopJogs() {
  H25.raiseLower = H25.vRaiseLower = H25.iRaiseLower = 0;
}
function message(text) {
  $('command-message').textContent = text;
}
function invoke(act, g, v) {
  switch (act) {
    case 'press':
      H25.press(g, v);
      break;
    case 'release':
      H25.release52G();
      break;
    case 'ibhrelease':
      H25.releaseIBH();
      break;
    case 'close41':
      H25.close41();
      break;
    case 'open41':
      H25.open41();
      break;
    case 'countreset':
      if (confirm('Reset elapsed counters? Lifetime counters are retained.'))
        H25.counterReset();
      break;
    case 'os-enable':
      H25.osEnable();
      break;
    case 'os-disable':
      H25.osDisable();
      break;
    case 'os-start-main':
      H25.osStartMain();
      break;
    case 'os-start-backup':
      H25.osStartBackup();
      break;
    case 'os-abort-main':
      H25.osAbortMain();
      break;
    case 'os-abort-backup':
      H25.osAbortBackup();
      break;
    case 'lift':
      H25.liftCal(v);
      break;
  }
  H25.derive();
  H25.push();
  refreshCustom();
  var event = H25.events[0];
  if (event) message(event.message);
}
function actionButton(b) {
  return (
    '<button type="button" data-act="' +
    esc(b.act) +
    '"' +
    (b.g ? ' data-grp="' + esc(b.g) + '" data-val="' + esc(b.v) + '"' : '') +
    '>' +
    esc(b.label) +
    '</button>'
  );
}
function controlPanel(def) {
  var groups = {},
    names = {
      location: 'CONTROL LOCATION',
      cooldown: 'COOLDOWN',
      masterMode: 'MASTER MODE',
      master: 'MASTER COMMAND',
      speedMode: 'SPEED / LOAD',
      loadMode: 'LOAD CONTROL',
      governor: 'GOVERNOR',
      s43L: '43-25L',
      s43G: '43-25G',
      s43OPE: 'CONTROL SOURCE',
      avrMode: 'EXCITATION MODE',
      fieldMode: 'FIELD MODE',
      fieldClose: 'FIELD BREAKER 41',
      pss: 'PSS',
      osTest: 'OVERSPEED TEST',
      lift: 'LIFT SELECTION',
    };
  (def.buttons || []).forEach(function (b) {
    if (
      [
        'location',
        'cooldown',
        'speedMode',
        'pss',
        's43L',
        's43G',
        's43OPE',
        'fieldMode',
        'avrMode',
      ].includes(b.g)
    )
      return;
    if (
      ['trip', 'reset', 'goto', 'edit-load', 'ffd'].includes(b.act) ||
      b.g === 'gtStatus' ||
      b.g === 'ffdStatus'
    )
      return;
    var g =
      b.g ||
      {
        vraise: 'VOLTAGE CONTROL',
        vlower: 'VOLTAGE CONTROL',
        iraise: 'REACTIVE CONTROL',
        ilower: 'REACTIVE CONTROL',
        raise: 'LOAD ADJUST',
        lower: 'LOAD ADJUST',
        close41: 'FIELD BREAKER 41',
        open41: 'FIELD BREAKER 41',
        release: 'SYNCHRONIZE',
        ibhrelease: 'IBH LOCKOUT',
        countreset: 'COUNTERS',
      }[b.act] ||
      'ACTIONS';
    if (g === 'lift') return;
    (groups[g] || (groups[g] = [])).push(b);
  });
  var html = Object.keys(groups)
    .map(function (g) {
      return (
        '<div class="control-group"><label>' +
        esc(names[g] || g) +
        '</label><div class="buttons">' +
        groups[g].map(actionButton).join('') +
        '</div></div>'
      );
    })
    .join('');
  if (['startup', 'ffd', 'sync'].includes(def.id))
    html +=
      '<div class="control-group wide"><label>LOAD SETPOINT · 0–32 MW</label><form id="load-form" class="load-row"><input aria-label="Load setpoint MW" id="load-input" type="number" min="0" max="32" step="0.1" value="' +
      H25.tags.LOAD_SET +
      '"><span>MW</span><button type="submit">APPLY</button></form></div>';
  return html
    ? panel(
        'OPERATOR CONTROLS',
        '<div class="controls">' + html + '</div>',
        'start-controls',
      )
    : '';
}
function turbineSVG(id) {
  var common =
    '<path class="pipe air flow" d="M35 155H200M350 155H430M560 155H700"/><path class="pipe steam flow" d="M700 155H865"/><path class="pipe flow" d="M500 40V100"/><text x="440" y="28">FUEL GAS</text><path class="equip" d="M180 110L350 130V180L180 200Z"/><path class="equip" d="M560 125L710 100V210L560 185Z"/><rect class="equip" x="430" y="100" width="130" height="110" rx="8"/><circle class="equip" cx="100" cy="155" r="52"/><text x="72" y="160">GEN</text><path stroke="#445e75" stroke-width="6" d="M152 155H180"/><text x="208" y="232">COMPRESSOR</text><text x="451" y="232">COMBUSTOR</text><text x="600" y="232">TURBINE</text><text x="785" y="185">TO KU-20</text><circle class="state" data-svg-state="flame" cx="495" cy="155" r="24"/><text x="474" y="160" style="fill:white">FIRE</text><text class="label" x="55" y="82">52G / 41</text><text class="label" x="246" y="86">IGV</text><path stroke="#506f88" stroke-width="3" d="M225 111L237 132M245 114L257 135M265 118L277 139"/>';
  if (id === 'sync' || id === 'gen')
    common =
      '<path class="pipe air" d="M80 155H250M350 155H485M575 155H800"/><circle class="equip" cx="130" cy="155" r="55"/><text x="100" y="160">GEN</text><rect class="equip" x="250" y="125" width="100" height="60"/><text x="280" y="160">52G</text><rect class="equip" x="485" y="125" width="90" height="60"/><text x="510" y="160">52L</text><path class="equip" d="M785 100H845V210H785Z"/><text x="760" y="240">50 Hz GRID</text><path class="pipe" d="M130 100V55H360V110"/><rect class="equip" x="220" y="35" width="80" height="40"/><text x="246" y="61">41</text><text x="325" y="45">EXCITER</text><circle class="state" data-svg-state="breaker" cx="300" cy="109" r="8"/>';
  if (['lube', 'brg', 'vent', 'ibh'].includes(id))
    common =
      '<path class="pipe air flow" d="M60 230V80H850V230H60"/><rect class="equip" x="70" y="190" width="160" height="65" rx="5"/><text x="95" y="227">' +
      {
        lube: 'LUBE OIL TANK',
        brg: 'BEARING RETURN',
        vent: 'AIR FILTER',
        ibh: 'BLEED MANIFOLD',
      }[id] +
      '</text>' +
      [350, 520, 690]
        .map(function (x, i) {
          return (
            '<path class="pipe flow" d="M' +
            x +
            ' 80V230"/><circle class="equip" cx="' +
            x +
            '" cy="155" r="35"/><path d="M' +
            (x - 12) +
            ' 138L' +
            (x + 16) +
            ' 155L' +
            (x - 12) +
            ' 172Z" fill="#347aa5"/><text x="' +
            (x - 33) +
            '" y="45">BRANCH ' +
            (i + 1) +
            '</text>'
          );
        })
        .join('');
  if (id === 'fuelgas')
    common =
      '<path class="pipe flow" d="M45 155H870"/>' +
      [160, 370, 620]
        .map(function (x, i) {
          return (
            '<path class="equip" d="M' +
            (x - 20) +
            ' 135L' +
            (x + 20) +
            ' 175V135L' +
            (x - 20) +
            ' 175Z"/><text x="' +
            (x - 37) +
            '" y="110">' +
            ['SUPPLY', 'SRV', 'GCV'][i] +
            '</text>'
          );
        })
        .join('') +
      '<rect class="equip" x="730" y="115" width="110" height="80" rx="8"/><text x="747" y="160">BURNERS</text>';
  return (
    '<svg class="schematic" viewBox="0 0 900 280" role="img" aria-label="' +
    esc(label(id)) +
    ' process schematic" data-off="' +
    !H25.flameOn() +
    '">' +
    common +
    '</svg>'
  );
}
function polarSVG() {
  var s =
    '<svg class="polar" viewBox="0 0 440 440" role="img" aria-label="18 exhaust thermocouples, 0 to 800 degrees Celsius">';
  [50, 100, 150, 200].forEach(function (r) {
    s +=
      '<circle class="grid" cx="220" cy="220" r="' +
      r +
      '"/><text x="224" y="' +
      (220 - r + 13) +
      '">' +
      r * 4 +
      ' °C</text>';
  });
  for (var i = 1; i <= 18; i++) {
    var a = ((-90 + (i - 1) * 20) * Math.PI) / 180,
      x = 220 + 200 * Math.cos(a),
      y = 220 + 200 * Math.sin(a);
    s += '<path class="grid" d="M220 220L' + x + ' ' + y + '"/>';
    var tx = 220 + 211 * Math.cos(a),
      ty = 220 + 211 * Math.sin(a);
    s +=
      '<text text-anchor="middle" dominant-baseline="middle" x="' +
      tx +
      '" y="' +
      ty +
      '">' +
      String(i).padStart(2, '0') +
      '</text>';
  }
  return s + '<polygon id="tc-polygon" points=""/></svg>';
}
function renderMotorCards(ids) {
  return (
    '<div class="motor-grid">' +
    ids
      .map(function (id) {
        return (
          '<article class="motor-card" data-motor-card="' +
          id +
          '"><h3>' +
          esc(MOTOR_NAMES[id] || id) +
          '</h3><span class="motor-id">' +
          id.toUpperCase() +
          '</span><div class="status-strip"><span data-motor-status="' +
          id +
          '"></span></div><div class="buttons">' +
          ['AUTO', 'MANUAL', 'START', 'STOP']
            .map(function (a) {
              return (
                '<button data-motor="' +
                id +
                '" data-command="' +
                a +
                '">' +
                a +
                '</button>'
              );
            })
            .join('') +
          '</div></article>'
        );
      })
      .join('') +
    '</div>'
  );
}
function reportTables(def) {
  return (
    '<div class="report-grid">' +
    def.drtables
      .map(function (t, i) {
        return (
          '<section class="panel"><table class="report-table"><thead><tr><th>MEASUREMENT · ' +
          (i + 1) +
          '</th><th>LIVE VALUE</th></tr></thead><tbody>' +
          t.rows
            .map(function (r) {
              return (
                '<tr><td>' +
                esc(r[0]) +
                '<small>' +
                esc(r[1]) +
                (isModeled(r[1]) ? '' : ' <span class="nominal">REF</span>') +
                '</small></td><td>' +
                output(r[1], r[2]) +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table></section>'
        );
      })
      .join('') +
    '</div>'
  );
}
function renderScreen(def) {
  var values = def.values || [],
    html = '';
  if (def.id === 'menu')
    html =
      '<div class="menu-grid">' +
      Object.keys(H25_SCREENS)
        .filter(function (k) {
          return k !== 'menu';
        })
        .map(function (k, i) {
          return (
            '<button data-screen="' +
            k +
            '"><span>UNIT-20 / ' +
            String(i + 1).padStart(2, '0') +
            '</span>' +
            esc(H25_SCREENS[k].nav) +
            '</button>'
          );
        })
        .join('') +
      '</div>';
  else if (def.drtables) html = reportTables(def);
  else if (def.id === 'motors')
    html = renderMotorCards(Object.keys(H25.motors));
  else if (def.scrows || def.tripitems) {
    var rows = def.scrows || def.tripitems;
    html = panel(
      def.scrows ? 'START PERMISSIVES' : 'LATCHED PROTECTIONS',
      '<div class="info-line">' +
        (def.scrows
          ? 'Only modeled permissives inhibit START. Other reference checks are explicitly marked ASSUMED.'
          : 'First-out cause is latched once per trip event. Green = no latched trip, not proof of OEM protection coverage.') +
        '</div><div class="panel-body checks">' +
        rows
          .map(function (r) {
            return (
              '<div class="check" ' +
              (def.scrows ? 'data-check' : 'data-trip') +
              '="' +
              r.id +
              '"><div>' +
              esc(r.l1) +
              '<small class="code">' +
              esc(r.l2) +
              '</small></div><span class="badge">—</span></div>'
            );
          })
          .join('') +
        '</div>',
    );
  } else if (def.id === 'exh')
    html =
      '<div class="content-grid"><div class="stack">' +
      panel('EXHAUST THERMOCOUPLE RADAR · 0–800 °C', polarSVG()) +
      panel(
        '18 CHANNELS',
        '<div class="sensor-grid">' +
          values
            .filter(function (v) {
              return /^TC/.test(v[0]);
            })
            .map(function (v) {
              return sensor(v[0], v[6]);
            })
            .join('') +
          '</div>',
      ) +
      '</div><div class="stack">' +
      panel(
        'TURBINE & COMBUSTION DATA',
        readings(
          values.filter(function (v) {
            return !/^TC/.test(v[0]);
          }),
        ),
      ) +
      panel(
        'CALCULATION BASIS',
        '<div class="panel-body">Exhaust = arithmetic mean of 18 live thermocouples. Spread uses sorted channels; no display calibration offsets.<p>Thermal time constants and limits are educational assumptions, not OEM settings.</p></div>',
      ) +
      '</div></div>';
  else if (def.id === 'os')
    html =
      '<div class="content-grid"><div class="stack">' +
      panel(
        'OVERSPEED TRIP TEST',
        '<div class="status-strip">' +
          actionButton({
            label: 'ENABLE',
            act: 'os-enable',
            g: 'osTest',
            v: 'ENABLE',
          }) +
          actionButton({
            label: 'DISABLE',
            act: 'os-disable',
            g: 'osTest',
            v: 'DISABLE',
          }) +
          '</div><div class="big-speed">' +
          output('SPEED') +
          '</div><div class="progress"><span id="speed-bar"></span></div><div class="test-controls">' +
          ['main', 'backup']
            .map(function (kind, i) {
              return (
                '<div><h3>' +
                kind.toUpperCase() +
                ' TRIP TEST</h3><p>Training setpoint: ' +
                (i ? 8079 : 8006) +
                ' rpm</p><div class="buttons">' +
                actionButton({ label: 'START', act: 'os-start-' + kind }) +
                actionButton({ label: 'ABORT', act: 'os-abort-' + kind }) +
                '</div></div>'
              );
            })
            .join('') +
          '</div>',
      ) +
      panel(
        'LIFT CALIBRATION',
        '<div class="panel-body">Actuator calibration is not modeled. Selection-only controls from the prototype have been removed rather than presented as working equipment.</div>',
      ) +
      '</div><div class="stack">' +
      panel(
        'TEST MEASUREMENTS',
        readings(
          values.filter(function (v) {
            return /^OS_|^EXH_T$|^GEN_POWER$/.test(v[0]);
          }),
        ),
      ) +
      '</div></div>';
  else {
    var sensors = values.filter(function (v) {
      return (
        /^(VIB_|RG|THR|W[123]_)/.test(v[0]) ||
        (['brg', 'ws'].includes(def.id) && v[2] > 300)
      );
    });
    var focus = values.filter(function (v) {
      return !sensors.includes(v);
    });
    html =
      '<div class="content-grid"><div class="stack">' +
      panel(
        'PROCESS MIMIC · NATIVE SVG',
        turbineSVG(def.id) +
          '<div class="status-strip" id="process-status"></div>',
      );
    if (def.id === 'startup') html += controlPanel(def);
    if (def.bars)
      html += panel(
        'FUEL DEMAND & LIMITERS',
        '<div class="sensor-grid">' +
          def.bars
            .map(function (b) {
              return sensor(b.tag, 'FFD');
            })
            .join('') +
          '</div>',
      );
    if (sensors.length && def.id !== 'startup')
      html += panel(
        'LIVE CHANNELS',
        '<div class="sensor-grid">' +
          sensors
            .map(function (v) {
              return sensor(v[0], v[6]);
            })
            .join('') +
          '</div>',
      );
    if (def.id !== 'startup') html += controlPanel(def);
    var equipment = [
      ...new Set(
        (def.motors || [])
          .concat(def.pumps || [])
          .map(function (m) {
            return m.id;
          })
          .filter(function (id) {
            return id in H25.motors;
          }),
      ),
    ];
    if (equipment.length)
      html += panel(
        'AUXILIARY EQUIPMENT',
        '<div class="panel-body">' + renderMotorCards(equipment) + '</div>',
      );
    if (def.id === 'sync')
      html += panel(
        'SYNCHRONISM CHECK',
        '<div class="readings">' +
          reading('GEN_HZ') +
          reading('GEN_KV') +
          '</div><div class="status-strip" id="sync-status"></div><div class="info-line">Grid: 50 Hz / 10.92 kV. Limits: Δf ≤ 0.1 Hz, ΔV ≤ 5%, Δφ ≤ 10°. Simplified training check; phase is a scenario input, not a network transient calculation.</div>',
      );
    if (def.id === 'startup')
      html += panel(
        'START SEQUENCE',
        '<div class="status-strip" id="start-status"></div><div class="info-line">Cold start: choose INSTRUCTOR → COLD / STOPPED, then AUTO → START. Sequence timing is accelerated for training.</div>',
      );
    html +=
      '</div><div class="stack">' +
      panel(
        'LIVE PROCESS VALUES',
        readings(
          def.id === 'startup'
            ? focus.filter(function (v) {
                return [
                  'FUEL_GAS_P',
                  'FUEL_GAS_T',
                  'LO_HDR_P',
                  'GEN_KV',
                  'GEN_A',
                  'GEN_HZ',
                  'GEN_MVAR',
                  'GEN_PF',
                  'EXH_T',
                  'SPEED',
                  'IGV_POS',
                  'FOFFD',
                  'CPR_OUT_P',
                  'CPR_OUT_T',
                  'MW_FDBK',
                  'LOAD_SET',
                ].includes(v[0]);
              })
            : focus,
        ),
      ) +
      (def.id === 'startup'
        ? '<details class="panel"><summary>ALL CHANNELS / REFERENCE VALUES</summary>' +
          readings(focus) +
          '<div class="sensor-grid">' +
          sensors
            .map(function (v) {
              return sensor(v[0], v[6]);
            })
            .join('') +
          '</div></details>'
        : '') +
      '</div></div>';
  }
  if (['sc', 'tim'].includes(def.id)) html += controlPanel(def);
  html +=
    '<div class="info-line">REF = nominal reference channel, not a simulated sensor. Only implemented commands are enabled.</div>';
  $('page').innerHTML = html;
  wireControls();
  refreshCustom();
}
function loadScreen(id) {
  if (!H25_SCREENS[id]) return;
  stopJogs();
  H25_current = id;
  var def = H25_SCREENS[id];
  $('screen-title').textContent = def.nav;
  $('screen-number').textContent =
    'H25 / ' +
    String(Object.keys(H25_SCREENS).indexOf(id) + 1).padStart(2, '0');
  document.title = def.nav + ' — UNIT-20';
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.screen === id);
    if (b.dataset.screen === id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $('screen-select').value = id;
  renderScreen(def);
  $('page').scrollTop = 0;
  history.replaceState(null, '', '#' + id);
}
function wireControls() {
  document.querySelectorAll('#page [data-screen]').forEach(function (b) {
    b.onclick = function () {
      loadScreen(b.dataset.screen);
    };
  });
  document.querySelectorAll('#page [data-act]').forEach(function (b) {
    var act = b.dataset.act,
      jog = {
        raise: ['raiseLower', 1],
        lower: ['raiseLower', -1],
        vraise: ['vRaiseLower', 1],
        vlower: ['vRaiseLower', -1],
        iraise: ['iRaiseLower', 1],
        ilower: ['iRaiseLower', -1],
      }[act];
    if (
      b.dataset.grp === 'masterMode' &&
      ['CRANK', 'FIRE'].includes(b.dataset.val)
    ) {
      b.disabled = true;
      b.title =
        'Manual CRANK/FIRE sequence not modeled; use AUTO training sequence';
      return;
    }
    if (
      [
        'pss',
        's43L',
        's43G',
        's43OPE',
        'fieldMode',
        'avrMode',
        'location',
        'cooldown',
        'speedMode',
      ].includes(b.dataset.grp)
    ) {
      b.disabled = true;
      b.title = 'Reference selector: detailed control logic is not modeled';
    }
    if (jog) {
      b.onpointerdown = function (e) {
        if (b.disabled) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        H25[jog[0]] = jog[1];
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = stopJogs;
      b.onkeydown = function (e) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          H25[jog[0]] = jog[1];
        }
      };
      b.onkeyup = stopJogs;
    } else
      b.onclick = function () {
        invoke(act, b.dataset.grp, b.dataset.val);
      };
  });
  document.querySelectorAll('[data-motor][data-command]').forEach(function (b) {
    b.onclick = function () {
      var id = b.dataset.motor,
        cmd = b.dataset.command;
      if (cmd === 'AUTO' || cmd === 'MANUAL')
        H25.setMotorMode(id, cmd === 'AUTO');
      else if (cmd === 'START') H25.motorStart(id);
      else H25.motorStop(id);
      refreshCustom();
    };
  });
  if ($('load-form'))
    $('load-form').onsubmit = function (e) {
      e.preventDefault();
      var value = $('load-input').valueAsNumber;
      if (Number.isFinite(value) && value >= 0 && value <= 32) {
        H25.tags.LOAD_SET = value;
        H25.log('SETPOINT', 'Load ' + value + ' MW');
        message('Load setpoint accepted');
      } else message('Enter a value from 0 to 32 MW');
    };
}
function refreshButtons() {
  document.querySelectorAll('[data-grp]').forEach(function (b) {
    var g = b.dataset.grp,
      v = b.dataset.val,
      val =
        g === 'fieldClose' ? (H25.ctl.field41 ? 'CLOSED' : 'OPEN') : H25.ctl[g];
    b.setAttribute('aria-pressed', String(val === v));
  });
  document.querySelectorAll('[data-act]').forEach(function (b) {
    var a = b.dataset.act;
    if (
      a === 'press' &&
      b.dataset.grp === 'master' &&
      b.dataset.val === 'START'
    ) {
      b.disabled = !H25.startCheckOk();
      b.title = b.disabled
        ? H25.startReasons().join('; ')
        : 'Start training sequence';
    } else if (a === 'release') {
      b.disabled = !H25.syncReady() || H25.ctl.brk52G;
      b.title = 'Requires field, rated speed and sync-check';
    } else if (a.startsWith('os-start'))
      b.disabled = !H25.running() || H25.ctl.osTest !== 'ENABLE';
    else if (['raise', 'lower'].includes(a)) b.disabled = !H25.running();
    else if (['vraise', 'vlower', 'iraise', 'ilower'].includes(a))
      b.disabled = !H25.ctl.field41 || H25.tripped;
  });
}
function refreshMcells() {
  refreshCustom();
}
function refreshCustom() {
  H25.push();
  refreshButtons();
  var T = H25.tags;
  $('gt-state').textContent = H25.seq;
  $('sim-clock').textContent = H25._simT.toFixed(1) + ' s';
  $('breaker-state').textContent =
    '52G ' +
    (H25.ctl.brk52G ? 'CLOSED' : 'OPEN') +
    ' · 41 ' +
    (H25.ctl.field41 ? 'CLOSED' : 'OPEN');
  $('trip-banner').hidden = !H25.tripped;
  $('trip-cause').textContent = H25.tripCause;
  $('trainer-trip').textContent = H25.tripped
    ? H25.tripCause
    : 'No latched trip';
  $('reset-button').disabled =
    Object.values(H25.faults).some(Boolean) || T.SPEED > 500;
  $('pause-button').textContent = H25.paused ? 'RESUME' : 'PAUSE';
  $('pause-button').setAttribute('aria-pressed', String(H25.paused));
  document.querySelectorAll('[data-fault]').forEach(function (b) {
    b.setAttribute('aria-pressed', String(H25.faults[b.dataset.fault]));
  });
  document.querySelectorAll('[data-motor-card]').forEach(function (card) {
    var id = card.dataset.motorCard,
      m = H25.motors[id];
    card.querySelector('[data-motor-status]').innerHTML =
      badge(m.run ? 'RUNNING' : 'STOPPED', !m.run) +
      (m.standby ? '<span class="badge">STANDBY</span>' : '');
    card.querySelectorAll('button').forEach(function (b) {
      b.setAttribute(
        'aria-pressed',
        String(b.dataset.command === (m.auto ? 'AUTO' : 'MANUAL')),
      );
      if (b.dataset.command === 'START') b.disabled = m.run;
      if (b.dataset.command === 'STOP') b.disabled = !m.run;
    });
  });
  document.querySelectorAll('[data-bar]').forEach(function (e) {
    var k = e.dataset.bar,
      d = H25_TAGS[k],
      max = d?.max || 127,
      val = T[k] || 0;
    e.style.width = Math.max(0, Math.min(100, (val / max) * 100)) + '%';
    e.classList.toggle('high', /VIB/.test(k) && val >= 155);
  });
  var modeled = [
    'zero',
    'brk',
    'sc3_4t',
    'sc1_off',
    'sc4_qm',
    'sc4_tb',
    'sc1_hd',
    'sc2_fgn',
    'sc3_vd',
  ];
  document.querySelectorAll('[data-check]').forEach(function (el) {
    var id = el.dataset.check,
      known = modeled.includes(id),
      ok = H25.scColor(id) === 'rgb(0,200,0)';
    el.className = 'check ' + (known ? (ok ? 'good' : 'bad') : '');
    var b = el.querySelector('.badge');
    b.textContent = known ? (ok ? 'OK' : 'INHIBIT') : 'ASSUMED';
    b.className = 'badge ' + (known ? (ok ? 'good' : 'bad') : 'unknown');
  });
  document.querySelectorAll('[data-trip]').forEach(function (el) {
    var on = H25.tripItems[el.dataset.trip];
    el.className = 'check ' + (on ? 'bad' : 'good');
    el.querySelector('.badge').textContent = on ? 'TRIP' : 'CLEAR';
  });
  if ($('tc-polygon')) {
    var pts = [];
    for (var i = 1; i <= 18; i++) {
      var a = ((-90 + (i - 1) * 20) * Math.PI) / 180,
        r = Math.max(0, Math.min(800, T[H25.tcTag(i)])) / 4;
      pts.push(220 + r * Math.cos(a) + ',' + (220 + r * Math.sin(a)));
    }
    $('tc-polygon').setAttribute('points', pts.join(' '));
  }
  if ($('speed-bar'))
    $('speed-bar').style.width =
      Math.min(100, Math.max(0, ((T.SPEED - 7000) / 1400) * 100)) + '%';
  document.querySelectorAll('.schematic').forEach(function (s) {
    s.dataset.off = String(!H25.flameOn());
  });
  document.querySelectorAll('[data-svg-state]').forEach(function (e) {
    e.classList.toggle(
      'running',
      e.dataset.svgState === 'flame' ? H25.flameOn() : H25.ctl.brk52G,
    );
  });
  if ($('process-status'))
    $('process-status').innerHTML =
      badge(H25.flameOn() ? 'FLAME ON' : 'FLAME OFF', !H25.flameOn()) +
      badge('52G ' + (H25.ctl.brk52G ? 'CLOSED' : 'OPEN'), !H25.ctl.brk52G) +
      badge('41 ' + (H25.ctl.field41 ? 'CLOSED' : 'OPEN'), !H25.ctl.field41) +
      '<span class="badge">RUN = RED / STOP = GREEN</span>';
  if ($('sync-status'))
    $('sync-status').innerHTML =
      badge(H25.syncReady() ? 'SYNC READY' : 'SYNC INHIBIT', H25.syncReady()) +
      '<span class="badge">Δf ' +
      (T.GEN_HZ - 50 + H25.sync.df).toFixed(2) +
      ' Hz</span><span class="badge">ΔV ' +
      ((T.GEN_KV / 10.92 - 1) * 100 + H25.sync.dvPct).toFixed(2) +
      '%</span><span class="badge">Δφ ' +
      H25.sync.dphi.toFixed(1) +
      '°</span>';
  if (H25_current === 'ibh' && $('process-status'))
    $('process-status').innerHTML += badge(
      H25.ctl.ibhLock ? 'IBH LOCKOUT' : 'IBH RELEASED',
      !H25.ctl.ibhLock,
    );
  if ($('start-status'))
    $('start-status').textContent = H25.startCheckOk()
      ? 'READY TO START'
      : H25.startReasons().join(' · ');
  if ($('events-dialog').open) renderEvents();
  var link = window.UNIT20_LINK;
  $('link-quality').textContent = link ? link.status() : 'KU LINK OFF';
  alarmTick();
}
function renderEvents() {
  $('events-body').innerHTML = H25.events
    .map(function (e) {
      return (
        '<div class="event ' +
        esc(e.type) +
        '"><time>' +
        e.t.toFixed(1) +
        ' s</time><strong>' +
        esc(e.type) +
        '</strong><span>' +
        esc(e.message) +
        '</span></div>'
      );
    })
    .join('');
}
function toggleFullscreen() {
  if (document.fullscreenElement)
    document.exitFullscreen().catch(function (e) {
      message(e.message);
    });
  else if (document.documentElement.requestFullscreen)
    document.documentElement.requestFullscreen().catch(function (e) {
      message(e.message);
    });
}
function unlockAudio() {
  if (!nativeAudio) {
    try {
      nativeAudio = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      message('Audio unavailable');
    }
  }
  if (nativeAudio?.state === 'suspended')
    nativeAudio.resume().catch(function () {});
}
function alarmTick() {
  if (!soundOn || !nativeAudio || nativeAudio.state !== 'running') return;
  var warn =
      H25.tripped || H25.spreadAlarm || Object.values(H25.faults).some(Boolean),
    now = performance.now();
  if (!warn || now - lastTone < (H25.tripped ? 500 : 1400)) return;
  lastTone = now;
  var o = nativeAudio.createOscillator(),
    g = nativeAudio.createGain();
  o.frequency.value = H25.tripped ? 880 : 660;
  g.gain.setValueAtTime(0.06, nativeAudio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, nativeAudio.currentTime + 0.2);
  o.connect(g);
  g.connect(nativeAudio.destination);
  o.start();
  o.stop(nativeAudio.currentTime + 0.22);
}
function runSelfTest() {
  var results = [];
  function ok(n, c) {
    results.push((c ? 'PASS' : 'FAIL') + ':' + n);
  }
  ok('native-no-raster', document.querySelectorAll('img').length === 0);
  ok('screens-20', Object.keys(H25_SCREENS).length === 20);
  ok(
    'all-tags-finite',
    Object.values(H25.tags).every(function (v) {
      return typeof v === 'string' || Number.isFinite(v);
    }),
  );
  ok(
    'no-document-overflow',
    document.documentElement.scrollWidth <= innerWidth &&
      document.documentElement.scrollHeight <= innerHeight,
  );
  var el = document.createElement('div');
  el.id = 'selftest-result';
  el.hidden = true;
  el.textContent = results.join(' | ');
  document.body.appendChild(el);
}
window.addEventListener('DOMContentLoaded', function () {
  [
    SCR_STARTUP,
    SCR_FFD,
    SCR_SYNC,
    SCR_FUELGAS,
    SCR_LUBE,
    SCR_GEN,
    SCR_VENT,
    SCR_IBH,
    SCR_MOTORS,
    SCR_BRG,
    SCR_EXH,
    SCR_VIB,
    SCR_WS,
    SCR_SC,
    SCR_TIM,
    SCR_TRIPM,
    SCR_DR1,
    SCR_DR2,
    SCR_OS,
    SCR_MENU,
  ].forEach(function (s) {
    H25_SCREENS[s.id] = s;
  });
  H25.init(
    new URLSearchParams(location.search).get('cold') === '1' ? 'cold' : 'demo',
  );
  var nav = Object.keys(H25_SCREENS)
    .map(function (id, i) {
      return (
        '<button class="nav-btn" data-screen="' +
        id +
        '"><span class="index">' +
        String(i + 1).padStart(2, '0') +
        '</span>' +
        esc(H25_SCREENS[id].nav) +
        '</button>'
      );
    })
    .join('');
  $('navigation').innerHTML = nav;
  $('screen-select').innerHTML = Object.keys(H25_SCREENS)
    .map(function (id) {
      return (
        '<option value="' + id + '">' + esc(H25_SCREENS[id].nav) + '</option>'
      );
    })
    .join('');
  $('navigation').onclick = function (e) {
    var b = e.target.closest('[data-screen]');
    if (b) loadScreen(b.dataset.screen);
  };
  $('screen-select').onchange = function () {
    loadScreen(this.value);
  };
  $('fsbtn').onclick = toggleFullscreen;
  document.addEventListener('fullscreenchange', function () {
    $('fsbtn').textContent = document.fullscreenElement
      ? 'EXIT FULLSCREEN'
      : 'FULLSCREEN';
  });
  $('sndbtn').onclick = function () {
    unlockAudio();
    soundOn = !soundOn;
    this.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
    this.setAttribute('aria-pressed', String(soundOn));
  };
  $('events-button').onclick = function () {
    renderEvents();
    $('events-dialog').showModal();
  };
  $('events-close').onclick = function () {
    $('events-dialog').close();
  };
  $('trainer-button').onclick = function () {
    $('trainer').hidden = !$('trainer').hidden;
    this.setAttribute('aria-pressed', String(!$('trainer').hidden));
  };
  $('cold-button').onclick = function () {
    if (
      confirm(
        'Load cold/stopped scenario? Current scenario and counters will be reset.',
      )
    ) {
      stopJogs();
      H25.resetScenario('cold');
      loadScreen(H25_current);
    }
  };
  $('demo-button').onclick = function () {
    if (
      confirm(
        'Load base-load demonstration? This is a scenario reset, not MASTER RESET.',
      )
    ) {
      stopJogs();
      H25.resetScenario('demo');
      loadScreen(H25_current);
    }
  };
  $('pause-button').onclick = function () {
    stopJogs();
    H25.paused = !H25.paused;
    H25.log('CLOCK', H25.paused ? 'Paused' : 'Resumed');
    refreshCustom();
  };
  $('reset-button').onclick = function () {
    H25.masterReset();
    refreshCustom();
    message(H25.events[0].message);
  };
  $('trip-button').onclick = function () {
    stopJogs();
    H25.trip('EMERGENCY TRIP PUSHBUTTON', '9EX');
    refreshCustom();
    message(H25.tripCause);
  };
  document.querySelectorAll('[data-fault]').forEach(function (b) {
    b.onclick = function () {
      H25.setFault(b.dataset.fault, !H25.faults[b.dataset.fault]);
      refreshCustom();
    };
  });
  $('clear-faults').onclick = function () {
    H25.clearFaults();
    refreshCustom();
  };
  ['pointerup', 'pointercancel', 'keyup'].forEach(function (ev) {
    document.addEventListener(ev, stopJogs);
  });
  window.addEventListener('blur', stopJogs);
  document.addEventListener('visibilitychange', stopJogs);
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input,select,textarea')) return;
    if (e.key.toLowerCase() === 'f') toggleFullscreen();
  });
  var q = new URLSearchParams(location.search);
  var kuURL = new URL($('ku-link').href);
  kuURL.searchParams.set('session', q.get('session') || 'unit20-default');
  $('ku-link').href = kuURL.href;
  $('trainer').hidden = !q.has('trainer');
  var faults = (q.get('fault') || '').split(',');
  faults.forEach(function (f) {
    if (f in H25.faults) H25.setFault(f, true);
  });
  var id = location.hash.slice(1) || q.get('screen') || 'startup';
  loadScreen(H25_SCREENS[id] ? id : 'startup');
  H25.onTick(refreshCustom);
  H25.startLoop();
  setInterval(function () {
    if (H25.paused) refreshCustom();
  }, 1000);
  if (q.has('selftest')) runSelfTest();
});
