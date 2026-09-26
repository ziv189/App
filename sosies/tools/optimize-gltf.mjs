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
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  inspect,
  instance,
  join,
  meshopt,
  prune,
  resample,
  sparse,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Hides info chatter and prints each distinct warning once (with a repeat count at the end). */
class QuietLogger extends Logger {
  seen = new Map();
  constructor(verbose = false) {
    super(verbose ? Logger.Verbosity.DEBUG : Logger.Verbosity.WARN);
    this.verbose = verbose;
  }
  warn(text) {
    const n = this.seen.get(text) ?? 0;
    this.seen.set(text, n + 1);
    if (this.verbose || n === 0) super.warn(text);
  }
  summary() {
    for (const [text, n] of this.seen) if (n > 1 && !this.verbose) console.warn(`  (previous warning repeated ${n}x: ${text})`);
  }
}

export async function createIO() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });
}

/**
 * @param {string} input
 * @param {string} output
 * @param {{maxTexture?: number, maxNormal?: number, textures?: 'webp'|'keep', quality?: number,
 *          join?: boolean, meshopt?: boolean, verbose?: boolean}} [options]
 */
export async function optimizeGltf(input, output, options = {}) {
  const opts = {
    maxTexture: 2048,
    maxNormal: 2048,
    textures: 'webp',
    quality: 88,
    join: false,
    meshopt: true,
    ...options,
  };
  const io = await createIO();
  const doc = await io.read(input);
  const logger = new QuietLogger(Boolean(opts.verbose));
  doc.setLogger(logger);

  const transforms = [dedup(), instance({ min: 5 })];
  if (opts.join) transforms.push(join());
  transforms.push(weld(), resample(), prune(), sparse());

  if (opts.textures === 'webp') {
    // Colour-ish maps: lossy WebP is fine.
    transforms.push(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        slots: /^(?!normalTexture$).*/,
        quality: opts.quality,
        resize: [opts.maxTexture, opts.maxTexture],
      }),
    );
    // Normal maps: heavy compression shows up as lighting noise. Already-lossy sources (JPEG) get a
    // high-quality lossy pass (lossless would only preserve the JPEG noise at 2x the size); lossless
    // sources (PNG) get WebP near-lossless.
    transforms.push(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        slots: /^normalTexture$/,
        formats: /^jpeg$/,
        quality: 95,
        resize: [opts.maxNormal, opts.maxNormal],
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        slots: /^normalTexture$/,
        formats: /^png$/,
        nearLossless: true,
        resize: [opts.maxNormal, opts.maxNormal],
      }),
    );
  }

  if (opts.meshopt) transforms.push(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

  await doc.transform(...transforms);
  await io.write(output, doc);
  logger.summary();
  return doc;
}

/** Human-readable budget report for a document. */
export async function report(doc, file) {
  const r = inspect(doc);
  let triangles = 0;
  let drawCalls = 0;
  for (const mesh of r.meshes.properties) {
    // A mesh used by N nodes is drawn N times (GPU-instanced meshes are an exception; this is an estimate).
    const uses = Math.max(1, mesh.instances);
    triangles += mesh.glPrimitives * uses;
    drawCalls += mesh.meshPrimitives * uses;
  }
  let gpuBytes = 0;
  let maxRes = '0x0';
  let maxPixels = 0;
  for (const tex of r.textures.properties) {
    gpuBytes += tex.gpuSize ?? 0;
    const [w, h] = tex.resolution.split('x').map(Number);
    if (w * h > maxPixels) {
      maxPixels = w * h;
      maxRes = tex.resolution;
    }
  }
  const size = file ? (await stat(file)).size : 0;
  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const lines = [
    `  file:        ${file ? `${basename(file)}  ${mb(size)}` : '(in memory)'}`,
    `  triangles:   ${triangles.toLocaleString('en-US')}`,
    `  meshes:      ${r.meshes.properties.length}  (≈ ${drawCalls} draw calls before culling)`,
    `  materials:   ${r.materials.properties.length}`,
    `  textures:    ${r.textures.properties.length}  (largest ${maxRes}, est. GPU memory ${mb(gpuBytes)})`,
    `  animations:  ${r.animations.properties.length}`,
  ];
  return lines.join('\n');
}

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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`\n✖ ${err.message}`);
    process.exit(1);
  });
}
