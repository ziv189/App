#!/usr/bin/env node
/**
 * Rebuilds the TECH TEST room from its original downloads.
 *
 * You don't need to run this: the finished files (public/assets/tech-test/) are already in the
 * repository. This script records exactly how they were made, so they can be reproduced or tweaked.
 *
 *   npm run assets:test-room                     (reuses earlier downloads)
 *   npm run assets:test-room -- --force          (downloads everything again)
 *   npm run assets:test-room -- --no-bake        (skip Blender; the game then uses real-time lights)
 *   npm run assets:test-room -- --samples 256 --size 2048 --device OPTIX   (bake settings)
 *
 * Baking needs Blender 4.5 LTS (https://www.blender.org/download/lts/4-5/). It is found on the PATH,
 * in its default install folder, or wherever the BLENDER environment variable points.
 *
 * Sources (both licenses allow redistribution):
 *  - "Living Room" (originally "The White Room Cycles") by Jay-Artist on Blend Swap, CC BY 3.0.
 *    OBJ conversion by Benedikt Bitterli, Nicholas Hull (NVIDIA) and Morgan McGuire, from the
 *    McGuire Computer Graphics Archive (https://casual-effects.com/data).
 *  - "Kloppenheim 01 (Pure Sky)" HDRI by Greg Zaal and Jarod Guest, Poly Haven, CC0.
 *
 * Steps: download + verify -> unzip -> fix texture paths -> OBJ to glTF (obj2gltf, fetched on demand
 * with npx) -> remove the render-only light panels and close the back-wall opening -> bake lighting
 * in Blender (tools/blender/bake_lightmaps.py with rigs/living-room.json) -> optimize.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { editGltf, optimizeGltf, report } from './lib/gltf.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'test-room');
const OUT = join(ROOT, 'public', 'assets', 'tech-test');
const FORCE = process.argv.includes('--force');
const BAKE = !process.argv.includes('--no-bake');
const option = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BAKE_SIZE = option('size', '2048');
const BAKE_SAMPLES = option('samples', '64');
const BAKE_DEVICE = option('device', 'CPU');
const LIGHTMAP_FILE = 'living-room-lightmap.exr';

const ROOM = {
  url: 'https://casual-effects.com/g3d/data10/research/model/living_room/living_room.zip',
  sha256: 'f14daf4f566871e18c262a450db9ae0285b7124e93e05b3a8bfbcbf674a21aeb',
};
const SKY = {
  url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloppenheim_01_puresky_2k.hdr',
  md5: '6b67f5415b20db8649d68e238a376a8c',
  file: 'sky-dusk-2k.hdr',
};
const OBJ2GLTF = 'obj2gltf@3.2.0';

export const CREDITS = `# TECH TEST assets (not SOSIES game content)

Used only to test the engine until the first real SOSIES location replaces them.
Rebuild with \`npm run assets:test-room\` (see tools/build-test-room.mjs).

- **living-room.glb**: "Living Room" (originally "The White Room Cycles") by Jay-Artist,
  https://www.blendswap.com/blends/view/41683, licensed CC BY 3.0
  (https://creativecommons.org/licenses/by/3.0/). OBJ conversion by Benedikt Bitterli,
  Nicholas Hull (NVIDIA) and Morgan McGuire, McGuire Computer Graphics Archive
  (https://casual-effects.com/data). Changes: converted to glTF, render-only light panels removed,
  back-wall opening closed, textures converted to WebP, geometry compressed.
- **sky-dusk-2k.hdr**: "Kloppenheim 01 (Pure Sky)" by Greg Zaal and Jarod Guest,
  https://polyhaven.com/a/kloppenheim_01_puresky, CC0.
`;

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

async function cachedDownload(url, path, hash, algorithm) {
  if (!FORCE && existsSync(path)) return readFile(path);
  const data = await download(url);
  const actual = createHash(algorithm).update(data).digest('hex');
  if (actual !== hash) throw new Error(`Checksum mismatch for ${url} (got ${actual}). Try again with --force.`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  return data;
}

/** Runs a command, quoting arguments for the Windows shell (paths may contain spaces). */
function run(command, args) {
  const windows = process.platform === 'win32';
  const result = windows
    ? spawnSync([`"${command}"`, ...args.map((a) => `"${a}"`)].join(' '), { stdio: 'inherit', shell: true })
    : spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args[0] ?? ''} failed`);
}

function findBlender() {
  if (process.env.BLENDER) return process.env.BLENDER;
  const candidates = {
    win32: ['C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe'],
    darwin: ['/Applications/Blender.app/Contents/MacOS/Blender'],
  }[process.platform] ?? [];
  return candidates.find((path) => existsSync(path)) ?? 'blender';
}

/** Removes the emissive panels the original renders used as area lights and closes the back wall. */
function cleanUpRoom(doc) {
  const root = doc.getRoot();
  const walls = root.listMaterials().find((m) => m.getName() === 'Walls');
  if (!walls) throw new Error('Expected a "Walls" material in the living room model.');
  // Behind the original camera there is a lit panel instead of a wall; paint it as wall, both sides.
  const patch = walls.clone().setName('BackWallPatch').setDoubleSided(true);
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const name = prim.getMaterial()?.getName() ?? '';
      if (name === 'BackLight') prim.setMaterial(patch);
      else if (/Light$/.test(name)) prim.dispose(); // panels outside the windows
    }
  }
}

async function main() {
  console.log('SOSIES - building the TECH TEST room (not game content)\n');
  if (FORCE) await rm(CACHE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  console.log('1/5 Downloading "Living Room" from the McGuire Computer Graphics Archive ...');
  const zip = await cachedDownload(ROOM.url, join(CACHE, 'living_room.zip'), ROOM.sha256, 'sha256');

  console.log('2/5 Unpacking and converting OBJ to glTF (first run fetches obj2gltf, about 130 MB) ...');
  const dir = join(CACHE, 'living_room');
  for (const [name, bytes] of Object.entries(unzipSync(new Uint8Array(zip)))) {
    if (name.endsWith('/')) continue;
    const path = join(dir, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  // The material file uses Windows-style texture paths; normalize them.
  const mtlPath = join(dir, 'living_room.mtl');
  await writeFile(mtlPath, (await readFile(mtlPath, 'utf8')).replace(/\\/g, '/'));
  const rawGlb = join(dir, 'living_room.glb');
  run('npx', ['--yes', OBJ2GLTF, '-i', join(dir, 'living_room.obj'), '-o', rawGlb]);
  const cleanGlb = join(CACHE, 'living_room.clean.glb');
  await editGltf(rawGlb, cleanGlb, cleanUpRoom);

  console.log('3/5 Downloading the sky HDRI from Poly Haven ...');
  const sky = await cachedDownload(SKY.url, join(CACHE, SKY.file), SKY.md5, 'md5');
  await writeFile(join(OUT, SKY.file), sky);

  let source = cleanGlb;
  if (BAKE) {
    console.log(`4/5 Baking lighting in Blender (${BAKE_SIZE}px lightmap, ${BAKE_SAMPLES} samples; takes a few minutes) ...`);
    const bakedGlb = join(CACHE, 'living_room.baked.glb');
    try {
      run(findBlender(), [
        '--background',
        '--factory-startup',
        '--python',
        join(ROOT, 'tools', 'blender', 'bake_lightmaps.py'),
        '--',
        '--input',
        cleanGlb,
        '--output',
        bakedGlb,
        '--lightmap',
        join(OUT, LIGHTMAP_FILE),
        '--rig',
        join(ROOT, 'tools', 'blender', 'rigs', 'living-room.json'),
        '--size',
        BAKE_SIZE,
        '--samples',
        BAKE_SAMPLES,
        '--device',
        BAKE_DEVICE,
      ]);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          'Blender was not found. Install Blender 4.5 LTS, or set BLENDER to its path, or run with --no-bake.',
        );
      }
      throw err;
    }
    source = bakedGlb;
  } else {
    console.log('4/5 Skipping the lighting bake (--no-bake): the game will use real-time lights.');
    await rm(join(OUT, LIGHTMAP_FILE), { force: true });
  }

  console.log('5/5 Optimizing for the browser (WebP textures, meshopt geometry) ...');
  const glbPath = join(OUT, 'living-room.glb');
  // Static scenery: joining meshes by material saves draw calls. The scene extras tell the game
  // which lightmap belongs to this model.
  const doc = await optimizeGltf(source, glbPath, {
    join: true,
    edit: (d) => {
      if (BAKE) d.getRoot().listScenes()[0].setExtras({ sosies: { lightmap: LIGHTMAP_FILE, lightmapIntensity: 1 } });
    },
  });
  console.log(await report(doc, glbPath));

  await writeFile(join(OUT, 'CREDITS.md'), CREDITS);
  console.log(`\nDONE: files are in ${OUT}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
    console.error('  You seem to be behind a proxy. Retry with NODE_USE_ENV_PROXY=1 set.');
  }
  process.exit(1);
});
