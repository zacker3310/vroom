#!/usr/bin/env node
/* run-all: serves the repo root on a free port, runs every suite with VROOM_URL
   pointing at it, prints a summary table and exits non-zero on any failure.
   Usage: CHROMIUM=/path/to/chrome node tests/run-all.cjs [suite ...]
   Env:   VROOM_URL  skip the built-in server and test that URL instead
          PORT       pin the server port (default: first free port from 4173) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SUITES = [
  'verify', 'polish-check', 'damage-check', 'free-check', 'feel-check', 'worlds-check',
  'album-check', 'profile-check', 'washdecals-check', 'parade-check', 'update-check',
  'world-check-audio-events', 'fairness-check', 'paint-check', 'shop-check',
];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.cjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain' };

function serve(port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(buf);
      });
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function serveFree() {
  const start = Number(process.env.PORT) || 4173;
  for (let p = start; p < start + 50; p++) {
    try { return [await serve(p), p]; } catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  throw new Error('no free port');
}

function run(suite, env) {
  return new Promise(resolve => {
    const t0 = Date.now();
    let out = '';
    const child = spawn(process.execPath, [path.join(__dirname, suite + '.cjs')], { env, cwd: __dirname });
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', code => {
      const lines = out.trim().split('\n');
      const last = lines[lines.length - 1] || '';
      const m = last.match(/(\d+)\s*\/\s*(\d+)/);
      const passed = m ? Number(m[1]) : null, total = m ? Number(m[2]) : null;
      const fails = (out.match(/^FAIL/gm) || []).length;
      resolve({ suite, code, passed, total, fails, last, ms: Date.now() - t0, out });
    });
  });
}

(async () => {
  const wanted = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const suites = wanted.length ? wanted : SUITES;
  let srv = null, url = process.env.VROOM_URL;
  if (!url) { const [s, port] = await serveFree(); srv = s; url = `http://127.0.0.1:${port}/index.html`; }
  console.log(`Vroom suites -> ${url}\n`);
  const env = { ...process.env, VROOM_URL: url };
  const results = [];
  for (const s of suites) {
    process.stdout.write(`  ${s.padEnd(26)} ... `);
    const r = await run(s, env);
    results.push(r);
    const ok = r.code === 0 && r.fails === 0 && (r.total === null || r.passed === r.total);
    r.ok = ok;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.passed !== null ? `${r.passed}/${r.total}` : ''} (${(r.ms / 1000).toFixed(1)}s)`);
    if (!ok) console.log(r.out.split('\n').filter(l => /FAIL|Error|error/.test(l)).slice(0, 12).map(l => '      ' + l).join('\n'));
  }
  if (srv) srv.close();
  const pass = results.filter(r => r.ok).length;
  const checks = results.reduce((a, r) => a + (r.passed || 0), 0);
  const totalChecks = results.reduce((a, r) => a + (r.total || 0), 0);
  console.log(`\n${'suite'.padEnd(26)} ${'result'.padEnd(6)} checks`);
  for (const r of results) console.log(`${r.suite.padEnd(26)} ${(r.ok ? 'ok' : 'FAIL').padEnd(6)} ${r.passed !== null ? `${r.passed}/${r.total}` : r.last.slice(0, 40)}`);
  console.log(`\n${pass}/${results.length} suites, ${checks}/${totalChecks} checks`);
  process.exit(pass === results.length ? 0 : 1);
})();
