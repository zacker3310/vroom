/* level-report: not a pass/fail suite: builds every level and prints, per level,
   the beat sequence and prop counts so you can eyeball that the levels differ.
   Usage: CHROMIUM=... VROOM_URL=http://localhost:4173/index.html node level-report.cjs [--shots] */
const pw = require('playwright-core');
const os = require('os');
const EXE = process.env.CHROMIUM || os.homedir() + '/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const URL = process.env.VROOM_URL || 'http://localhost:4173/index.html';
const SHOT = __dirname + '/shots/';
const shots = process.argv.includes('--shots');
require('fs').mkdirSync(SHOT, { recursive: true });

(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(400);

  const rep = await page.evaluate(() => {
    const out = [];
    for (let n = 1; n <= MAX_LEVEL; n++) {
      buildLevel(n);
      const counts = {};
      for (const p of props) if (p.type !== 'finish') counts[p.type] = (counts[p.type] || 0) + 1;
      const hard = props.filter(p => ['barrel', 'rock', 'tnt', 'cactus', 'crater'].includes(p.type));
      let wall = 0;
      for (const a of hard) for (const b of hard) for (const c of hard) {
        if (a === b || b === c || a === c) continue;
        const xs = [a.x, b.x, c.x];
        if (Math.max(...xs) - Math.min(...xs) < 240 && new Set([a.lane, b.lane, c.lane]).size === 3) wall++;
      }
      const inZone = props.filter(p => p.type !== 'star' && p.type !== 'finish' && RAMPS.some(rp => p.x > rp.x - 200 && p.x < rp.x + rp.w + 420)).length;
      /* compress the beat list: "snake x3" style runs */
      const seq = [];
      for (const b of lastBeats) { const l = seq[seq.length - 1]; if (l && l.name === b) l.k++; else seq.push({ name: b, k: 1 }); }
      out.push({
        n, len: LEVEL_LEN, sig: signatureOf(n).name, ramps: RAMPS.length, hard: hard.length, wall, inZone,
        beats: seq.map(s => s.name + (s.k > 1 ? 'x' + s.k : '')).join(' > '),
        counts, totalStars
      });
    }
    return out;
  });
  for (const r of rep) {
    const c = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' ');
    console.log(`L${String(r.n).padStart(2)} len=${r.len} sig=${r.sig.padEnd(13)} ramps=${r.ramps} hard=${String(r.hard).padStart(2)}${r.wall ? ' WALL!' : ''}${r.inZone ? ' INZONE!' : ''}`);
    console.log(`     ${r.beats}`);
    console.log(`     ${c}`);
  }
  /* neighbor distinctness: same signature as the level before? */
  const same = rep.filter((r, i) => i > 0 && r.sig === rep[i - 1].sig).map(r => r.n);
  console.log('\nsame signature as previous level:', same.length ? same.join(',') : 'none');
  console.log('distinct signatures used:', new Set(rep.map(r => r.sig)).size, 'of', rep.length, 'levels');
  console.log('errors:', errors.length ? errors.join(' | ').slice(0, 400) : 'none');

  if (shots) {
    for (const n of [1, 7, 8, 23, 47, 56, 63, 80]) {
      await page.evaluate(async n => {
        lockedParts = () => [];
        drive(n);
        await new Promise(r => setTimeout(r, 150));
        gasKey = false; v = 0;
        const first = props.filter(p => p.type !== 'finish' && p.type !== 'star').sort((a, b) => a.x - b.x)[Math.floor(props.length / 6)];
        pos = Math.max(0, (first ? first.x : 1200) - 900); renderWorld();
      }, n);
      await page.waitForTimeout(1400);   /* let the level-start iris wipe finish */
      await page.evaluate(() => { v = 0; renderWorld(); });
      await page.screenshot({ path: SHOT + `level-${n}.png` });
      console.log('shot', SHOT + `level-${n}.png`);
    }
  }
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
