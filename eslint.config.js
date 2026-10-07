/* Dev-only ESLint flat config for the inline <script> in index.html.
   No runtime effect; run via `node tests/lint.cjs` (which extracts the script to a temp .js file).
   Browser globals are listed by hand (no `globals` package needed) and every element id in
   index.html is a global too, since the game addresses elements as `window[id]`. */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ids = {};
for (const m of html.matchAll(/\sid="([A-Za-z_$][\w$]*)"/g)) ids[m[1]] = 'readonly';

const browser = {};
for (const g of [
  'window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage',
  'console', 'alert', 'confirm', 'prompt', 'fetch', 'Headers', 'Request', 'Response', 'URL', 'URLSearchParams',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'queueMicrotask', 'performance', 'crypto', 'btoa', 'atob', 'TextEncoder', 'TextDecoder', 'Blob', 'FileReader',
  'Image', 'ImageData', 'OffscreenCanvas', 'createImageBitmap', 'Audio', 'AudioContext', 'webkitAudioContext',
  'HTMLElement', 'HTMLInputElement', 'SVGElement', 'Element', 'Node', 'NodeList', 'Event', 'CustomEvent',
  'PointerEvent', 'TouchEvent', 'MouseEvent', 'KeyboardEvent', 'DOMParser', 'XMLSerializer', 'MutationObserver',
  'ResizeObserver', 'IntersectionObserver', 'matchMedia', 'getComputedStyle', 'devicePixelRatio', 'innerWidth',
  'innerHeight', 'visualViewport', 'scrollTo', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'CompressionStream',
  'DecompressionStream', 'structuredClone', 'ServiceWorker', 'caches', 'self', 'globalThis', 'CSS',
  'DOMRect', 'MediaQueryList', 'Path2D', 'CanvasRenderingContext2D', 'open', 'close', 'focus', 'blur',
]) browser[g] = 'readonly';

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...browser, ...ids } },
    rules: {
      'no-unused-vars': ['warn', { vars: 'all', args: 'none', caughtErrors: 'none' }],
      'no-undef': 'warn',
      'no-redeclare': ['warn', { builtinGlobals: false }],
      'no-dupe-keys': 'warn',
      'no-unreachable': 'warn',
      'no-dupe-else-if': 'warn',
      'no-duplicate-case': 'warn',
      'no-self-assign': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'],
    },
  },
];
