#!/usr/bin/env node
/* run-all: the canonical test runner (`npm test`).
   Serves the repo root on a free port (or honours VROOM_URL), resolves a Chromium
   (CHROMIUM env, else playwright-core's downloaded build), runs every *-check.cjs plus
   verify.cjs in tests/, prints a summary table and exits non-zero when anything fails.

   Usage: node tests/run-all.cjs [--verbose] [--only name,name] [--port N]
     --verbose   stream each suite's output live (default: only failing suites' output)
     --only      comma-separated suite names, e.g. --only verify,shop-check
     --port      pin the built-in server's port instead of picking a free one
   Env: CHROMIUM=/path/to/chrome   VROOM_URL=http://host:port/index.html (skips the server) */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const argVal = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const only = argVal('--only') ? argVal('--only').split(',').map(s => s.trim()).filter(Boolean) : null;
const pinnedPort = argVal('--port') ? Number(argVal('--port')) : null;

/* ---- suites: verify first (core loop), then every *-check.cjs alphabetically ---- */
const SUITES = ['verify', ...fs.readdirSync(__dirname)
  .filter(f => /-check(-[a-z-]+)?\.cjs$/.test(f))
  .map(f => f.replace(/\.cjs$/, ''))
  .sort()];
const suites = only ? SUITES.filter(s => only.includes(s)) : SUITES;
if (!suites.length) { console.error('run-all: no suites match --only ' + only); process.exit(2); }

/* ---- chromium ---- */
function resolveChromium() {
  if (process.env.CHROMIUM) {
    if (!fs.existsSync(process.env.CHROMIUM)) { console.error('run-all: CHROMIUM points at a missing file: ' + process.env.CHROMIUM); process.exit(2); }
    return process.env.CHROMIUM;
  }
  try {
    const exe = require('playwright-core').chromium.executablePath();
    if (exe && fs.existsSync(exe)) return exe;
    console.error('run-all: playwright-core has no Chromium downloaded (expected ' + exe + ').\n         Run `npx playwright-core install chromium`, or set CHROMIUM=/path/to/chrome.');
  } catch (e) {
    console.error('run-all: cannot resolve a browser: ' + e.message + '\n         Run `npm ci`, then `npx playwright-core install chromium`, or set CHROMIUM=/path/to/chrome.');
  }
  process.exit(2);
}

/* ---- static server: the whole repo root, so index.html's relative links resolve ---- */
const MIME = { '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.cjs': 'text/javascript', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8' };
function serve(port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

/* ---- run one suite, capture its output, parse the "N/M passed" trailer ---- */
function runSuite(name, env) {
  return new Promise(resolve => {
    const t0 = Date.now();
    let out = '';
    const child = spawn(process.execPath, [path.join(__dirname, name + '.cjs')], { cwd: __dirname, env });
    const sink = chunk => { const s = chunk.toString(); out += s; if (verbose) process.stdout.write(s); };
    child.stdout.on('data', sink);
    child.stderr.on('data', sink);
    child.on('close', code => {
      const m = out.match(/(\d+)\/(\d+) passed\s*$/m);
      resolve({ name, code, out, passed: m ? Number(m[1]) : 0, total: m ? Number(m[2]) : 0, ms: Date.now() - t0 });
    });
  });
}

(async () => {
  const chromium = resolveChromium();
  let server = null, url = process.env.VROOM_URL;
  if (!url) {
    const port = pinnedPort || await freePort();
    server = await serve(port);
    url = `http://127.0.0.1:${port}/index.html`;
  }
  console.log(`vroom tests  |  ${suites.length} suites  |  ${url}  |  ${chromium}\n`);
  const env = { ...process.env, CHROMIUM: chromium, VROOM_URL: url };

  const results = [];
  for (const name of suites) {
    if (verbose) console.log(`\n=== ${name} ===`);
    else process.stdout.write(`${name.padEnd(28)} ... `);
    const r = await runSuite(name, env);
    results.push(r);
    if (!verbose) console.log(r.code === 0 ? `ok   ${r.passed}/${r.total}  ${(r.ms / 1000).toFixed(1)}s` : `FAIL ${r.passed}/${r.total}  (exit ${r.code})`);
  }
  if (server) server.close();

  /* ---- failing suites' full output, then the table ---- */
  const failed = results.filter(r => r.code !== 0);
  if (!verbose) for (const r of failed) { console.log(`\n--- ${r.name} output ---\n${r.out.trim()}\n`); }
  const col = (s, n) => String(s).padEnd(n);
  const line = '-'.repeat(60);
  console.log(`\n${line}\n${col('suite', 30)}${col('checks', 12)}${col('time', 9)}status\n${line}`);
  for (const r of results) console.log(`${col(r.name, 30)}${col(r.passed + '/' + r.total, 12)}${col((r.ms / 1000).toFixed(1) + 's', 9)}${r.code === 0 ? 'ok' : 'FAIL'}`);
  const passed = results.reduce((a, r) => a + r.passed, 0), total = results.reduce((a, r) => a + r.total, 0);
  const secs = (results.reduce((a, r) => a + r.ms, 0) / 1000).toFixed(1);
  console.log(`${line}\n${col(`${results.length - failed.length}/${results.length} suites`, 30)}${col(`${passed}/${total}`, 12)}${col(secs + 's', 9)}${failed.length ? 'FAIL' : 'ok'}\n`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('run-all: ' + (e.stack || e)); process.exit(2); });
