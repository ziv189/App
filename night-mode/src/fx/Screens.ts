import {
  Color,
  DirectionalLight,
  HalfFloatType,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Scene,
  ShaderMaterial,
  SpotLight,
  WebGLRenderTarget,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import type { Character } from '../characters/Character';

export type Feed = 'off' | 'static' | 'lake' | 'ivy' | 'dana';

const SCREEN_SHADER = {
  uniforms: {
    map: { value: null },
    time: { value: 0 },
    noise: { value: 0.06 },
    scan: { value: 0.35 },
    brightness: { value: 2.4 },
    staticMix: { value: 0 },
    on: { value: 0 },
    curve: { value: 0.08 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    uniform float time, noise, scan, brightness, staticMix, on, curve;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      vec2 uv = 0.5 + c * (1.0 + dot(c, c) * curve);
      vec3 col = texture2D(map, uv).rgb;
      float n = hash(floor(uv * vec2(320.0, 240.0)) + fract(time * 23.0) * 91.0);
      col = mix(col, vec3(n * 0.8), staticMix);
      col += (n - 0.5) * noise;
      col *= 1.0 - scan * 0.5 * (0.5 + 0.5 * sin(uv.y * 720.0 + time * 6.0));
      float vig = smoothstep(0.78, 0.25, length(c * vec2(1.0, 1.2)));
      col *= vig;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
      gl_FragColor = vec4(max(col, 0.0) * brightness * on + vec3(0.004) * (1.0 - on), 1.0);
    }`,
};

interface FeedScene {
  scene: Scene;
  camera: PerspectiveCamera;
  target: WebGLRenderTarget;
  /** Called before rendering (poses characters, swaps visibility...). */
  before?: () => void;
  after?: () => void;
}

/**
 * Screens in the house (the living-room TV, Dana's laptop, the basement monitor) show live feeds
 * rendered into textures: the lake camera, Ivy's face, Dana's video logs, or static.
 */
export class Screens {
  private readonly screens = new Map<string, { mesh: Mesh; material: ShaderMaterial; feed: Feed }>();
  private readonly feeds = new Map<Feed, FeedScene>();
  private time = 0;
  private accum = 0;
  private readonly blank = new WebGLRenderTarget(4, 4);

  constructor(private readonly renderer: WebGLRenderer) {}

  /** Replaces a screen mesh's material with a CRT-style screen showing a feed. */
  register(name: string, mesh: Mesh, opts: { curve?: number; brightness?: number } = {}): void {
    const material = new ShaderMaterial({
      uniforms: structuredCloneUniforms(),
      vertexShader: SCREEN_SHADER.vertexShader,
      fragmentShader: SCREEN_SHADER.fragmentShader,
    });
    material.uniforms.curve!.value = opts.curve ?? 0.08;
    material.uniforms.brightness!.value = opts.brightness ?? 2.4;
    material.uniforms.map!.value = this.blank.texture;
    mesh.material = material;
    mesh.visible = true;
    this.screens.set(name, { mesh, material, feed: 'off' });
  }

  has(name: string): boolean {
    return this.screens.has(name);
  }

  feed(name: string): Feed {
    return this.screens.get(name)?.feed ?? 'off';
  }

  set(name: string, feed: Feed): void {
    const s = this.screens.get(name);
    if (!s) return;
    s.feed = feed;
    const u = s.material.uniforms;
    u.on!.value = feed === 'off' ? 0 : 1;
    u.staticMix!.value = feed === 'static' ? 1 : 0;
    const f = this.feeds.get(feed);
    u.map!.value = f ? f.target.texture : this.blank.texture;
  }

  addFeed(feed: Feed, scene: Scene, camera: PerspectiveCamera, hooks: { before?: () => void; after?: () => void } = {}, size = [512, 384]): void {
    const target = new WebGLRenderTarget(size[0]!, size[1]!, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter });
    this.feeds.set(feed, { scene, camera, target, ...hooks });
    for (const [name, s] of this.screens) if (s.feed === feed) this.set(name, feed);
  }

  /** The texture a feed renders into (e.g. for the jump-scare overlay). */
  texture(feed: Feed) {
    return this.feeds.get(feed)?.target.texture ?? null;
  }

  update(dt: number, visibleRoot: Object3D | null, extraFeeds: Feed[] = []): void {
    this.time += dt;
    this.accum += dt;
    for (const s of this.screens.values()) s.material.uniforms.time!.value = this.time;
    if (this.accum < 1 / 24) return;
    this.accum = 0;
    const needed = new Set<Feed>(extraFeeds);
    for (const s of this.screens.values()) {
      if (s.feed === 'off' || s.feed === 'static') continue;
      // only feeds shown on a screen in the room the player is in
      let inView = false;
      for (let o: Object3D | null = s.mesh; o; o = o.parent) if (o === visibleRoot) inView = true;
      if (inView) needed.add(s.feed);
    }
    for (const feed of needed) this.renderFeed(feed);
  }

  renderFeed(feed: Feed): void {
    const f = this.feeds.get(feed);
    if (!f) return;
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    f.before?.();
    r.setRenderTarget(f.target);
    r.clear();
    r.render(f.scene, f.camera);
    r.setRenderTarget(prevTarget);
    f.after?.();
  }
}

function structuredCloneUniforms() {
  const out: Record<string, { value: unknown }> = {};
  for (const [k, v] of Object.entries(SCREEN_SHADER.uniforms)) out[k] = { value: v.value };
  return out;
}

/** A small studio for a character's face on a screen: soft key light, cold rim, dark background. */
export function faceStudio(character: Character, opts: { distance: number; height: number; fov: number; background: number; key: number; sitting?: boolean }): {
  scene: Scene;
  camera: PerspectiveCamera;
} {
  const scene = new Scene();
  scene.background = new Color(opts.background);
  scene.add(character.root);
  const key = new SpotLight(0xffe2c4, opts.key, 6, 0.9, 0.7, 1.5);
  key.position.set(0.5, opts.height + 0.3, 1.2);
  key.target.position.set(0, opts.height, 0);
  scene.add(key, key.target);
  const fill = new PointLight(0x9fb4ff, opts.key * 0.25, 5, 2);
  fill.position.set(-0.8, opts.height - 0.2, 0.9);
  scene.add(fill);
  const rim = new DirectionalLight(0xbfd0ff, opts.key * 0.4);
  rim.position.set(-1, opts.height + 1, -1.5);
  scene.add(rim);
  const camera = new PerspectiveCamera(opts.fov, 4 / 3, 0.05, 20);
  camera.position.set(0, opts.height, opts.distance);
  camera.lookAt(0, opts.height - 0.02, 0);
  return { scene, camera };
}
