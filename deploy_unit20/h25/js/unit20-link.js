/* Versioned, session-scoped telemetry. Transport never writes calculated tags. */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search),
    enabled = q.get('link') !== '0',
    session = q.get('session') || 'unit20-default';
  var key = 'unit20:v3:' + session,
    bc = null,
    lastStorage = 0,
    latest = null,
    peers = {},
    instance =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
  var role = window.UNIT20_ROLE || 'h25',
    TTL = 6000;
  if (enabled)
    try {
      bc = new BroadcastChannel(key);
    } catch (e) {}
  function accept(m) {
    if (
      !m ||
      m.version !== 3 ||
      m.session !== session ||
      m.instance === instance ||
      !['h25', 'ku20'].includes(m.src) ||
      !Number.isFinite(m.t) ||
      Math.abs(Date.now() - m.t) > TTL
    )
      return;
    peers[m.instance] = { src: m.src, t: m.t };
    if (m.src !== role) {
      if (
        role === 'h25' &&
        (typeof m.boilerTrip !== 'boolean' || !Number.isFinite(m.backP))
      )
        return;
      if (
        role === 'ku20' &&
        (!Number.isFinite(m.exh_t) ||
          !Number.isFinite(m.power) ||
          typeof m.running !== 'boolean')
      )
        return;
      latest = m;
    }
  }
  if (bc)
    bc.onmessage = function (e) {
      accept(e.data);
    };
  function receive() {
    if (!enabled) return;
    try {
      var raw = localStorage.getItem(
        key + ':' + (role === 'h25' ? 'ku20' : 'h25'),
      );
      if (raw) accept(JSON.parse(raw));
    } catch (e) {}
  }
  function conflicts() {
    var now = Date.now(),
      count = 0;
    Object.keys(peers).forEach(function (id) {
      if (now - peers[id].t > TTL) delete peers[id];
      else if (peers[id].src === role) count++;
    });
    return count > 0;
  }
  function current() {
    receive();
    return enabled &&
      !conflicts() &&
      latest &&
      Date.now() - latest.t < TTL &&
      !latest.paused
      ? latest
      : null;
  }
  function send(data) {
    if (!enabled) return;
    var msg = Object.assign({}, data, {
      src: role,
      version: 3,
      session: session,
      instance: instance,
      t: Date.now(),
    });
    if (bc) bc.postMessage(msg);
    if (Date.now() - lastStorage > 1000) {
      try {
        localStorage.setItem(key + ':' + role, JSON.stringify(msg));
      } catch (e) {}
      lastStorage = Date.now();
    }
  }
  window.UNIT20_LINK = {
    read: current,
    send: send,
    status: function () {
      if (!enabled) return 'LINK DISABLED';
      if (conflicts())
        return 'SESSION CONFLICT · close duplicate ' + role + ' window';
      receive();
      return latest && Date.now() - latest.t < TTL
        ? latest.paused
          ? 'PEER PAUSED'
          : 'LINK LIVE · ' + (role === 'h25' ? 'KU-20' : 'H25')
        : 'LINK OFFLINE · standalone';
    },
    session: session,
  };
  if (role === 'h25' && window.H25) {
    H25.onTick(function (T) {
      var ku = current();
      H25.kuInput = ku
        ? {
            boilerTrip: ku.boilerTrip,
            backP: Math.max(-20, Math.min(20, ku.backP)),
          }
        : null;
      window.KU_LIVE = ku;
      send({
        exh_t: T.EXH_T,
        power: T.GEN_POWER,
        speed: T.SPEED,
        load_set: T.LOAD_SET,
        fuel_flow: T.FUEL_FLOW,
        running: H25.flameOn(),
        tripped: H25.tripped,
        seq: H25.seq,
        paused: H25.paused || document.hidden,
      });
    });
    setInterval(function () {
      if (!H25.tags.SPEED && H25.tags.SPEED !== 0) return;
      send({
        exh_t: H25.tags.EXH_T,
        power: H25.tags.GEN_POWER,
        speed: H25.tags.SPEED,
        running: H25.flameOn(),
        tripped: H25.tripped,
        paused: H25.paused || document.hidden,
      });
      var ku = current();
      H25.kuInput = ku ? { boilerTrip: ku.boilerTrip, backP: ku.backP } : null;
    }, 1500);
  }
})();
