/* Bundle the game into one self-contained HTML file that works when opened alone.
   Usage: node game/tools/bundle.js  ->  writes game/the-frozen-hour.html
   Reads the script tags from game/index.html and inlines every referenced script in the same order. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const outPath = path.join(root, 'the-frozen-hour.html');

const html = fs.readFileSync(indexPath, 'utf8');
const missing = [];
const bundled = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, src) => {
  const file = path.join(root, src);
  if (!fs.existsSync(file)) { missing.push(src); return ''; }
  // Guard against a stray closing script tag inside the file.
  const code = fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${src} */\n${code}\n</script>`;
});

if (missing.length) {
  console.log('ERROR: missing scripts: ' + missing.join(', '));
  process.exit(1);
}
fs.writeFileSync(outPath, bundled);
console.log('wrote ' + path.relative(process.cwd(), outPath) + ' (' + Math.round(bundled.length / 1024) + ' KB)');
