/**
 * SKKJ Autopart — Production Build Script
 *
 * Reads skkj-version-2.html (the editable source with type="text/babel"),
 * compiles the JSX to plain JS using esbuild, and writes:
 *   - bundle.js                        (compiled, minified JS)
 *   - index.html                       (Babel CDN removed, loads bundle.js)
 *   - skkj-version-2-phone-preview.html (same as index.html)
 *
 * Run: node build.mjs
 *
 * After building, upload index.html, skkj-version-2-phone-preview.html,
 * and bundle.js to GitHub alongside your assets/ folder.
 * The live site will load in ~80% less time — no more in-browser Babel.
 */

import { transform } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const SOURCE   = 'skkj-version-2.html';
const BUNDLE   = 'bundle.js';
const OUT_HTML = ['index.html', 'skkj-version-2-phone-preview.html'];

async function build() {
  console.log('Reading source…');
  const src = readFileSync(SOURCE, 'utf-8');

  // ── 1. Extract JSX from <script type="text/babel"> ──────────────────────
  const babelTagStart   = src.indexOf('<script type="text/babel"');
  const contentStart    = src.indexOf('>', babelTagStart) + 1;
  const contentEnd      = src.lastIndexOf('</script>');

  if (babelTagStart === -1) {
    throw new Error('No <script type="text/babel"> found in ' + SOURCE);
  }

  const jsxContent = src.slice(contentStart, contentEnd);
  console.log(`Extracted ${(jsxContent.length / 1024).toFixed(0)} KB of JSX source.`);

  // ── 2. Compile JSX → plain JS (transform only, no bundling) ─────────────
  // React / ReactDOM / supabase / QRCode stay as CDN globals — esbuild
  // is only doing the JSX syntax transform and minification here.
  const { code, warnings } = await transform(jsxContent, {
    loader       : 'jsx',
    jsxFactory   : 'React.createElement',
    jsxFragment  : 'React.Fragment',
    minify       : true,
    target       : 'es2017',   // Chrome 61+, Safari 11+, Firefox 60+ — all fine
    logLevel     : 'warning',
  });

  if (warnings.length) {
    warnings.forEach(w => console.warn('esbuild warning:', w.text));
  }

  writeFileSync(BUNDLE, code);
  const bundleKB = (code.length / 1024).toFixed(1);
  console.log(`✓ bundle.js  — ${bundleKB} KB minified`);

  // ── 3. Build the HTML ────────────────────────────────────────────────────
  // Remove the Babel CDN <script> tag entirely and replace the big inline
  // babel script with a one-liner that loads the pre-built bundle.
  const builtHtml = src
    // Drop the Babel standalone CDN tag (±1 line, any whitespace around it)
    .replace(/[ \t]*<script[^>]*@babel\/standalone[^>]*><\/script>\n?/g, '')
    // Replace <script type="text/babel" ...>…entire file…</script></body></html>
    // with a simple <script src="bundle.js"> reference
    .replace(
      /<script type="text\/babel"[^>]*>[\s\S]*/,
      '<script src="bundle.js"></script>\n</body></html>\n'
    );

  // Sanity checks before writing
  if (builtHtml.includes('@babel/standalone')) {
    throw new Error('Babel CDN reference still present in built HTML — check regex.');
  }
  if (builtHtml.includes('text/babel')) {
    throw new Error('text/babel still present in built HTML — check regex.');
  }
  if (!builtHtml.includes('<script src="bundle.js">')) {
    throw new Error('bundle.js reference missing in built HTML — check regex.');
  }
  if (!builtHtml.trim().endsWith('</html>')) {
    throw new Error('Built HTML does not end with </html>.');
  }

  for (const outFile of OUT_HTML) {
    writeFileSync(outFile, builtHtml);
    console.log(`✓ ${outFile}`);
  }

  // ── 4. Summary ───────────────────────────────────────────────────────────
  const srcKB    = (src.length / 1024).toFixed(0);
  const babKB    = 1450;   // approximate size of @babel/standalone
  const savedKB  = (babKB + Number(srcKB) - Number(bundleKB)).toFixed(0);

  console.log('\nBuild complete!');
  console.log(`  Before: ~${srcKB} KB raw JSX  +  ~${babKB} KB Babel runtime  =  ~${(Number(srcKB)+babKB)} KB downloaded per visit`);
  console.log(`  After:  ${bundleKB} KB bundle.js  (Babel no longer needed)`);
  console.log(`  Saved:  ~${savedKB} KB per page load  —  no more in-browser transpilation warning`);
}

build().catch(err => {
  console.error('\nBuild FAILED:', err.message);
  process.exit(1);
});
