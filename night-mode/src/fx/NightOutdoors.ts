import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Points,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  type Material,
  type MeshStandardMaterial as StdMat,
  type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { moonlit } from '../render/Moonlit';
import { NIGHT } from '../render/nightConfig';
import { nightTime } from '../render/NightSky';
import type { Cell } from '../world/Cell';
import { HouseWindows } from './HouseWindows';

/**
 * Lamps outside (game space; from tools/blender/rooms/exterior.py): the street lamp's glass, then the
 * house's lanterns either side of the front door, the back door and the garage (lit with the house).
 */
const STREET_LAMP = new Vector3(-8.95, 2.38, 25.8);
const LANTERNS: [number, number, number][] = [
  [-6.96, 1.9, 1.19],
  [-4.5, 1.9, 1.19],
  [0.8, 1.9, -9.26],
  [2.92, 1.9, -9.04],
  [-14.24, 1.9, -8.5],
  [-14.24, 1.9, -3.05],
];
const LAMP_COUNT = 1 + LANTERNS.length;
/** The road runs along x at this z; the telegraph poles stand on its far side. */
const POLE_Z = 35.5;

const NOISE_GLSL = /* glsl */ `
float nHash12( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float nNoise2( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( nHash12( i ), nHash12( i + vec2( 1.0, 0.0 ) ), f.x ), mix( nHash12( i + vec2( 0.0, 1.0 ) ), nHash12( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
float nFbm( vec2 p ) {
  float s = 0.0, a = 0.5;
  for ( int i = 0; i < 4; i++ ) { s += a * nNoise2( p ); p = mat2( 1.6, 1.2, -1.2, 1.6 ) * p + 5.1; a *= 0.5; }
  return s;
}`;

/** Smooth 1D value noise, 0..1. */
function noise1(t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const h = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

/** Noise-driven lamp flicker: a gentle waver of `depth`, and (for deep flickers) an occasional hard dip. */
function flicker(t: number, seed: number, depth: number): number {
  const speed = NIGHT.practicals.flickerSpeed;
  const n = noise1(t * speed + seed * 17) * 0.6 + noise1(t * speed * 2.7 + seed * 5) * 0.4;
  let k = 1 - depth * n;
  const dip = noise1(t * 0.35 + seed * 3.3);
  if (depth > 0.1 && dip > 0.8) k *= 1 - Math.min(1, (dip - 0.8) / 0.08) * 0.6 * (0.5 + 0.5 * Math.sin(t * 41));
  return Math.max(0, k);
}

/**
 * The night outside, around the baked garden: glowing lamps (halos, the street lamp's cone of light,
 * a flicker), the house's windows (HouseWindows), falling snow that lights up near the lamps, low mist
 * drifting over the snow and the ice, and telegraph poles against the sky. Everything is built from
 * the loaded exterior and tuned by NIGHT (render/nightConfig.ts).
 */
export class NightOutdoors {
  /** Parented to the exterior: shown and hidden with it. */
  private readonly group = new Group();
  private readonly lampLevels = new Array<number>(LAMP_COUNT).fill(0);
  private readonly lampPositions = [STREET_LAMP.clone(), ...LANTERNS.map((p) => new Vector3(...p))];
  private readonly lampLights = Array.from({ length: LAMP_COUNT }, () => new Color());
  private readonly haloMaterial: ShaderMaterial;
  private readonly coneMaterial: ShaderMaterial;
  private readonly mistMaterial: ShaderMaterial;
  private readonly snowMaterial: ShaderMaterial;
  private readonly snow: Points;
  private readonly streetGlass: StdMat[] = [];
  /** The house's windows: rooms behind the glass, light on the snow (see HouseWindows). */
  readonly windows: HouseWindows;
  private readonly lampColor = new Color();

  constructor(
    private readonly exterior: Cell,
    private readonly renderer: WebGLRenderer,
  ) {
    this.group.name = 'night_outdoors';
    exterior.root.add(this.group);
    const lampColor = new Color(NIGHT.practicals.lampColor);

    this.haloMaterial = this.buildHalos(lampColor);
    this.coneMaterial = this.buildCone(lampColor);
    this.windows = new HouseWindows(exterior, this.group);
    this.mistMaterial = this.buildMist();
    this.buildPoles();
    [this.snow, this.snowMaterial] = this.buildSnow();
    // falls around the camera while the garden is shown
    this.group.add(this.snow);
    // the street lamp's own glass glows (and flickers) with its light
    exterior.root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      for (const mat of [m.material].flat() as Material[]) {
        if (/street_lamp_01_glass/.test(mat.name) && 'emissive' in mat) {
          const std = mat as StdMat;
          std.emissive.copy(lampColor);
          this.streetGlass.push(std);
        }
      }
    });
    this.apply();
  }

  /** Full detail, or the Low preset's: no drifting mist, half the snow. */
  setDetail(full: boolean): void {
    this.group.traverse((o) => {
      if (o.name === 'ground_mist') o.visible = full;
    });
    this.snow.geometry.setDrawRange(0, full ? Infinity : Math.floor(NIGHT.snowfall.count / 2));
  }

  /** Re-reads NIGHT after a change (colours and strengths; counts and shapes need a reload). */
  apply(): void {
    const p = NIGHT.practicals;
    const lamp = this.lampColor.set(p.lampColor);
    this.haloMaterial.uniforms.lampColor!.value.copy(lamp);
    this.haloMaterial.uniforms.haloSize!.value = p.haloSize;
    this.haloMaterial.uniforms.haloIntensity!.value = p.haloIntensity;
    this.coneMaterial.uniforms.lampColor!.value.copy(lamp);
    this.coneMaterial.uniforms.opacity!.value = p.coneOpacity;
    this.windows.apply();
    this.mistMaterial.uniforms.mistColor!.value.set(NIGHT.mist.color);
    this.mistMaterial.uniforms.opacity!.value = NIGHT.mist.opacity;
    this.mistMaterial.uniforms.speed!.value = NIGHT.mist.speed;
    this.snowMaterial.uniforms.size!.value = NIGHT.snowfall.size;
    for (const g of this.streetGlass) g.emissive.copy(lamp);
  }

  update(active: boolean): void {
    if (!active) return;
    const t = nightTime.value;
    const cell = this.exterior;
    const p = NIGHT.practicals;
    const lamp = this.lampColor;
    // the street lamp burns all night; the lanterns are lit with the house
    const houseLit = (1 - cell.night) * cell.brightness;
    this.lampLevels[0] = flicker(t, 0.37, p.streetLampFlicker);
    for (let i = 1; i < LAMP_COUNT; i++) this.lampLevels[i] = houseLit * flicker(t, i * 1.91, p.lanternFlicker);
    for (let i = 0; i < LAMP_COUNT; i++) this.lampLights[i]!.copy(lamp).multiplyScalar(this.lampLevels[i]!);
    this.coneMaterial.uniforms.level!.value = this.lampLevels[0];
    for (const g of this.streetGlass) g.emissiveIntensity = 4 * this.lampLevels[0]!;
    this.windows.update();
    this.snowMaterial.uniforms.viewHeight!.value = this.renderer.getDrawingBufferSize(this.viewSize).y;
  }

  private readonly viewSize = new Vector2();

  // ------------------------------------------------------------------------------------ lamps

  private buildHalos(lampColor: Color): ShaderMaterial {
    const centres = [this.lampPositions[0]!, ...this.lampPositions.slice(1)];
    const pos: number[] = [];
    const corner: number[] = [];
    const lamp: number[] = [];
    const scale: number[] = [];
    const index: number[] = [];
    centres.forEach((c, i) => {
      const base = pos.length / 3;
      for (const [cx, cy] of [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ] as const) {
        pos.push(c.x, c.y, c.z);
        corner.push(cx, cy);
        lamp.push(i);
        scale.push(i === 0 ? 1.6 : 0.75);
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('corner', new BufferAttribute(new Float32Array(corner), 2));
    geo.setAttribute('lamp', new BufferAttribute(new Float32Array(lamp), 1));
    geo.setAttribute('scale', new BufferAttribute(new Float32Array(scale), 1));
    geo.setIndex(index);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        lampColor: { value: lampColor.clone() },
        haloSize: { value: 1 },
        haloIntensity: { value: 1 },
        lampLevel: { value: this.lampLevels },
      },
      vertexShader: /* glsl */ `
        attribute vec2 corner;
        attribute float lamp;
        attribute float scale;
        uniform float haloSize;
        uniform float lampLevel[${LAMP_COUNT}];
        varying vec2 vUv;
        varying float vLevel;
        void main() {
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          mv.xy += corner * haloSize * scale;
          // a little towards the camera, clear of the wall the lamp hangs on
          mv.z += min( 0.4, - mv.z * 0.5 );
          vUv = corner * 2.0;
          vLevel = lampLevel[ int( lamp + 0.5 ) ];
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 lampColor;
        uniform float haloIntensity;
        varying vec2 vUv;
        varying float vLevel;
        void main() {
          float r = length( vUv );
          float core = exp( - r * r * 70.0 ) * 5.0;
          float glow = exp( - r * 4.5 ) * 0.5 * ( 1.0 - smoothstep( 0.6, 1.0, r ) );
          gl_FragColor = vec4( lampColor * ( core + glow ) * vLevel * haloIntensity, 1.0 );
        }`,
    });
    const halos = new Mesh(geo, material);
    halos.name = 'lamp_halos';
    halos.frustumCulled = false;
    halos.renderOrder = 10;
    this.group.add(halos);
    return material;
  }

  private buildCone(lampColor: Color): ShaderMaterial {
    // the ground beside the post (straight down from the glass would hit the post)
    const ground = this.exterior.groundAt(STREET_LAMP.x + 0.8, STREET_LAMP.z, STREET_LAMP.y);
    const height = Math.max(1, STREET_LAMP.y - (ground ?? STREET_LAMP.y - 3.3));
    const geo = new ConeGeometry(height * 0.72, height, 32, 6, true).translate(0, -height / 2, 0);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: {
        lampColor: { value: lampColor.clone() },
        level: { value: 1 },
        opacity: { value: 0.1 },
        height: { value: height },
        time: nightTime,
      },
      vertexShader: /* glsl */ `
        varying vec3 vLocal;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        void main() {
          vLocal = position;
          vec4 w = modelMatrix * vec4( position, 1.0 );
          vWorld = w.xyz;
          vNormalW = normalize( mat3( modelMatrix ) * normal );
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 lampColor;
        uniform float level;
        uniform float opacity;
        uniform float height;
        uniform float time;
        varying vec3 vLocal;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        ${NOISE_GLSL}
        void main() {
          float along = clamp( - vLocal.y / height, 0.0, 1.0 );
          vec3 V = normalize( cameraPosition - vWorld );
          // thin at the silhouette of the cone, as a volume of lit air would be
          float thick = pow( smoothstep( 0.0, 0.85, abs( dot( normalize( vNormalW ), V ) ) ), 1.6 );
          // snow and mist drifting through the light
          float n = nFbm( vec2( atan( vLocal.z, vLocal.x ) * 2.0, vWorld.y * 1.4 + time * 0.9 ) );
          float k = pow( 1.0 - along, 1.4 ) * smoothstep( 0.0, 0.08, along ) * thick * ( 0.55 + 0.6 * n );
          gl_FragColor = vec4( lampColor * k * opacity * level, 1.0 );
        }`,
    });
    const cone = new Mesh(geo, material);
    cone.name = 'street_lamp_cone';
    cone.position.copy(STREET_LAMP);
    cone.renderOrder = 11;
    this.group.add(cone);
    return material;
  }

  // ------------------------------------------------------------------------------------ mist

  private buildMist(): ShaderMaterial {
    const count = 64;
    const centre: number[] = [];
    const corner: number[] = [];
    const seed: number[] = [];
    const index: number[] = [];
    let rnd = 7;
    const random = () => {
      rnd = (rnd * 16807) % 2147483647;
      return rnd / 2147483647;
    };
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 8; tries++) {
      // two thirds over the garden, a third out on the ice
      const onLake = placed % 3 === 0;
      const x = onLake ? -60 + random() * 110 : -40 + random() * 72;
      const z = onLake ? -30 - random() * 60 : -26 + random() * 52;
      if (!onLake && x > -16 && x < 6 && z > -14 && z < 5) continue; // not inside the house
      const g = this.exterior.groundAt(x, z, 30);
      if (g === null) continue;
      const w = 7 + random() * 8;
      const h = 1.6 + random() * 1.8;
      const base = centre.length / 3;
      for (const [cx, cy] of [
        [-0.5, 0],
        [0.5, 0],
        [0.5, 1],
        [-0.5, 1],
      ] as const) {
        centre.push(x, g - 0.25, z);
        corner.push(cx, cy);
        seed.push(w, h, random(), random());
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      placed++;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(centre), 3));
    geo.setAttribute('corner', new BufferAttribute(new Float32Array(corner), 2));
    geo.setAttribute('seed', new BufferAttribute(new Float32Array(seed), 4));
    geo.setIndex(index);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: nightTime, mistColor: { value: new Color() }, opacity: { value: 0.2 }, speed: { value: 0.25 } },
      vertexShader: /* glsl */ `
        attribute vec2 corner;
        attribute vec4 seed;
        uniform float time;
        uniform float speed;
        varying vec2 vUv;
        varying vec2 vNoise;
        varying float vFade;
        void main() {
          vec3 c = position + vec3( sin( time * 0.05 * speed + seed.z * 6.3 ) * 3.0, 0.0, cos( time * 0.04 * speed + seed.w * 6.3 ) * 3.0 );
          // upright, turned to face the camera
          vec3 toCam = cameraPosition - c;
          toCam.y = 0.0;
          vec3 fwd = normalize( toCam + vec3( 1e-4 ) );
          vec3 right = normalize( cross( vec3( 0.0, 1.0, 0.0 ), fwd ) );
          vec3 p = c + right * corner.x * seed.x + vec3( 0.0, corner.y * seed.y, 0.0 );
          vUv = corner;
          float d = length( cameraPosition - p );
          vFade = smoothstep( 2.0, 9.0, d ) * ( 1.0 - smoothstep( 70.0, 110.0, d ) );
          vNoise = vec2( dot( p.xz, right.xz ), p.y ) * 0.22 + vec2( time * 0.03 * speed, 0.0 ) + seed.zw * 17.0;
          gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 mistColor;
        uniform float opacity;
        varying vec2 vUv;
        varying vec2 vNoise;
        varying float vFade;
        ${NOISE_GLSL}
        void main() {
          float shape = ( 1.0 - smoothstep( 0.2, 0.5, abs( vUv.x ) ) ) * smoothstep( 0.0, 0.3, vUv.y ) * ( 1.0 - smoothstep( 0.3, 1.0, vUv.y ) );
          float n = smoothstep( 0.3, 0.75, nFbm( vNoise ) );
          gl_FragColor = vec4( mistColor, opacity * shape * n * vFade );
        }`,
    });
    const mist = new Mesh(geo, material);
    mist.name = 'ground_mist';
    mist.frustumCulled = false;
    mist.renderOrder = 20;
    this.group.add(mist);
    return material;
  }

  // ------------------------------------------------------------------------- telegraph poles

  /** A row of telegraph poles beyond the road, and their sagging wires: silhouettes against the sky. */
  private buildPoles(): void {
    const tops: Vector3[] = [];
    const poleHeight = 9;
    for (let x = -132; x <= 132; x += 33) {
      const z = POLE_Z + Math.sin(x * 0.7) * 0.4;
      const g = this.exterior.groundAt(x, z, 40);
      if (g !== null) tops.push(new Vector3(x, g - 0.2, z));
    }
    const parts = [
      new CylinderGeometry(0.11, 0.15, poleHeight, 8).translate(0, poleHeight / 2, 0),
      new BoxGeometry(2.3, 0.12, 0.12).translate(0, poleHeight - 0.7, 0),
      new BoxGeometry(0.08, 0.7, 0.08).rotateZ(0.8).translate(0.45, poleHeight - 1.05, 0),
      ...[-1, 0, 1].map((k) => new CylinderGeometry(0.035, 0.05, 0.2, 6).translate(k * 1.0, poleHeight - 0.54, 0)),
    ];
    const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
    geo.computeVertexNormals();
    const material = new MeshStandardMaterial({ color: 0x2b241d, roughness: 0.9 });
    material.name = 'NM_TelegraphPoles';
    moonlit(material);
    const poles = new InstancedMesh(geo, material, tops.length);
    poles.name = 'telegraph_poles';
    const m = new Matrix4();
    tops.forEach((p, i) => poles.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    poles.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    this.group.add(poles);

    const wire: number[] = [];
    for (let i = 0; i + 1 < tops.length; i++) {
      for (const k of [-1, 0, 1]) {
        const a = tops[i]!.clone().add(new Vector3(k, poleHeight - 0.44, 0));
        const b = tops[i + 1]!.clone().add(new Vector3(k, poleHeight - 0.44, 0));
        const sag = 0.55 + a.distanceTo(b) * 0.012;
        const steps = 16;
        let prev = a.clone();
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const p = a.clone().lerp(b, t);
          p.y -= sag * 4 * t * (1 - t);
          wire.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          prev = p;
        }
      }
    }
    const wireGeo = new BufferGeometry();
    wireGeo.setAttribute('position', new BufferAttribute(new Float32Array(wire), 3));
    const wires = new LineSegments(wireGeo, new LineBasicMaterial({ color: 0x07080b }));
    wires.name = 'telegraph_wires';
    this.group.add(wires);
  }

  // ------------------------------------------------------------------------------------ snow

  private buildSnow(): [Points, ShaderMaterial] {
    const count = NIGHT.snowfall.count;
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    const geo = new BufferGeometry();
    // positions are made in the shader; three.js still wants a position attribute
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('seed', new BufferAttribute(seed, 4));
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          size: { value: 3 },
          viewHeight: { value: 1080 },
          box: { value: new Vector3(44, 16, 44) },
          ambient: { value: new Color(0.1, 0.12, 0.18) },
          lampBoost: { value: NIGHT.snowfall.lampBoost },
        },
      ]),
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform float time;
        uniform float size;
        uniform float viewHeight;
        uniform vec3 box;
        uniform vec3 ambient;
        uniform float lampBoost;
        uniform vec3 lampPos[${LAMP_COUNT}];
        uniform vec3 lampLight[${LAMP_COUNT}];
        varying vec3 vColor;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main() {
          vec3 p = seed.xyz * box;
          float t = time;
          p.y -= t * ( 0.75 + 0.5 * seed.w );
          p.x += t * 0.45 + sin( t * ( 0.7 + seed.w ) + seed.x * 40.0 ) * 0.4;
          p.z += t * 0.15 + cos( t * ( 0.5 + seed.w ) + seed.z * 40.0 ) * 0.4;
          // wrapped into a box that travels with the camera
          vec3 origin = cameraPosition - box * vec3( 0.5, 0.4, 0.5 );
          p = origin + mod( p - origin, box );
          vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mvPosition;
          float dist = max( - mvPosition.z, 0.2 );
          gl_PointSize = size * ( 0.55 + 0.9 * seed.w * seed.w ) * ( viewHeight / 1080.0 ) * 10.0 / dist;
          // lit by the moon's glow and, brightly, by any lamp it drifts past
          vec3 light = ambient;
          for ( int i = 0; i < ${LAMP_COUNT}; i++ ) {
            vec3 d = p - lampPos[ i ];
            light += lampLight[ i ] * lampBoost / ( 1.0 + dot( d, d ) * 0.5 );
          }
          vColor = light;
          vAlpha = smoothstep( 0.25, 1.0, dist ) * ( 1.0 - smoothstep( 16.0, 21.0, dist ) );
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main() {
          float r = length( gl_PointCoord - 0.5 ) * 2.0;
          float a = ( 1.0 - smoothstep( 0.35, 1.0, r ) ) * vAlpha * 0.85;
          gl_FragColor = vec4( vColor, a );
          #include <fog_fragment>
        }`,
    });
    material.uniforms.time = nightTime;
    material.uniforms.lampPos = { value: this.lampPositions };
    material.uniforms.lampLight = { value: this.lampLights };
    const points = new Points(geo, material);
    points.name = 'snowfall';
    points.frustumCulled = false;
    points.renderOrder = 30;
    return [points, material];
  }
}
