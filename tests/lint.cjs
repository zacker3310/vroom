#!/usr/bin/env node
/* lint: extracts the inline <script> from index.html to a temp .js file and runs ESLint
   (global install, flat config in ../eslint.config.js) over it with the Node API.
   Names that are unused inside the script but referenced from the HTML (on* attributes)
   or from tests/*.cjs are reported separately as "external", not as findings.
   Usage: node tests/lint.cjs [--all]     (--all also prints the external bucket)
   Exit code: 1 when any real finding remains. */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const open = html.indexOf('<script>'), close = html.lastIndexOf('</script>');
if (open < 0 || close < 0) { console.error('no inline <script> found'); process.exit(2); }
const before = html.slice(0, open + '<script>'.length);
const lineOffset = before.split('\n').length - 1;
const js = html.slice(open + '<script>'.length, close);

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vroom-lint-')), 'index.inline.js');
fs.writeFileSync(tmp, js);

/* names referenced outside the script: HTML on* handlers and the test suites */
const external = new Set();
for (const m of html.slice(0, open).matchAll(/\son\w+="([^"]*)"/g))
  for (const id of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) external.add(id[0]);
for (const f of fs.readdirSync(__dirname)) {
  if (!f.endsWith('.cjs') || f === 'lint.cjs' || f === 'run-all.cjs') continue;
  for (const id of fs.readFileSync(path.join(__dirname, f), 'utf8').matchAll(/[A-Za-z_$][\w$]*/g)) external.add(id[0]);
}

function loadESLint() {
  try { return require('eslint'); } catch (e) { /* fall through to the global install */ }
  const { execSync } = require('child_process');
  const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
  for (const dir of [root, '/opt/node-tools/node_modules']) {
    try { return require(path.join(dir, 'eslint')); } catch (e) { /* try next */ }
  }
  console.error('eslint not found (npm i -g eslint)'); process.exit(2);
}

(async () => {
  const { ESLint } = loadESLint();
  const eslint = new ESLint({ cwd: path.dirname(tmp), overrideConfigFile: path.join(ROOT, 'eslint.config.js') });
  const [result] = await eslint.lintFiles([tmp]);
  const findings = [], ext = [];
  for (const m of result.messages) {
    const name = (m.message.match(/'([^']+)'/) || [])[1];
    const line = m.line + lineOffset;
    const entry = `index.html:${line}:${m.column}  ${m.ruleId}  ${m.message}`;
    if (m.ruleId === 'no-unused-vars' && name && external.has(name)) ext.push(entry); else findings.push(entry);
  }
  for (const f of findings) console.log(f);
  if (process.argv.includes('--all')) { console.log('\n-- external (used from HTML/tests) --'); for (const e of ext) console.log(e); }
  console.log(`\n${findings.length} finding(s), ${ext.length} external-only name(s)`);
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  process.exit(findings.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
