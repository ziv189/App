// Bundles src/*.js into a single self-contained page.
//   index.html          — standalone document (open directly in a browser)
//   dist/artifact.html  — same page without the document wrapper (for hosting that adds one)
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const order = ['assets.js', 'core.js', 'gfx.js', 'rig.js', 'actors.js', 'levels.js', 'sim.js', 'enemies.js', 'mech.js', 'boss.js', 'story.js', 'render.js', 'main.js'];
const bundle = order.map((f) => `// ---- ${f} ----\n` + fs.readFileSync(path.join(dir, 'src', f), 'utf8')).join('\n');
const shell = fs.readFileSync(path.join(dir, 'src', 'shell.html'), 'utf8');
const page = shell.replace('/*__BUNDLE__*/', () => bundle.replace(/<\/script/gi, '<\\/script'));
fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist', 'artifact.html'), page);
const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${page.replace(/<div id="stage">[\s\S]*$/, '')}</head>\n<body>\n${page.slice(page.indexOf('<div id="stage">'))}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(dir, 'index.html'), full);
console.log('built', (full.length / 1024).toFixed(1) + ' KB');
