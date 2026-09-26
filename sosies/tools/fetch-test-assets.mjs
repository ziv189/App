#!/usr/bin/env node
/**
 * Downloads the Milestone 0 TECH TEST assets and makes them web-ready.
 *
 *   npm run assets:test            (skips files that are already there)
 *   npm run assets:test -- --force (downloads and rebuilds everything)
 *
 * These are NOT game content. They exist only to test the engine (movement, collision, lighting,
 * post-processing, performance) until the first real SOSIES location lands. They are downloaded on
 * your machine from the original publishers, never committed to git and never shipped.
 *
 *  - Sponza (Crytek, Khronos glTF-Sample-Assets): standard real-time lighting test scene.
 *    License: CRYENGINE Limited License Agreement (evaluation use; do not redistribute).
 *  - "Kloppenheim 01 (Pure Sky)" HDRI by Greg Zaal & Jarod Guest, Poly Haven. License: CC0.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimizeGltf, report } from './optimize-gltf.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'tech-test');
const OUT = join(ROOT, 'public', 'assets', 'tech-test');
const FORCE = process.argv.includes('--force');

// Pinned to a commit so the download never changes under us.
const KHRONOS_COMMIT = 'c6a6bd13ab2b3c685c7903d03561b8a9392f38b8';
const SPONZA_BASE = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${KHRONOS_COMMIT}/Models/Sponza/glTF/`;
const SKY = {
  url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloppenheim_01_puresky_2k.hdr',
  md5: '6b67f5415b20db8649d68e238a376a8c',
  file: 'sky_2k.hdr',
};

const CREDITS = `# TECH TEST assets (not game content, never shipped)

Downloaded by \`npm run assets:test\`. Do not commit or redistribute.

- **Sponza**: Crytek, modified by Morgan McGuire; PBR textures by Alexandre Pestana; glTF by Khronos.
  Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/${KHRONOS_COMMIT}/Models/Sponza
  License: CRYENGINE Limited License Agreement.
- **Kloppenheim 01 (Pure Sky)** HDRI: Greg Zaal & Jarod Guest, Poly Haven.
  Source: https://polyhaven.com/a/kloppenheim_01_puresky
  License: CC0.
`;

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function download(url, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw lastError;
}

async function fetchTo(url, path) {
  if (!FORCE && existsSync(path)) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await download(url));
  return true;
}

/** Runs async jobs with limited parallelism. */
async function pool(items, size, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

async function fetchSponza() {
  const dir = join(CACHE, 'sponza');
  const gltfPath = join(dir, 'Sponza.gltf');
  await fetchTo(`${SPONZA_BASE}Sponza.gltf`, gltfPath);
  const gltf = JSON.parse(await readFile(gltfPath, 'utf8'));
  const uris = [...(gltf.buffers ?? []), ...(gltf.images ?? [])]
    .map((x) => x.uri)
    .filter((uri) => uri && !uri.startsWith('data:'));
  let done = 0;
  await pool(uris, 6, async (uri) => {
    // URIs in glTF are URL-encoded; decode for the file name, keep encoded for the request.
    const fresh = await fetchTo(new URL(uri, SPONZA_BASE).href, join(dir, decodeURIComponent(uri)));
    done++;
    if (fresh || done === uris.length) process.stdout.write(`\r  Sponza files: ${done}/${uris.length}   `);
  });
  process.stdout.write('\n');
  return gltfPath;
}

async function fetchSky() {
  const path = join(OUT, SKY.file);
  if (!FORCE && existsSync(path)) {
    console.log('  Sky HDRI: already downloaded');
    return;
  }
  const data = await download(SKY.url);
  const md5 = createHash('md5').update(data).digest('hex');
  if (md5 !== SKY.md5) throw new Error(`Sky HDRI checksum mismatch (got ${md5}). Try again with --force.`);
  await mkdir(OUT, { recursive: true });
  await writeFile(path, data);
  console.log(`  Sky HDRI: ${mb(data.length)} (checksum OK)`);
}

async function main() {
  console.log('SOSIES — fetching TECH TEST assets (not game content)\n');
  if (FORCE) await rm(CACHE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  console.log('1/3 Downloading Sponza from Khronos glTF-Sample-Assets ...');
  const gltfPath = await fetchSponza();

  console.log('2/3 Downloading sky HDRI from Poly Haven ...');
  await fetchSky();

  const glbPath = join(OUT, 'sponza.glb');
  if (!FORCE && existsSync(glbPath)) {
    console.log('3/3 Optimized Sponza already built (use --force to rebuild)');
  } else {
    console.log('3/3 Optimizing Sponza for the browser (WebP textures, meshopt geometry) ...');
    // Sponza is static scenery, so joining meshes by material is safe and saves draw calls.
    const doc = await optimizeGltf(gltfPath, glbPath, { join: true, maxTexture: 2048, maxNormal: 2048 });
    console.log(await report(doc, glbPath));
  }
  await writeFile(join(OUT, 'CREDITS.md'), CREDITS);
  console.log(`\n✔ Tech test assets ready in ${OUT}\n  Next: npm run dev`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
    console.error('  You seem to be behind a proxy. Retry with NODE_USE_ENV_PROXY=1 set.');
  }
  console.error('  Check your internet connection and run the command again; finished files are kept.');
  process.exit(1);
});
