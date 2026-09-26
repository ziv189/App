#!/usr/bin/env node
/**
 * SOSIES glTF optimizer (wraps glTF-Transform).
 *
 * Turns a raw export (from Blender, a store download, etc.) into a web-ready .glb:
 *   dedup -> instance -> [join] -> weld -> resample -> prune -> texture resize/WebP -> meshopt
 * and prints a budget report (triangles, draw calls, textures, estimated GPU memory).
 *
 * Usage:
 *   node tools/optimize-gltf.mjs <input.gltf|input.glb> <output.glb> [options]
 *
 * Options:
 *   --max-texture <px>   Longest edge for colour / ORM / emissive textures (default 2048)
 *   --max-normal <px>    Longest edge for normal maps (default 2048)
 *   --textures <mode>    webp | keep   (default webp)
 *   --quality <0-100>    WebP quality for colour textures (default 88)
 *   --join               Merge meshes that share a material. Static scenery ONLY: joined meshes can
 *                        no longer be moved, hidden or picked individually.
 *   --no-meshopt         Skip EXT_meshopt_compression (keeps plain float geometry)
 *   --report-only        Read the input and print its budget report without writing anything
 *   --verbose            Show every glTF-Transform log line
 *
 * KTX2 (GPU-compressed) textures are added in the first real-asset milestone; the game's
 * loader already reads KTX2, Draco and meshopt files.
 */
import { createIO, optimizeGltf, report } from './lib/gltf.mjs';

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--max-texture':
        options.maxTexture = Number(next());
        break;
      case '--max-normal':
        options.maxNormal = Number(next());
        break;
      case '--textures':
        options.textures = next();
        if (!['webp', 'keep'].includes(options.textures)) throw new Error('--textures must be webp or keep');
        break;
      case '--quality':
        options.quality = Number(next());
        break;
      case '--join':
        options.join = true;
        break;
      case '--no-meshopt':
        options.meshopt = false;
        break;
      case '--report-only':
        options.reportOnly = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
        positional.push(a);
    }
  }
  return { positional, options };
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [input, output] = positional;
  if (!input || (!output && !options.reportOnly)) {
    console.log('Usage: node tools/optimize-gltf.mjs <input.gltf|glb> <output.glb> [--join] [--max-texture 2048] ...');
    process.exit(1);
  }
  if (options.reportOnly) {
    const io = await createIO();
    const doc = await io.read(input);
    console.log(`Budget report for ${input}:\n${await report(doc, input)}`);
    return;
  }
  console.log(`Optimizing ${input} -> ${output} ...`);
  const t0 = performance.now();
  const doc = await optimizeGltf(input, output, options);
  console.log(`Done in ${((performance.now() - t0) / 1000).toFixed(1)} s.\n${await report(doc, output)}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
