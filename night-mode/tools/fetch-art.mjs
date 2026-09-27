#!/usr/bin/env node
/**
 * Downloads the paintings hung in the house (public domain, from Wikimedia Commons), listed in
 * assets-src/art.json, into assets-src/downloads/art/<id>.jpg (longest side 1024 px).
 *
 *   node tools/fetch-art.mjs
 *
 * Each file's licence is checked against Commons' own metadata: anything that isn't public domain or
 * CC0 stops the fetch. Files already downloaded are skipped.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets-src', 'downloads', 'art');
const MANIFEST = join(ROOT, 'assets-src', 'art.json');
// Wikimedia asks API clients to identify themselves
const UA = 'NightModeGame/1.0 (asset fetch; https://github.com/ziv189/App)';
const MAX = 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return as === 'json' ? res.json() : Buffer.from(await res.arrayBuffer());
    if (attempt >= 5) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(2000 * 2 ** attempt);
  }
}

async function fetchArt(item) {
  const path = join(OUT, `${item.id}.jpg`);
  try {
    await stat(path);
    return false;
  } catch {
    /* not downloaded yet */
  }
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    titles: item.file,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1280',
    format: 'json',
  }).toString();
  const page = Object.values((await get(api, 'json')).query.pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`${item.id}: ${item.file} not found on Commons`);
  const licence = info.extmetadata?.LicenseShortName?.value ?? '';
  if (!/^(public domain|cc0)/i.test(licence)) throw new Error(`${item.id}: licence is "${licence}", not public domain`);
  const image = await get(info.thumburl ?? info.url);
  const jpg = await sharp(image).resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  await mkdir(OUT, { recursive: true });
  await writeFile(path, jpg);
  return true;
}

async function main() {
  const { art } = JSON.parse(await readFile(MANIFEST, 'utf8'));
  for (const item of art) {
    const fetched = await fetchArt(item);
    console.log(`${item.id}: ${fetched ? 'downloaded' : 'up to date'}`);
    if (fetched) await sleep(1000);
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
