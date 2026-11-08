/* Requires: npm ci && npx playwright install --with-deps chromium.
 * Starts an ephemeral test-only HTTP server, closes it on completion.
 * Set BASE_URL to use an already-running server instead. */
'use strict';
const { chromium } = require('playwright'),
  assert = require('node:assert/strict'),
  http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..'),
  results = {
    screens: [],
    layouts: [],
    scenarios: [],
    errors: [],
    imageRequests: [],
  };
(async () => {
  let server, browser;
  try {
    let base = process.env.BASE_URL;
    if (!base) {
      server = http.createServer((req, res) => {
        let pathname = decodeURIComponent(
          new URL(req.url, 'http://x').pathname,
        );
        let file = path.resolve(root, '.' + pathname);
        if (!file.startsWith(root + path.sep) && file !== root) {
          res.writeHead(403).end();
          return;
        }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory())
          file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) {
          res.writeHead(404).end();
          return;
        }
        res.setHeader(
          'Content-Type',
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
          }[path.extname(file)] || 'application/octet-stream',
        );
        fs.createReadStream(file).pipe(res);
      });
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      base = 'http://127.0.0.1:' + server.address().port;
    }
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const sizes = [
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1280, 720],
      [1024, 768],
      [800, 600],
      [390, 844],
    ];
    for (const route of [
      '/index.html',
      '/deploy_unit20/h25/index.html',
      '/ku/index.html',
      '/deploy_unit20/ku/index.html',
    ]) {
      const ctx = await browser.newContext(),
        p = await ctx.newPage();
      p.on('pageerror', (e) => results.errors.push(route + ': ' + e.message));
      p.on('request', (r) => {
        if (/\.(png|jpe?g)(\?|$)/i.test(r.url()))
          results.imageRequests.push(r.url());
      });
      for (const [w, h] of sizes) {
        await p.setViewportSize({ width: w, height: h });
        await p.goto(base + route);
        await p.waitForTimeout(80);
        const ku = route.includes('/ku/');
        const exact = !ku && await p.evaluate(() => !!window.EXACT_STARTUP);
        const ids = ku
          ? ['9', '10']
          : await p.evaluate(() => Object.keys(window.EXACT_STARTUP ? EXACT_STARTUP.screens : H25_SCREENS));
        for (const id of ids) {
          if (ku)
            await p.evaluate((id) => {
              view = id;
              render();
            }, id);
          else if (exact) await p.evaluate((id) => EXACT_STARTUP.navigate(id, true), id);
          else await p.evaluate((id) => loadScreen(id), id);
          let metrics = await p.evaluate(() => {
            const d = document.documentElement,
              page = document.getElementById('page') || document.getElementById('screen-holder');
            let badTags = [...document.querySelectorAll('[data-tag]')]
              .filter((e) =>
                e.dataset.tag !== 'NA_TAG' && ['—', 'BAD', 'NaN', 'undefined'].includes(e.textContent),
              )
              .map((e) => e.dataset.tag);
            return {
              doc: [
                d.clientWidth,
                d.clientHeight,
                d.scrollWidth,
                d.scrollHeight,
              ],
              page: [page.clientWidth, page.scrollWidth],
              images: document.images.length,
              badTags,
            };
          });
          results.screens.push({ route, w, h, id, ...metrics });
          assert.equal(metrics.images, 0, route + ' has images');
          assert.equal(
            metrics.badTags.length,
            0,
            route + '/' + id + ' bad tags',
          );
          assert(
            metrics.doc[2] <= w + 1 && metrics.doc[3] <= h + 1,
            JSON.stringify({ route, w, h, id, metrics }),
          );
          assert(
            metrics.page[1] <= metrics.page[0] + 1,
            'Horizontal content overflow ' +
              JSON.stringify({ route, w, h, id, metrics }),
          );
        }
        results.layouts.push({ route, w, h, pass: true });
      }
      await ctx.close();
    }
    let ctx = await browser.newContext(),
      p = await ctx.newPage();
    p.on('pageerror', (e) => results.errors.push(e.message));
    await p.clock.install();
    await p.goto(base + '/index.html?cold=1&trainer=1&link=0');
    await p.locator('[data-grp="master"][data-val="START"]').click();
    await p.clock.runFor(1000);
    await p.locator('[data-grp="master"][data-val="STOP"]').click();
    await p.clock.runFor(10000);
    assert.equal(await p.evaluate(() => H25.flameOn()), false);
    results.scenarios.push('UI START → STOP: no restart');
    await p.evaluate(() => {
      H25.init();
      loadScreen('os');
    });
    await p.locator('[data-act="os-enable"]').click();
    await p.locator('[data-act="os-start-main"]').click();
    await p.clock.runFor(6000);
    assert.equal(await p.evaluate(() => H25.tripItems['12H']), true);
    results.scenarios.push('UI overspeed: 12H trip');
    await p.evaluate(() => {
      H25.init('cold');
      loadScreen('startup');
    });
    await p.locator('[data-grp="master"][data-val="START"]').click();
    await p.clock.runFor(45000);
    assert.equal(await p.evaluate(() => H25.seq), 'Base Load');
    results.scenarios.push('UI cold START: complete');
    await p.evaluate(() => loadScreen('startup'));
    let input = p.locator('#load-input');
    await input.fill('12');
    await p.locator('#load-form button').click();
    assert.equal(await p.evaluate(() => H25.tags.LOAD_SET), 12);
    results.scenarios.push('Load input applies');
    await p.locator('[data-act="raise"]').focus();
    await p.keyboard.down('Space');
    await p.clock.runFor(1000);
    await p.keyboard.up('Space');
    assert.equal(await p.evaluate(() => H25.raiseLower), 0);
    results.scenarios.push('Keyboard jog releases');
    await p.locator('#trainer-button').click();
    let bounds = await p.evaluate(() => {
      let a = document.querySelector('#sndbtn').getBoundingClientRect(),
        b = document.querySelector('#fsbtn').getBoundingClientRect();
      return (
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      );
    });
    assert.equal(bounds, 0);
    results.scenarios.push('Sound / fullscreen non-overlapping');
    await ctx.close();
    ctx = await browser.newContext();
    p = await ctx.newPage();
    await p.goto(base + '/index.html?session=ttl-test');
    const ttl = await p.evaluate(() => {
      const k = 'unit20:v3:ttl-test:ku20';
      localStorage.setItem(
        k,
        JSON.stringify({
          version: 3,
          session: 'ttl-test',
          instance: 'test-peer',
          src: 'ku20',
          t: Date.now() - 10000,
          boilerTrip: true,
          backP: 0,
        }),
      );
      let stale = UNIT20_LINK.read();
      localStorage.setItem(
        k,
        JSON.stringify({
          version: 3,
          session: 'ttl-test',
          instance: 'test-peer',
          src: 'ku20',
          t: Date.now(),
          boilerTrip: true,
          backP: 0,
        }),
      );
      let fresh = UNIT20_LINK.read();
      return { stale: !!stale, fresh: !!fresh };
    });
    assert.equal(ttl.stale, false);
    assert.equal(ttl.fresh, true);
    results.scenarios.push(
      'Link rejects stale / accepts fresh scoped telemetry',
    );
    await ctx.close();
    ctx = await browser.newContext();
    p = await ctx.newPage();
    await p.goto(base + '/ku/index.html?link=0');
    await p.locator('[data-valve-command="feed1"][data-mode-set="M"]').click();
    await p.locator('[data-slider="feed1"]').evaluate((e) => {
      e.value = '20';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await p.evaluate(() => S.valves.feed1.set), 20);
    await p.locator('#trip-button').click();
    assert.equal(await p.evaluate(() => S.trip), true);
    await p.locator('[data-view="10"]').click();
    assert.equal(await p.evaluate(() => view), '10');
    results.scenarios.push('KU manual setpoint / trip / navigation');
    await ctx.close();
    ctx = await browser.newContext();
    p = await ctx.newPage();
    let boiler = await ctx.newPage();
    await p.goto(base + '/deploy_unit20/h25/index.html?session=integration');
    await boiler.goto(
      base + '/deploy_unit20/ku/index.html?session=integration',
    );
    await p.waitForFunction(() => H25.kuInput !== null);
    await boiler.waitForFunction(() => S.linked);
    await boiler.evaluate(() => S.tripNow('LINK TEST'));
    await p.waitForFunction(() => H25.kuInput && H25.kuInput.boilerTrip);
    assert(
      (await boiler.locator('#h25-link').getAttribute('href')).includes(
        '/h25/index.html',
      ),
    );
    results.scenarios.push(
      'Two-window H25 ↔ KU telemetry and boiler-trip feedback',
    );
    await ctx.close();
    assert.equal(results.errors.length, 0, results.errors.join('\n'));
    assert.equal(results.imageRequests.length, 0, 'Raster assets loaded');
    console.log(
      `PASS: ${results.screens.length} screen/viewport checks, ${results.layouts.length} layouts, ${results.scenarios.length} UI scenarios; no runtime raster requests.`,
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'test-results', 'browser.json'),
      JSON.stringify(results, null, 2),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
