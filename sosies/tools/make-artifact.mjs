#!/usr/bin/env node
/**
 * Packages the production build (dist/) as a claude.ai Artifact: one HTML fragment plus the files it
 * loads, written to dist-artifact/. The Artifact host wraps the page in its own <html>/<head>/<body>,
 * so this keeps only the title, inlines the stylesheet, and keeps the scripts and markup.
 *
 *   npm run build && node tools/make-artifact.mjs
 *
 * Prints a JSON manifest of { publishedPath: { from, contentType } } for the publish call.
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'dist-artifact');
const TITLE = 'SOSIES Tech Test';

const CONTENT_TYPES = {
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
};

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

async function main() {
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
    const published = relative(DIST, file).split(sep).join('/');
    if (published.endsWith('.css') || published.endsWith('.md')) continue;
    const ext = published.slice(published.lastIndexOf('.'));
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) throw new Error(`No content type for ${published}`);
    const size = (await stat(file)).size;
    if (size > 15 * 1024 * 1024) throw new Error(`${published} is over the 15 MB per-file limit`);
    total += size;
    await mkdir(dirname(join(OUT, published)), { recursive: true });
    await cp(file, join(OUT, published));
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
