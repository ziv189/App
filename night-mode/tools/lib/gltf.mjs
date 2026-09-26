/**
 * glTF optimization library used by tools/optimize-gltf.mjs and tools/fetch-test-assets.mjs.
 *
 * Pipeline (glTF-Transform): dedup -> instance -> [join] -> weld -> resample -> prune -> texture
 * resize/WebP -> meshopt, plus a budget report (triangles, draw calls, textures, est. GPU memory).
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
 *          join?: boolean, meshopt?: boolean, verbose?: boolean,
 *          edit?: (doc: import('@gltf-transform/core').Document) => void | Promise<void>}} [options]
 *   `edit` runs on the document before the optimization passes (e.g. to remove or re-assign parts).
 */
/**
 * Per-texture size limits: [[/name pattern/, max px], ...], first match wins. Resized losslessly (PNG) so
 * the WebP pass that follows is the only lossy step.
 */
async function capTextures(doc, caps) {
  for (const tex of doc.getRoot().listTextures()) {
    const name = tex.getName() || tex.getURI();
    const cap = caps.find(([re]) => re.test(name));
    const size = tex.getSize();
    if (!cap || !size || Math.max(...size) <= cap[1]) continue;
    const out = await sharp(Buffer.from(tex.getImage())).resize(cap[1], cap[1], { fit: 'inside' }).png().toBuffer();
    tex.setImage(new Uint8Array(out)).setMimeType('image/png');
  }
}

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
  if (opts.edit) await opts.edit(doc);
  if (opts.textureCaps) await capTextures(doc, opts.textureCaps);

  // Lightmapped models carry a second UV set that no texture references; by default prune() would
  // delete it (and renumber UV sets), so keep every vertex attribute when one is present.
  const hasLightmapUvs = doc
    .getRoot()
    .listMeshes()
    .some((mesh) => mesh.listPrimitives().some((prim) => prim.getAttribute('TEXCOORD_1')));

  const transforms = [dedup(), instance({ min: 5 })];
  if (opts.join) transforms.push(join());
  // keepLeaves/keepExtras: game rooms use empty nodes (markers) and extras (interaction ids).
  transforms.push(
    weld(),
    resample(),
    prune({ keepAttributes: hasLightmapUvs, keepLeaves: Boolean(opts.keepLeaves), keepExtras: Boolean(opts.keepLeaves) }),
    sparse(),
  );

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
        formats: /jpeg$/,
        quality: 95,
        resize: [opts.maxNormal, opts.maxNormal],
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        slots: /^normalTexture$/,
        formats: /png$/,
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

/** Applies `edit` to a glTF file and writes the result without any compression (e.g. before baking). */
export async function editGltf(input, output, edit) {
  const io = await createIO();
  const doc = await io.read(input);
  doc.setLogger(new QuietLogger(false));
  await edit(doc);
  await io.write(output, doc);
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
    `  meshes:      ${r.meshes.properties.length}  (~${drawCalls} draw calls before culling)`,
    `  materials:   ${r.materials.properties.length}`,
    `  textures:    ${r.textures.properties.length}  (largest ${maxRes}, est. GPU memory ${mb(gpuBytes)})`,
    `  animations:  ${r.animations.properties.length}`,
  ];
  return lines.join('\n');
}
