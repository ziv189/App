#!/usr/bin/env node
/**
 * Packages the game as a claude.ai Artifact (a private web page): one HTML fragment plus the files it
 * loads, written to dist-artifact/.
 *
 *   npm run build:artifact
 *
 * - Builds with VITE_PACKED_ASSETS=1 into dist-packed/: the host only serves standard web file types,
 *   so .glb, .hdr and .exr files ship as base64 text (.b64.txt) that the game decodes (see src/assets/Assets.ts).
 * - The host wraps the page in its own <html>/<head>/<body>, so this keeps the title, inlines the
 *   stylesheet, and keeps the markup and scripts.
 * Prints a JSON manifest of { publishedPath: { from, contentType } } for the publish call.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist-packed');
const OUT = join(ROOT, 'dist-artifact');
const TITLE = 'SOSIES Tech Test';

const CONTENT_TYPES = {
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
};
const PACK = /\.(glb|hdr|exr)$/i;
const TEXT_LIMIT = 16 * 1024 * 1024;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function build() {
  const windows = process.platform === 'win32';
  const args = ['vite', 'build', '--outDir', 'dist-packed', '--emptyOutDir'];
  const result = spawnSync(windows ? 'npx.cmd' : 'npx', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: windows,
    env: { ...process.env, VITE_PACKED_ASSETS: '1' },
  });
  if (result.status !== 0) throw new Error('vite build failed');
}

async function main() {
  build();
  let html = await readFile(join(DIST, 'index.html'), 'utf8');

  // Inline the stylesheet(s).
  const cssLinks = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g)];
  let css = '';
  for (const [tag, path] of cssLinks) {
    css += await readFile(join(DIST, path), 'utf8');
    html = html.replace(tag, '');
  }
  const entry = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/);
  if (!entry) throw new Error('No module entry script found in dist/index.html');
  const body = html.match(/<body>([\s\S]*)<\/body>/);
  if (!body) throw new Error('No <body> in dist/index.html');

  const fragment = [
    `<title>${TITLE}</title>`,
    `<style>\n${css}\n</style>`,
    body[1].trim(),
    `<script type="module" src="./${entry[1]}"></script>`,
    '',
  ].join('\n');

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'index.html'), fragment);

  // Everything the page loads at runtime lives under dist/assets (scripts, decoders, the test room).
  const manifest = {};
  let total = 0;
  for await (const file of walk(join(DIST, 'assets'))) {
    let published = relative(DIST, file).split(sep).join('/');
    if (published.endsWith('.css') || published.endsWith('.md')) continue;
    const target = () => join(OUT, published);
    if (PACK.test(published)) {
      published += '.b64.txt';
      await mkdir(dirname(target()), { recursive: true });
      await writeFile(target(), (await readFile(file)).toString('base64'));
    } else {
      await mkdir(dirname(target()), { recursive: true });
      await cp(file, target());
    }
    const contentType = CONTENT_TYPES[published.slice(published.lastIndexOf('.'))];
    if (!contentType) throw new Error(`No served content type for ${published}`);
    const size = (await stat(target())).size;
    if (size > TEXT_LIMIT) throw new Error(`${published} is over the 16 MB per-file limit`);
    total += size;
    manifest[published] = { from: published, contentType };
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  console.error(`\n${Object.keys(manifest).length} files, ${(total / 1024 / 1024).toFixed(1)} MB -> ${OUT}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
