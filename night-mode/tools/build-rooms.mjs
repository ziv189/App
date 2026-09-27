#!/usr/bin/env node
/**
 * Builds the rooms of the house: Blender (dress, collision, bake) then glTF-Transform (compress).
 *
 *   node tools/build-rooms.mjs hall kitchen          (specific rooms)
 *   node tools/build-rooms.mjs --all                 (every room)
 *   options: --no-bake (layout only), --optimize-only (skip Blender), --samples 64, --size 2048
 *
 * Needs Blender 4.5 LTS (set BLENDER=/path/to/blender if it isn't on the PATH) and the source
 * downloads (tools/fetch-sources.mjs). Output: public/assets/rooms/<room>.glb + <room>-<state>.exr
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimizeGltf, report } from './lib/gltf.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = ['hall', 'living', 'kitchen', 'bedroom', 'bathroom', 'ivy', 'basement', 'exterior'];
/** Texture size limits per room (name pattern, max px): GPU memory adds up across eight rooms. */
/** Small props set on furniture: seen from a metre or more, never full screen. */
const SMALL_PROPS = /(candlestick|chess_set|book_encyclopedia|ceramic_vase|antique_ceramic|picture_frame|oil_lamp|tea_set|jug_01|wooden_bowl|wicker_basket|telephone_wall|planter_pot|bananas|food_apple|Ukulele|rubber_duck|elephant|alarm_clock|mantel_clock)/;
/** Poly Haven props' normal and roughness/metal maps: half their colour map is plenty indoors. */
const PROP_MAPS = /_(nor_gl|arm)_[124]k/;
const INTERIOR_CAPS = [[/(floor|Floor|wall|Wall|WoodPanel|Parquet|Tiles)/, 2048], [SMALL_PROPS, 512], [PROP_MAPS, 512], [/./, 1024]];
const TEXTURE_CAPS = {
  exterior: [[/tree_atlas/, 2048], [/(snow_0[23]|pier|wood_floor)/, 1024], [/./, 512]],
  hall: INTERIOR_CAPS,
  living: INTERIOR_CAPS,
  kitchen: INTERIOR_CAPS,
  bedroom: INTERIOR_CAPS,
  bathroom: [[SMALL_PROPS, 512], [PROP_MAPS, 512], [/./, 1024]],
  ivy: [[SMALL_PROPS, 512], [PROP_MAPS, 512], [/./, 1024]],
  basement: [[/./, 1024]],
};

function blender() {
  if (process.env.BLENDER) return process.env.BLENDER;
  const candidates = [
    'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
    '/Applications/Blender.app/Contents/MacOS/Blender',
    join(ROOT, '.cache', 'blender', 'blender'),
  ];
  return candidates.find((c) => existsSync(c)) ?? 'blender';
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const value = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
  const rooms = flag('--all') ? ALL : args.filter((a) => ALL.includes(a));
  if (!rooms.length) {
    console.log(`Usage: node tools/build-rooms.mjs <${ALL.join('|')}>... | --all [--no-bake] [--optimize-only]`);
    process.exit(1);
  }
  for (const room of rooms) {
    if (!flag('--optimize-only')) {
      console.log(`\n=== ${room}: Blender build`);
      const pyArgs = ['--background', '--factory-startup', '--python', join(ROOT, 'tools', 'blender', 'build_room.py'), '--',
        '--room', room, '--samples', value('--samples', '64')];
      if (value('--size')) pyArgs.push('--size', value('--size'));
      if (flag('--no-bake')) pyArgs.push('--no-bake');
      let r = spawnSync(blender(), pyArgs, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 1 << 28 });
      // Blender 4.5's Cycles now and then crashes (SIGSEGV) while it loads a scene to bake, and the
      // same scene bakes fine the next time: try again before giving up
      for (let attempt = 2; r.signal === 'SIGSEGV' && attempt <= 3; attempt++) {
        console.log(`Blender crashed (${r.signal}); trying again (${attempt} of 3)`);
        r = spawnSync(blender(), pyArgs, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 1 << 28 });
      }
      for (const line of (r.stdout ?? '').split('\n')) if (/^\[(room|bake)\]|Error|Traceback/.test(line)) console.log(line);
      if (r.status !== 0) {
        const tail = (r.stdout ?? '').trim().split('\n').slice(-25).join('\n');
        throw new Error(`Blender failed for ${room} (${r.error?.message ?? (r.signal ? `killed by ${r.signal}` : `exit code ${r.status}`)}). Last output:\n${tail}`);
      }
    }
    console.log(`=== ${room}: optimize`);
    const input = join(ROOT, 'assets-src', 'work', `${room}-baked.glb`);
    const output = join(ROOT, 'public', 'assets', 'rooms', `${room}.glb`);
    const doc = await optimizeGltf(input, output, {
      maxTexture: 2048, maxNormal: 1024, quality: 86, keepLeaves: true, textureCaps: TEXTURE_CAPS[room],
      // the garden is 480 m across: at 14 bits its grid is 3 cm, coarser than the paths' 1.5 cm lift
      // over the snow (they flickered), so it gets 16 bits (7 mm)
      positionBits: room === 'exterior' ? 16 : 14,
      // the collision mesh only needs its shape
      edit: (d) => {
        for (const node of d.getRoot().listNodes()) {
          if (node.getName() !== 'COL_static') continue;
          for (const prim of node.getMesh()?.listPrimitives() ?? []) {
            for (const sem of prim.listSemantics()) if (sem !== 'POSITION') prim.setAttribute(sem, null);
          }
        }
      },
    });
    console.log(await report(doc, output));
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
