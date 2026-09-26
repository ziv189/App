#!/usr/bin/env node
/**
 * Downloads Poly Haven assets (CC0, https://polyhaven.com) used by the room build scripts:
 *   models   -> assets-src/downloads/polyhaven/models/<id>/<id>_<res>.gltf (+ .bin + textures/)
 *   textures -> assets-src/downloads/polyhaven/textures/<id>/<id>_<map>_<res>.jpg
 *   hdris    -> assets-src/downloads/polyhaven/hdris/<id>_<res>.hdr
 *
 *   node tools/fetch-polyhaven.mjs            (everything listed in assets-src/polyhaven.json)
 *   node tools/fetch-polyhaven.mjs --list     (print what is listed)
 *
 * Files already downloaded (same size) are skipped, so re-running is cheap.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets-src', 'downloads', 'polyhaven');
const MANIFEST = join(ROOT, 'assets-src', 'polyhaven.json');

async function json(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'night-mode-asset-fetch/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function download(url, path, size) {
  try {
    if ((await stat(path)).size === size) return false;
  } catch {
    /* not downloaded yet */
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buf);
      return true;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
}

async function fetchModel(id, res) {
  const files = await json(`https://api.polyhaven.com/files/${id}`);
  const entry = files.gltf?.[res]?.gltf ?? files.gltf?.['1k']?.gltf;
  if (!entry) throw new Error(`${id}: no glTF download`);
  const dir = join(OUT, 'models', id);
  let n = 0;
  n += Number(await download(entry.url, join(dir, `${id}.gltf`), entry.size));
  for (const [rel, f] of Object.entries(entry.include ?? {})) n += Number(await download(f.url, join(dir, rel), f.size));
  return n;
}

async function fetchTexture(id, res, maps) {
  const files = await json(`https://api.polyhaven.com/files/${id}`);
  const dir = join(OUT, 'textures', id);
  let n = 0;
  for (const map of maps) {
    const f = files[map]?.[res]?.jpg ?? files[map]?.[res]?.png;
    if (!f) {
      console.warn(`  ${id}: no ${map} map at ${res}`);
      continue;
    }
    const ext = f.url.split('.').pop();
    n += Number(await download(f.url, join(dir, `${id}_${map}_${res}.${ext}`), f.size));
  }
  return n;
}

async function fetchHdri(id, res) {
  const files = await json(`https://api.polyhaven.com/files/${id}`);
  const f = files.hdri?.[res]?.hdr;
  if (!f) throw new Error(`${id}: no ${res} HDR`);
  return Number(await download(f.url, join(OUT, 'hdris', `${id}_${res}.hdr`), f.size));
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  if (process.argv.includes('--list')) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  const jobs = [
    ...manifest.models.map((m) => [`model ${m.id}`, () => fetchModel(m.id, m.res ?? '1k')]),
    ...manifest.textures.map((t) => [`texture ${t.id}`, () => fetchTexture(t.id, t.res ?? '1k', t.maps ?? ['Diffuse', 'nor_gl', 'Rough'])]),
    ...manifest.hdris.map((h) => [`hdri ${h.id}`, () => fetchHdri(h.id, h.res ?? '2k')]),
  ];
  // A few downloads at a time: fast, but polite to the CDN.
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const [label, job] = jobs[next++];
      const n = await job();
      console.log(`${label}: ${n ? `${n} file(s) downloaded` : 'up to date'}`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
