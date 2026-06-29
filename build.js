// SKKJ Autopart — pre-compile JSX build script
// Run: node build.js
// Reads index.html, compiles JSX to plain JS, writes compiled index.html

const fs = require('fs');
const babel = require('@babel/core');

function buildFile(srcPath, destPath) {
  console.log(`Building ${srcPath}...`);
  const html = fs.readFileSync(srcPath, 'utf8');

  const OPEN_TAG = '<script type="text/babel" data-presets="react">';
  const CLOSE_TAG = '</script>';
  const BABEL_CDN = '<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>';

  const startIdx = html.indexOf(OPEN_TAG);
  if (startIdx === -1) {
    console.error('ERROR: Could not find Babel script tag in ' + srcPath);
    process.exit(1);
  }

  const contentStart = startIdx + OPEN_TAG.length;
  const endIdx = html.indexOf(CLOSE_TAG, contentStart);
  const jsxCode = html.slice(contentStart, endIdx);

  console.log(`  Extracted ${jsxCode.length} chars of JSX`);

  const result = babel.transformSync(jsxCode, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    filename: 'app.jsx',
    compact: false,
  });

  console.log(`  Compiled to ${result.code.length} chars of JS`);

  let output = html;
  // Remove Babel CDN script tag
  output = output.replace(BABEL_CDN, '');
  // Replace JSX script with compiled JS
  output = output.replace(
    OPEN_TAG + jsxCode + CLOSE_TAG,
    '<script>\n' + result.code + '\n</script>'
  );

  fs.writeFileSync(destPath, output);
  console.log(`  Written to ${destPath}`);
}

// Build both main files (they are identical so compile once, copy twice)
buildFile('skkj-version-2.html', 'dist/skkj-version-2.html');
fs.copyFileSync('dist/skkj-version-2.html', 'dist/index.html');
console.log('  Copied to dist/index.html');

// Phone preview — compile separately (slightly different content)
buildFile('skkj-version-2-phone-preview.html', 'dist/skkj-version-2-phone-preview.html');

console.log('\nBuild complete!');
