/* Global frame glue: 1280x574 scaler (top header cut), ref background. */

var H25_SCREENS = {};
var H25_NAV_ALL = ["START-UP", "FFD CONTROL", "SYNCHRO. &EXC. OPE.", "FUEL GAS",
  "LUBE OIL", "GENERATOR", "VENTILATION", "IBH CONTROL", "MOTORS", "BEARING OIL",
  "EXHAUST", "VIBRATION", "WHEEL SPACE", "START CHECK", "TIMERS", "TRIP MONITOR",
  "DATA REPORT 1", "DATA REPORT 2", "OVERSPEED"];
var H25_NAV_ALIAS = { "WHEEL SPACE": "WHEELSPACE", "WHEELSPACE": "WHEELSPACE" };
var H25_current = "startup";
var H25_DBG = false;

function fitStage() {
  /* Uniform scale — proporsiya HECH QACHON buzilmaydi (siqilish/cho'zilish yo'q).
   * Sahna oynaga sig'adi, ortiqcha joy qora fonda qoladi. */
  var s = Math.min(window.innerWidth / 1280, window.innerHeight / 574);
  document.getElementById("stage").style.transform = "scale(" + s + ")";
}

/* Fullscreen toggle: F key or double-click anywhere on empty stage area.
 * Browser blocks silent fullscreen, so it needs this user gesture. */
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else {
      var de = document.documentElement;
      if (de.requestFullscreen) de.requestFullscreen();
      else if (de.webkitRequestFullscreen) de.webkitRequestFullscreen();
    }
  } catch (e) {}
  setTimeout(fitStage, 300);
}

/* highlight active control buttons (orange = selected, as in screenshots) */
function refreshButtons() {
  if (!window.H25 || !H25.ctl) return;
  var map = {
    location: H25.ctl.location, cooldown: H25.ctl.cooldown,
    masterMode: H25.ctl.masterMode, speedMode: H25.ctl.speedMode,
    loadMode: H25.ctl.loadMode, gtStatus: H25.ctl.gtStatus,
    ffdStatus: H25.ctl.ffdStatus, governor: H25.ctl.governor,
    avrMode: H25.ctl.avrMode, fieldMode: H25.ctl.fieldMode,
    fieldClose: H25.ctl.field41 ? "CLOSED" : "OPEN",
    pss: H25.ctl.pss, s43L: H25.ctl.s43L, s43G: H25.ctl.s43G, s43OPE: H25.ctl.s43OPE,
    osTest: H25.ctl.osTest, lift: H25.ctl.lift
  };
  var btns = document.querySelectorAll("#page [data-grp]");
  for (var i = 0; i < btns.length; i++) {
    var b = btns[i];
    b.classList.toggle("orange", map[b.getAttribute("data-grp")] === b.getAttribute("data-val"));
  }
}

/* generic overlay renderer: values + buttons from screen data tables */
function renderOverlay(page, def) {
  var h = "";
  var i, v;
  if (def.values) {
    for (i = 0; i < def.values.length; i++) {
      v = def.values[i];
      h += '<div class="ov" style="left:' + v[1] + 'px;top:' + v[2] + 'px;width:' +
        v[3] + 'px;height:' + v[4] + 'px;font-size:' + v[5] + 'px;' +
        (v[7] ? 'background:' + v[7] + ';' : '') + '">' +
        '<span data-tag="' + v[0] + '">--</span>' + (v[6] ? '<span>' + v[6] + '</span>' : '') + '</div>';
    }
  }
  if (def.buttons) {
    for (i = 0; i < def.buttons.length; i++) {
      var b = def.buttons[i];
      h += '<div class="obtn' + (b.clear ? " clear" : "") + '" style="left:' + b.x + 'px;top:' + b.y + 'px;width:' +
        b.w + 'px;height:' + b.h + 'px;font-size:' + b.fs + 'px;' +
        (b.bold ? 'font-weight:bold;' : '') + '"' +
        (b.g ? ' data-grp="' + b.g + '" data-val="' + b.v + '"' : '') +
        (b.to ? ' data-to="' + b.to + '"' : '') +
        ' data-act="' + b.act + '">' + b.label + '</div>';
    }
  }
  page.innerHTML = h;
  if (def.bars) {
    for (var j = 0; j < def.bars.length; j++) {
      var fb = document.createElement("div");
      fb.className = "fbar";
      fb.setAttribute("data-tag", def.bars[j].tag);
      fb.style.left = (def.bars[j].cx - 8) + "px";
      fb.style.width = "17px";
      page.appendChild(fb);
    }
    updateFbars();
  }
  var k, lp;
  if (def.lamps) {
    for (k = 0; k < def.lamps.length; k++) {
      lp = def.lamps[k];
      var lm = document.createElement("div");
      lm.className = "olamp";
      lm.setAttribute("data-lamp", lp.id);
      lm.style.cssText = "left:" + lp.x + "px;top:" + lp.y + "px;width:" +
        lp.w + "px;height:" + lp.h + "px;";
      page.appendChild(lm);
    }
  }
  if (def.syms) {
    for (k = 0; k < def.syms.length; k++) {
      var sm = def.syms[k];
      var se = document.createElement("div");
      /* Uzgich pichog'i sim yo'nalishi BO'YLAB: vertikal bar -> vertikal chiziq (.hz),
       * gorizontal bar -> gorizontal chiziq. Oldin teskari (ko'ndalang) edi. */
      se.className = "osym" + (sm.h > sm.w ? " hz" : "");
      se.setAttribute("data-lamp", sm.id);
      se.style.cssText = "left:" + sm.x + "px;top:" + sm.y + "px;width:" +
        sm.w + "px;height:" + sm.h + "px;";
      page.appendChild(se);
    }
  }
  if (def.lamptexts) {
    for (k = 0; k < def.lamptexts.length; k++) {
      var lt = def.lamptexts[k];
      var le = document.createElement("div");
      le.className = "olamptext";
      le.setAttribute("data-lamptext", lt.id);
      le.style.cssText = "left:" + lt.x + "px;top:" + lt.y + "px;width:" +
        lt.w + "px;height:" + lt.h + "px;font-size:" + lt.fs + "px;";
      le.textContent = lt.text;
      page.appendChild(le);
    }
  }
  if (def.scrows) {
    for (k = 0; k < def.scrows.length; k++) {
      var sr = def.scrows[k];
      var se2 = document.createElement("div");
      se2.className = "scrow";
      se2.setAttribute("data-scrow", sr.id);
      se2.style.cssText = "left:" + sr.x + "px;top:" + sr.y + "px;width:" +
        sr.w + "px;height:" + sr.h + "px;font-size:" + sr.fs + "px;";
      se2.innerHTML = "<div>" + sr.l1 + "</div><div>" + sr.l2 + "</div>";
      page.appendChild(se2);
    }
  }
  if (def.headers) {
    for (k = 0; k < def.headers.length; k++) {
      var hd = def.headers[k];
      var he = document.createElement("div");
      he.className = "schead";
      he.style.cssText = "left:" + hd.x + "px;top:" + hd.y + "px;width:" +
        hd.w + "px;height:" + hd.h + "px;font-size:" + hd.fs + "px;";
      he.textContent = hd.text;
      page.appendChild(he);
    }
  }
  if (def.ready) {
    var rb = document.createElement("div");
    rb.className = "readybox";
    rb.setAttribute("data-ready", "1");
    rb.style.cssText = "left:" + def.ready.x + "px;top:" + def.ready.y + "px;width:" +
      def.ready.w + "px;height:" + def.ready.h + "px;font-size:" + def.ready.fs + "px;";
    page.appendChild(rb);
  }
  if (def.drtables) {
    for (k = 0; k < def.drtables.length; k++) {
      var dt = def.drtables[k];
      var tab = document.createElement("div");
      tab.className = "drtab";
      tab.style.cssText = "left:" + dt.x + "px;top:" + dt.y + "px;width:" +
        dt.w + "px;height:" + dt.h + "px;font-size:" + dt.fs + "px;";
      var rh = "";
      for (var r = 0; r < dt.rows.length; r++) {
        var row = dt.rows[r];
        rh += '<div class="drrow" style="height:' + dt.rh + 'px;"><div class="drl">' +
          row[0] + '</div><div class="drv"><span data-tag="' + row[1] + '">--</span>' +
          (row[2] ? ' ' + row[2] : '') + '</div></div>';
      }
      tab.innerHTML = rh;
      page.appendChild(tab);
    }
  }
  if (def.osbar) {
    var oc = document.createElement("canvas");
    oc.id = "osbar-cv";
    oc.width = def.osbar.w;
    oc.height = def.osbar.h;
    oc.style.cssText = "position:absolute;left:" + def.osbar.x + "px;top:" +
      def.osbar.y + "px;";
    page.appendChild(oc);
    updateOsbar();
  }
  if (def.tripitems) {
    for (k = 0; k < def.tripitems.length; k++) {
      var ti = def.tripitems[k];
      var te = document.createElement("div");
      te.className = "scrow";
      te.setAttribute("data-tripitem", ti.id);
      te.style.cssText = "left:" + ti.x + "px;top:" + ti.y + "px;width:" +
        ti.w + "px;height:" + ti.h + "px;font-size:" + ti.fs + "px;";
      te.innerHTML = "<div>" + ti.l1 + "</div><div>" + ti.l2 + "</div>";
      page.appendChild(te);
    }
  }
  if (def.motors) {
    for (k = 0; k < def.motors.length; k++) {
      var mo = def.motors[k];
      var me = document.createElement("div");
      me.className = "omotor";
      me.setAttribute("data-motor", mo.id);
      me.style.cssText = "left:" + mo.x + "px;top:" + mo.y + "px;width:" +
        mo.d + "px;height:" + mo.d + "px;font-size:" + Math.round(mo.d * 0.55) + "px;";
      me.textContent = "M";
      page.appendChild(me);
    }
  }
  if (def.pumps) {
    for (k = 0; k < def.pumps.length; k++) {
      var pu = def.pumps[k];
      var pe = document.createElement("div");
      pe.className = "opump";
      pe.setAttribute("data-motor", pu.id);
      pe.style.cssText = "left:" + pu.x + "px;top:" + pu.y + "px;width:" +
        pu.d + "px;height:" + pu.d + "px;";
      pe.innerHTML = pumpArrow(pu.d, pu.dir);
      page.appendChild(pe);
    }
  }
  if (def.mcells) {
    for (k = 0; k < def.mcells.length; k++) {
      var mc = def.mcells[k];
      var ce = document.createElement("div");
      ce.className = "mcell";
      ce.setAttribute("data-mcell", mc.motor);
      ce.setAttribute("data-kind", mc.kind);
      ce.style.cssText = "left:" + mc.x + "px;top:" + mc.y + "px;width:" +
        mc.w + "px;height:" + mc.h + "px;font-size:" + mc.fs + "px;";
      page.appendChild(ce);
    }
  }
  if (def.polar) {
    var pc = document.createElement("canvas");
    pc.id = "polar-cv";
    pc.width = def.polar.size;
    pc.height = def.polar.size;
    pc.style.cssText = "position:absolute;left:" + def.polar.x + "px;top:" +
      def.polar.y + "px;";
    page.appendChild(pc);
    updatePolar();
  }
  refreshCustom();
  wireOverlay(page);
}

/* live exhaust polar plot (screen 11): cyan TC polygon over ref plot */
function updateOsbar() {
  var cv = document.getElementById("osbar-cv");
  var scr = H25_SCREENS[H25_current];
  if (!cv || !scr || !scr.osbar) return;
  var ctx = cv.getContext("2d");
  var W = scr.osbar.w, Hh = scr.osbar.h;
  var min = 7260, max = 8360;
  function yOf(v) { return Hh - (v - min) / (max - min) * Hh; }
  ctx.clearRect(0, 0, W, Hh);
  /* ref provides scale bar + Main/Backup labels + red pointers;
   * overlay draws ONLY the live speed needle to avoid double-vision */
  /* live speed needle */
  var sp = H25.tags["SPEED"] || 0;
  var yS = yOf(Math.max(min, Math.min(max, sp)));
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(W - 34, yS - 1, 28, 3);
}

function updatePolar() {
  var cv = document.getElementById("polar-cv");
  var scr = H25_SCREENS[H25_current];
  if (!cv || !scr || !scr.polar) return;
  var ctx = cv.getContext("2d");
  var P = scr.polar, cx = P.c, cy = P.c;
  ctx.clearRect(0, 0, P.size, P.size);
  /* single live polygon: current TC values -> polar points.
   * Bitta koordinata tizimi: markaz = halqalar markazi (H25_CFG.PLOT),
   * r = clamp(T,0,800)/800 * R_tashqi; CT001 tepada, 20 deg qadam. */
  var pts = [];
  for (var i = 1; i <= 18; i++) {
    var tag = "TC" + (i < 10 ? "0" + i : i);
    var v = H25.tags[tag] !== undefined ? H25.tags[tag] : 600;
    var pt = H25_EXM.polarXY(i, v, P.c, P.r);
    pts.push(pt);
  }
  /* trail history: previous polygons fade out (real-time feel, one live line) */
  if (!window.H25_polarHist) window.H25_polarHist = [];
  window.H25_polarHist.push(pts);
  if (window.H25_polarHist.length > 4) window.H25_polarHist.shift();
  var hist = window.H25_polarHist;
  for (var h = 0; h < hist.length - 1; h++) {
    ctx.strokeStyle = "rgba(60,234,232," + (0.15 + 0.15 * h) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var j = 0; j < 18; j++) {
      if (j === 0) ctx.moveTo(hist[h][j][0], hist[h][j][1]);
      else ctx.lineTo(hist[h][j][0], hist[h][j][1]);
    }
    ctx.closePath();
    ctx.stroke();
  }
  /* live line on top: single bright cyan */
  ctx.strokeStyle = "rgb(60,234,232)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var k = 0; k < 18; k++) {
    if (k === 0) ctx.moveTo(pts[k][0], pts[k][1]);
    else ctx.lineTo(pts[k][0], pts[k][1]);
  }
  ctx.closePath();
  ctx.stroke();
}

function pumpArrow(d, dir) {
  if (dir === "fan")
    return '<svg width="' + d + '" height="' + d + '"><circle cx="' + d/2 + '" cy="' +
      d/2 + '" r="' + d/6 + '" fill="#000"/></svg>';
  var pts = dir === "right" ? "4," + (d/2-7) + " " + (d-4) + "," + d/2 + " 4," + (d/2+7)
    : dir === "down" ? (d/2-7) + "," + (d-4) + " " + d/2 + ",4 " + (d/2+7) + "," + (d-4)
    : (d/2-7) + ",4 " + d/2 + "," + (d-4) + " " + (d/2+7) + ",4";
  if (dir === "down")
    pts = (d/2-7) + ",4 " + (d/2+7) + ",4 " + d/2 + "," + (d-4);
  return '<svg width="' + d + '" height="' + d + '"><polygon points="' + pts + '" fill="#000"/></svg>';
}

/* live colors for lamps / symbols / lamp-texts of the current screen */
function refreshCustom() {
  var scr = H25_SCREENS[H25_current];
  if (!scr) return;
  var els = document.querySelectorAll("#page [data-lamp]");
  for (var i = 0; i < els.length; i++)
    els[i].style.background = H25.stateColor(els[i].getAttribute("data-lamp"));
  var lts = document.querySelectorAll("#page [data-lamptext]");
  for (var j = 0; j < lts.length; j++)
    lts[j].style.background = H25.stateColor(lts[j].getAttribute("data-lamptext"));
  var scs = document.querySelectorAll("#page [data-scrow]");
  for (var s = 0; s < scs.length; s++)
    scs[s].style.background = H25.scColor(scs[s].getAttribute("data-scrow"));
  var rbs = document.querySelectorAll("#page [data-ready]");
  for (var rb = 0; rb < rbs.length; rb++) {
    var okAll = (typeof H25.startCheckOk === "function") ? H25.startCheckOk() : true;
    rbs[rb].style.background = okAll ? "rgb(0,200,0)" : "#fff";
    rbs[rb].style.color = okAll ? "#fff" : "rgb(255,0,0)";
    rbs[rb].textContent = okAll ? "READY TO START" : "NOT READY TO START";
  }
  var tis = document.querySelectorAll("#page [data-tripitem]");
  for (var t = 0; t < tis.length; t++) {
    var tid = tis[t].getAttribute("data-tripitem");
    tis[t].style.background = H25.tripItems[tid] ? "rgb(255,0,0)" : "rgb(0,200,0)";
  }
  updateMotors();
  /* gorelka staging: yopiq F2 klapan (FOFFD < KD) ekranda oqaradi.
   * Hamma narsa bog'liq: FFD -> KD -> F2_2/F2_3/F2_4 -> dumaloq gorelka. */
  try {
    var burn = {"F2_2_GCV": 1, "F2_3_GCV": 1, "F2_4_GCV": 1};
    var bos = document.querySelectorAll("#page .ov");
    for (var bi = 0; bi < bos.length; bi++) {
      var tag = bos[bi].querySelector("[data-tag]");
      var bk = tag ? tag.getAttribute("data-tag") : "";
      if (burn[bk] && (H25.tags[bk] || 99) < 5) bos[bi].style.opacity = "0.45";
      else bos[bi].style.opacity = "1";
    }
  } catch (e) {}
}

function motorColor(id) {
  return (H25.motors[id] && H25.motors[id].run) ? "rgb(250,0,0)" : "rgb(42,159,42)";
}

function updateMotors() {
  var els = document.querySelectorAll("#page .omotor, #page .opump");
  for (var i = 0; i < els.length; i++)
    els[i].style.background = motorColor(els[i].getAttribute("data-motor"));
  refreshMcells();
}

/* motor matrix cells (screen 9): text + color follow motor state */
function refreshMcells() {
  var els = document.querySelectorAll("#page [data-mcell]");
  for (var i = 0; i < els.length; i++) {
    var id = els[i].getAttribute("data-mcell"), kind = els[i].getAttribute("data-kind");
    var m = H25.motors[id];
    if (!m) continue;
    var GRAY = "#C0C0C0", ORG = "rgb(251,165,0)", RED = "rgb(255,0,0)", GRN = "rgb(0,200,0)";
    if (kind === "run") {
      els[i].textContent = m.run ? "RUNNING" : "STOPPED";
      els[i].style.background = m.run ? RED : GRN;
    } else if (kind === "auto") {
      els[i].textContent = "AUTO";
      els[i].style.background = m.auto ? ORG : GRAY;
    } else if (kind === "manual") {
      els[i].textContent = "MANUAL";
      els[i].style.background = m.auto ? GRAY : ORG;
    } else if (kind === "start") {
      els[i].textContent = "START";
      els[i].style.background = (m.run && !m.startGray) ? ORG : GRAY;
    } else if (kind === "stop") {
      els[i].textContent = "STOP";
      els[i].style.background = m.stopLatch ? ORG : GRAY;
    }
  }
}

function wireOverlay(page) {
  var mcs = page.querySelectorAll("[data-mcell]");
  for (var m = 0; m < mcs.length; m++) {
    (function (b) {
      var kind = b.getAttribute("data-kind"), id = b.getAttribute("data-mcell");
      if (kind === "run") return;
      b.style.cursor = "pointer";
      b.onclick = function () {
        if (kind === "auto") H25.setMotorMode(id, true);
        else if (kind === "manual") H25.setMotorMode(id, false);
        else if (kind === "start") H25.motorStart(id);
        else if (kind === "stop") H25.motorStop(id);
      };
    })(mcs[m]);
  }
  var btns = page.querySelectorAll("[data-act]");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      var act = b.getAttribute("data-act");
      if (act === "raise" || act === "lower") {
        var d = act === "raise" ? 1 : -1;
        var on = function (e) { if (e) e.preventDefault(); H25.raiseLower = d; };
        var off = function () { H25.raiseLower = 0; };
        b.onmousedown = on; b.onmouseup = off; b.onmouseleave = off;
        b.ontouchstart = on; b.ontouchend = off;
        return;
      }
      if (act === "vraise" || act === "vlower" || act === "iraise" || act === "ilower") {
        var dd = (act === "vraise" || act === "iraise") ? 1 : -1;
        var key = (act === "vraise" || act === "vlower") ? "vRaiseLower" : "iRaiseLower";
        b.onmousedown = function (e) { if (e) e.preventDefault(); H25[key] = dd; };
        var off2 = function () { H25[key] = 0; };
        b.onmouseup = off2; b.onmouseleave = off2;
        b.ontouchstart = function (e) { e.preventDefault(); H25[key] = dd; };
        b.ontouchend = off2;
        return;
      }
      b.onclick = function () {
        if (act === "goto") { loadScreen(b.getAttribute("data-to")); return; }
        if (act === "trip") { H25.trip("MANUAL TRIP PB", "9EX"); return; }
        if (act === "reset") { H25.masterReset(); return; }
        if (act === "countreset") { H25.counterReset(); return; }
        if (act === "release") { H25.release52G(); return; }
        if (act === "ibhrelease") { H25.releaseIBH(); return; }
        if (act === "close41") { H25.close41(); return; }
        if (act === "open41") { H25.open41(); return; }
        if (act === "os-enable") { H25.osEnable(); return; }
        if (act === "os-disable") { H25.osDisable(); return; }
        if (act === "os-start-main") { H25.osStartMain(); return; }
        if (act === "os-abort-main") { H25.osAbortMain(); return; }
        if (act === "os-start-backup") { H25.osStartBackup(); return; }
        if (act === "os-abort-backup") { H25.osAbortBackup(); return; }
        if (act === "lift") { H25.liftCal(b.getAttribute("data-val")); return; }
        if (act === "edit-load") {
          var nv = prompt("Load Set Value [MW] (0 - 32):", H25.tags["LOAD_SET"].toFixed(1));
          if (nv === null) return;
          H25.tags["LOAD_SET"] = Math.max(0, Math.min(32, parseFloat(nv) || 0));
          H25.push();
          return;
        }
        if (act === "ffd") { H25.ctl.ffdStatus = b.getAttribute("data-val"); refreshButtons(); return; }
        H25.press(b.getAttribute("data-grp"), b.getAttribute("data-val"));
      };
    })(btns[i]);
  }
  var ed = page.querySelectorAll('[data-act="edit-load"]');
}

/* (top date/time header removed — stage starts at H25 GAS TURBINE GENERATOR bar) */

/* transparent click zones over the ref nav buttons (per-screen list) */
function buildZones(list) {
  list = list || H25_NAV_ALL;
  var z = document.getElementById("navzones");
  z.innerHTML = "";
  for (var i = 0; i < list.length; i++) {
    (function (name, i) {
      var d = document.createElement("div");
      d.className = "ozone" + (H25_DBG ? " dbg" : "");
      d.style.top = (31 + i * 21.5) + "px";
      d.setAttribute("data-nav", name);
      d.onclick = function () {
        if (name === "MENU") { loadScreen("menu"); return; }
        var scr = null, want = H25_NAV_ALIAS[name] || name;
        for (var k in H25_SCREENS) {
          var sn = H25_SCREENS[k].nav;
          if (sn === name || (H25_NAV_ALIAS[sn] || sn) === want) { scr = H25_SCREENS[k]; break; }
        }
        if (scr) loadScreen(scr.id);
      };
      z.appendChild(d);
    })(list[i], i);
  }
}

/* FFD bar geometry: axis 0-127 counts, plot y 463-647 */
function ffdFillTop(v) { return 647 - v / 127 * 184; }
function updateFbars() {
  var els = document.querySelectorAll("#page .fbar");
  for (var i = 0; i < els.length; i++) {
    var el = els[i], tag = el.getAttribute("data-tag");
    var v = (tag in H25.tags) ? H25.tags[tag] : 0;
    var top = ffdFillTop(v);
    el.style.top = (top - 170) + "px";
    el.style.height = Math.max(1, 648 - top) + "px";
  }
}

function loadScreen(id) {
  var scr = H25_SCREENS[id];
  if (!scr) return;
  H25_current = id;
  var bg = document.getElementById("refbg");
  if (scr.bg) { bg.style.display = ""; bg.src = scr.bg; }
  else { bg.style.display = "none"; }
  buildZones(scr.navList);
  scr.render(document.getElementById("page"));
  H25.push();
  refreshButtons();
}

/* Bosib-turgich tugmalar (RAISE/LOWER) tiqilib qolmasin: sichqon/barmoq
 * sahifadan tashqarida qo'yib yuborilsa ham jog to'xtaydi. */
document.addEventListener("mouseup", function () {
  if (window.H25) { H25.raiseLower = 0; H25.vRaiseLower = 0; H25.iRaiseLower = 0; }
});
document.addEventListener("touchend", function () {
  if (window.H25) { H25.raiseLower = 0; H25.vRaiseLower = 0; H25.iRaiseLower = 0; }
});

window.addEventListener("resize", fitStage);
document.addEventListener("fullscreenchange", fitStage);
document.addEventListener("keydown", function (e) {
  if (e.key === "F" || e.key === "f" || e.key === "Ф" || e.key === "ф") toggleFullscreen();
});
document.addEventListener("dblclick", function (e) {
  if (e.target === document.getElementById("refbg") ||
      e.target.id === "viewport" || e.target.id === "stage") toggleFullscreen();
});

window.onload = function () {
  H25_DBG = location.search.indexOf("dbg") >= 0;
  if (typeof SCR_STARTUP !== "undefined") H25_SCREENS.startup = SCR_STARTUP;
  if (typeof SCR_FFD !== "undefined") H25_SCREENS.ffd = SCR_FFD;
  if (typeof SCR_SYNC !== "undefined") H25_SCREENS.sync = SCR_SYNC;
  if (typeof SCR_FUELGAS !== "undefined") H25_SCREENS.fuelgas = SCR_FUELGAS;
  if (typeof SCR_LUBE !== "undefined") H25_SCREENS.lube = SCR_LUBE;
  if (typeof SCR_GEN !== "undefined") H25_SCREENS.gen = SCR_GEN;
  if (typeof SCR_VENT !== "undefined") H25_SCREENS.vent = SCR_VENT;
  if (typeof SCR_IBH !== "undefined") H25_SCREENS.ibh = SCR_IBH;
  if (typeof SCR_MOTORS !== "undefined") H25_SCREENS.motors = SCR_MOTORS;
  if (typeof SCR_BRG !== "undefined") H25_SCREENS.brg = SCR_BRG;
  if (typeof SCR_EXH !== "undefined") H25_SCREENS.exh = SCR_EXH;
  if (typeof SCR_VIB !== "undefined") H25_SCREENS.vib = SCR_VIB;
  if (typeof SCR_WS !== "undefined") H25_SCREENS.ws = SCR_WS;
  if (typeof SCR_SC !== "undefined") H25_SCREENS.sc = SCR_SC;
  if (typeof SCR_TIM !== "undefined") H25_SCREENS.tim = SCR_TIM;
  if (typeof SCR_TRIPM !== "undefined") H25_SCREENS.tripm = SCR_TRIPM;
  if (typeof SCR_DR1 !== "undefined") H25_SCREENS.dr1 = SCR_DR1;
  if (typeof SCR_DR2 !== "undefined") H25_SCREENS.dr2 = SCR_DR2;
  if (typeof SCR_OS !== "undefined") H25_SCREENS.os = SCR_OS;
  if (typeof SCR_MENU !== "undefined") H25_SCREENS.menu = SCR_MENU;
  H25.init();
  fitStage();
  var m = location.search.match(/screen=(\w+)/);
  loadScreen((m && H25_SCREENS[m[1]]) ? m[1] : "startup");
  H25.onTick(updateFbars);
  H25.onTick(refreshCustom);
  H25.onTick(updatePolar);
  H25.onTick(updateOsbar);
  H25.startLoop();
  if (location.search.indexOf("trainer") >= 0) buildTrainer();
  /* visible fullscreen button (viewport corner, outside the 1:1 HMI) */
  var fsb = document.createElement("div");
  fsb.id = "fsbtn";
  fsb.title = "To'liq ekran / Fullscreen (F)";
  fsb.textContent = "\u26F6 TO'LIQ EKRAN";
  fsb.onclick = function (e) { if (e) e.stopPropagation(); toggleFullscreen(); };
  document.getElementById("viewport").appendChild(fsb);
  var fsSync = function () {
    fsb.textContent = document.fullscreenElement ? "\u2715 CHIQISH" : "\u26F6 TO'LIQ EKRAN";
  };
  document.addEventListener("fullscreenchange", fsSync);
  if (location.search.indexOf("fullscreen") >= 0) {
    /* ?fullscreen=1: first click enters fullscreen (browser needs a gesture) */
    var fsOnce = function () {
      toggleFullscreen();
      document.removeEventListener("click", fsOnce);
    };
    document.addEventListener("click", fsOnce);
  }
  if (location.search.indexOf("selftest") >= 0) {
    setTimeout(runSelfTest, 500);
  }
};

/* Fault-injection trainer panel (?trainer=1). HMI stays 1:1 English;
 * this floating panel is outside the DIASYS screens, for instructors only. */
function buildTrainer() {
  var p = document.getElementById("trainer");
  if (!p) {
    p = document.createElement("div");
    p.id = "trainer";
    document.getElementById("stage").appendChild(p);
  }
  var F = H25.faults;
  function btn(name, label) {
    var on = F[name];
    return '<button data-f="' + name + '" style="background:' +
      (on ? 'rgb(255,0,0);color:#fff' : '#C0C0C0') + '">' + label +
      (on ? " [ON]" : "") + "</button>";
  }
  p.innerHTML = "<b>TRAINER — fault injection</b><br>" +
    btn("vib", "High vibration") + btn("exh", "Exhaust overtemp") +
    btn("lube", "Lube-oil leak") + btn("fuel", "Fuel-gas low") +
    '<button data-f="__clear">Clear + Reset</button>' +
    "<div>Trip: " + (H25.tripped ? H25.tripCause : "—") + "</div>";
  var bs = p.querySelectorAll("button");
  for (var i = 0; i < bs.length; i++) {
    bs[i].onclick = (function (b) {
      return function () {
        var f = b.getAttribute("data-f");
        if (f === "__clear") { H25.clearFaults(); H25.masterReset(); }
        else H25.setFault(f, !H25.faults[f]);
      };
    })(bs[i]);
  }
}
