const pw = require('playwright-core');
const os = require('os');
const fs = require('fs');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : ''));
}

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const src = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  let serveNew = false, reloadedWithBust = false;
  /* the version probe fetches index.html?v=<n>: hand it either the same file or a "deployed" one */
  await page.route(/index\.html\?v=/, route => {
    if (route.request().resourceType() === 'document') { reloadedWithBust = true; return route.continue(); }
    route.fulfill({ status: 200, contentType: 'text/html', body: serveNew ? src.replace('"use strict";', '"use strict"; /* v-next */') : src });
  });

  await page.goto(URL);
  await page.waitForTimeout(3200);
  let shown = await page.evaluate(() => updateBtn.classList.contains('show'));
  check('update: no gate when the server copy matches', !shown);

  serveNew = true;
  await page.evaluate(() => { lastUpdateCheck = 0; return checkForUpdate(); });
  shown = await page.evaluate(() => updateBtn.classList.contains('show'));
  check('update: gate appears when a new version is deployed', shown);

  /* a quick tap must not reload */
  const box = await page.locator('#updateBtn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
  await page.waitForTimeout(1800);
  check('update: a quick tap does not reload', !reloadedWithBust);

  /* holding through the ring reloads with a cache-busting URL */
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up().catch(() => {});
  await page.waitForTimeout(800);
  check('update: press-and-hold reloads the new version', reloadedWithBust && page.url().includes('?v='), page.url());

  /* ---- the same gate on the title scene (v13.10): boot without ?garage, the probe finds the new version, the title's
     own button shows, a tap does nothing, a hold reloads ---- */
  reloadedWithBust = false;
  await page.goto(URL.replace(/[?&]garage\b/, ''));
  await page.waitForTimeout(3200);
  const onTitle = await page.evaluate(() => ({ active: [...document.querySelectorAll('.scene.active')].map(s => s.id).join(','),
    show: titleUpdateBtn.classList.contains('show'), display: getComputedStyle(titleUpdateBtn).display, garageToo: updateBtn.classList.contains('show') }));
  check('title gate: the title scene shows its own gate when a new version is deployed (and the garage one is armed too)', onTitle.active === 'title' && onTitle.show && onTitle.display !== 'none' && onTitle.garageToo, JSON.stringify(onTitle));
  const tb = await page.locator('#titleUpdateBtn').boundingBox();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
  await page.waitForTimeout(1800);
  const stillTitle = await page.evaluate(() => document.getElementById('title').classList.contains('active') && !document.getElementById('titleUpdateBtn').classList.contains('holding'));
  check('title gate: a quick tap does not reload and lets go of the ring', !reloadedWithBust && stillTitle);
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up().catch(() => {});
  await page.waitForTimeout(800);
  check('title gate: press-and-hold on the title reloads the new version', reloadedWithBust && page.url().includes('?v='), page.url());
  check('update: no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} passed`);
  process.exit(pass === results.length ? 0 : 1);
})();
