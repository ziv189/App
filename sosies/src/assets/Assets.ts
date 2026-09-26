import type { DataTexture, WebGLRenderer } from 'three';
import { DRACO_GLTF_CONFIG, DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * The build published as a claude.ai page can only serve standard web file types, so it ships binary
 * assets (.glb, .hdr) as base64 text files next to the page (see tools/make-artifact.mjs). Every other
 * build loads the files directly.
 */
const PACKED = import.meta.env.VITE_PACKED_ASSETS === '1';
const PACKED_SUFFIX = '.b64.txt';

/** Resolves a path inside /public against the app's base URL (works in dev, builds and desktop wrappers). */
export const assetUrl = (path: string) => {
  const url = `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
  return PACKED && /\.(glb|hdr)$/i.test(path) ? url + PACKED_SUFFIX : url;
};

/** Downloads a base64-packed asset (reporting progress in decoded bytes) and returns its bytes. */
async function fetchPacked(url: string, onProgress?: (e: ProgressEvent) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const reader = res.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    // Base64 is 4 characters per 3 bytes; report the size of the real file.
    onProgress?.(new ProgressEvent('progress', { lengthComputable: total > 0, loaded: loaded * 0.75, total: total * 0.75 }));
  }
  const text = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    text.set(chunk, offset);
    offset += chunk.length;
  }
  const binary = atob(new TextDecoder().decode(text).trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Tracks several downloads plus named processing steps and reports one overall 0..1 progress value.
 * Downloads are weighted by bytes once their size is known.
 */
export class ProgressTracker {
  private readonly downloads = new Map<string, { loaded: number; total: number }>();
  private status = '';

  constructor(private readonly onChange: (fraction: number, status: string) => void) {}

  /** Returns a callback suitable for three.js loaders' onProgress. */
  download(key: string, expectedBytes: number): (e: ProgressEvent) => void {
    this.downloads.set(key, { loaded: 0, total: expectedBytes });
    return (e: ProgressEvent) => {
      const d = this.downloads.get(key);
      if (!d) return;
      d.loaded = e.loaded;
      if (e.lengthComputable && e.total > 0) d.total = e.total;
      this.emit();
    };
  }

  finish(key: string): void {
    const d = this.downloads.get(key);
    if (d) d.loaded = d.total;
    this.emit();
  }

  setStatus(status: string): void {
    this.status = status;
    this.emit();
  }

  private emit(): void {
    let loaded = 0;
    let total = 0;
    for (const d of this.downloads.values()) {
      loaded += Math.min(d.loaded, d.total);
      total += d.total;
    }
    const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
    const bytes = total > 0 ? ` (${mb(loaded)} / ${mb(total)} MB)` : '';
    this.onChange(total > 0 ? loaded / total : 0, `${this.status}${loaded < total ? bytes : ''}`);
  }
}

/**
 * Shared loaders. The Draco, KTX2 (Basis) and meshopt decoders ship inside three.js and are bundled by
 * Vite, so the game works offline and inside a desktop wrapper.
 */
export class Assets {
  readonly gltf: GLTFLoader;
  readonly hdr: HDRLoader;
  private readonly draco: DRACOLoader;
  private readonly ktx2: KTX2Loader;

  constructor(renderer: WebGLRenderer) {
    this.draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG); // smaller glTF-only decoder
    this.ktx2 = new KTX2Loader().detectSupport(renderer);
    this.gltf = new GLTFLoader()
      .setDRACOLoader(this.draco)
      .setKTX2Loader(this.ktx2)
      .setMeshoptDecoder(MeshoptDecoder);
    this.hdr = new HDRLoader();
  }

  async loadGltf(url: string, onProgress?: (e: ProgressEvent) => void): Promise<GLTF> {
    if (!url.endsWith(PACKED_SUFFIX)) return this.gltf.loadAsync(url, onProgress);
    const folder = url.slice(0, url.lastIndexOf('/') + 1);
    return this.gltf.parseAsync(await fetchPacked(url, onProgress), folder);
  }

  async loadHdr(url: string, onProgress?: (e: ProgressEvent) => void): Promise<DataTexture> {
    if (!url.endsWith(PACKED_SUFFIX)) return this.hdr.loadAsync(url, onProgress);
    return this.hdr.createDataTexture(await fetchPacked(url, onProgress));
  }

  /**
   * Checks that a file exists before we try to parse it. (A missing file would otherwise come back as
   * the dev server's HTML page and fail with a confusing parse error.) Only a definite "missing" answer
   * returns false; if the check itself can't tell, the real download reports any problem.
   */
  static async exists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.status === 404) return false;
      if (!res.ok) return true;
      return !(res.headers.get('content-type') ?? '').includes('text/html');
    } catch {
      return true;
    }
  }

  dispose(): void {
    this.draco.dispose();
    this.ktx2.dispose();
  }
}
