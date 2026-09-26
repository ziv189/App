import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  Points,
  ShaderMaterial,
  Vector3,
  type Scene,
} from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { NIGHT } from '../render/nightConfig';
import { nightTime } from '../render/NightSky';
import type { Cell, CellId } from '../world/Cell';

const NOISE3 = /* glsl */ `
float mHash( vec3 p ) {
  p = fract( p * 0.1031 );
  p += dot( p, p.zyx + 31.32 );
  return fract( ( p.x + p.y ) * p.z );
}
float mNoise( vec3 p ) {
  vec3 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float a = mix( mix( mHash( i ), mHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( mHash( i + vec3( 0, 1, 0 ) ), mHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y );
  float b = mix( mix( mHash( i + vec3( 0, 0, 1 ) ), mHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( mHash( i + vec3( 0, 1, 1 ) ), mHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y );
  return mix( a, b, f.z );
}`;

/** The shaft of one window: an oblique box from the window along the light, as origin + [A B C] * (0..1)^3. */
interface ShaftFrame {
  origin: Vector3;
  a: Vector3;
  b: Vector3;
  c: Vector3;
}

/** How far outside the window the shafts start, so the window reveal is inside them. */
const BACK = 0.6;

/**
 * Moonlight indoors while the house lights are off. The rooms' baked moon is a soft glow from the
 * windows; this adds the moon itself: one shadow-casting directional light, aimed through the current
 * room's windows (cells.ts `moonBeam`), so window-shaped pools fall across floors and furniture (and
 * the blinds throw stripes), plus shafts of lit air (ray-marched through each window's beam, stopped by
 * the floor) with dust drifting in them. Tuned by NIGHT.moonBeam.
 */
export class MoonBeams {
  readonly light = new DirectionalLight(0xffffff, 0);
  private readonly rooms = new Map<CellId, { group: Group; materials: ShaderMaterial[]; dir: Vector3 }>();
  private aimedAt: Cell | null = null;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();

  constructor(scene: Scene) {
    const l = this.light;
    l.name = 'moon_beam';
    l.castShadow = true;
    l.shadow.mapSize.set(NIGHT.moonBeam.shadowMapSize, NIGHT.moonBeam.shadowMapSize);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.025;
    // always in the scene (switching a light on and off would recompile every material, a visible hitch);
    // at zero intensity its shadow map simply isn't redrawn. It must exist though: a shadow-casting light
    // without one makes every lit draw call fail (the shadow sampler gets a texture of the wrong kind)
    l.shadow.autoUpdate = false;
    l.shadow.needsUpdate = true;
    scene.add(l, l.target);
  }

  /** Shadow map resolution from the quality preset. */
  setShadowMapSize(size: number): void {
    const l = this.light;
    if (l.shadow.mapSize.x === size) return;
    l.shadow.mapSize.set(size, size);
    l.shadow.map?.dispose();
    l.shadow.map = null;
    l.shadow.needsUpdate = true;
  }

  private detail = true;

  /** Full detail, or the Low preset's: the moon's light and shadow only, no shafts or dust. */
  setDetail(full: boolean): void {
    this.detail = full;
    for (const r of this.rooms.values()) for (const c of r.group.children) c.visible = full;
  }

  /** Builds a room's shafts and dust (once per room). */
  attach(cell: Cell): void {
    const def = cell.def.moonBeam;
    if (!def || this.rooms.has(cell.def.id)) return;
    const dir = new Vector3(...def.dir).normalize();
    // the shafts stop just above the floor, so they still draw in front of the pools they make
    const floorY = this.floorHeight(cell) + 0.012;
    const group = new Group();
    group.name = 'moon_beams';
    const materials: ShaderMaterial[] = [];
    const dustPerWindow = Math.round(NIGHT.moonBeam.dust / def.windows.length);
    for (const w of def.windows) {
      const frame = this.frame(w.min, w.max, dir);
      const shaft = this.shaft(frame, floorY);
      if (shaft) {
        group.add(shaft);
        materials.push(shaft.material as ShaderMaterial);
      }
      const dust = this.dust(frame, floorY, dustPerWindow);
      group.add(dust);
      materials.push(dust.material as ShaderMaterial);
    }
    group.visible = false;
    for (const c of group.children) c.visible = this.detail;
    cell.root.add(group);
    this.rooms.set(cell.def.id, { group, materials, dir });
    this.apply();
  }

  /** Re-reads NIGHT.moonBeam. */
  apply(): void {
    const color = new Color(NIGHT.moonBeam.color);
    this.light.color.copy(color);
    for (const r of this.rooms.values()) {
      for (const m of r.materials) {
        m.uniforms.color!.value.copy(color);
        m.uniforms.opacity!.value = NIGHT.moonBeam.shaftOpacity;
      }
    }
  }

  update(cell: Cell | null): void {
    const room = cell ? this.rooms.get(cell.def.id) : undefined;
    for (const r of this.rooms.values()) r.group.visible = r === room;
    // the moon is only noticed once the house lights are off
    const k = room && cell ? cell.night : 0;
    this.light.intensity = NIGHT.moonBeam.intensity * k;
    this.light.shadow.autoUpdate = k > 0.02;
    if (!room || !cell) return;
    if (this.aimedAt !== cell) this.aim(cell, room.dir);
    for (const m of room.materials) m.uniforms.level!.value = k;
  }

  /** The room's floor height: the median of rays cast down across it (a few may land on furniture). */
  private floorHeight(cell: Cell): number {
    const b = cell.bounds;
    const heights: number[] = [];
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        const x = b.min.x + ((b.max.x - b.min.x) * i) / 4;
        const z = b.min.z + ((b.max.z - b.min.z) * j) / 4;
        const h = cell.groundAt(x, z, b.min.y + 1.2);
        if (h !== null) heights.push(h);
      }
    }
    heights.sort((p, q) => p - q);
    return heights.length ? heights[Math.floor(heights.length / 2)]! : b.min.y;
  }

  /** Points the light down its direction over the room, with a shadow camera that covers it. */
  private aim(cell: Cell, dir: Vector3): void {
    this.aimedAt = cell;
    const centre = cell.bounds.getCenter(this.tmp);
    const r = cell.bounds.getSize(this.tmp2).length() / 2 + 0.5;
    this.light.position.copy(centre).addScaledVector(dir, -(r + 2));
    this.light.target.position.copy(centre);
    const cam = this.light.shadow.camera;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 0.1;
    cam.far = 2 * r + 4;
    cam.updateProjectionMatrix();
    this.light.shadow.needsUpdate = true;
  }

  private frame(min: [number, number, number], max: [number, number, number], dir: Vector3): ShaftFrame {
    const mn = new Vector3(...min);
    const size = new Vector3(...max).sub(mn);
    // the window is flat along one axis; the other two span it
    const flat = size.x < 1e-3 ? 'x' : size.y < 1e-3 ? 'y' : 'z';
    const a = flat === 'x' ? new Vector3(0, 0, size.z) : new Vector3(size.x, 0, 0);
    const b = flat === 'y' ? new Vector3(0, 0, size.z) : new Vector3(0, size.y, 0);
    const length = NIGHT.moonBeam.shaftLength + BACK;
    return { origin: mn.clone().addScaledVector(dir, -BACK), a, b, c: dir.clone().multiplyScalar(length) };
  }

  /** The beam's box, cut off at the floor, drawn from inside (back faces) and ray-marched. */
  private shaft(f: ShaftFrame, floorY: number): Mesh | null {
    const corners: Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      corners.push(f.origin.clone().addScaledVector(f.a, i & 1).addScaledVector(f.b, (i >> 1) & 1).addScaledVector(f.c, (i >> 2) & 1));
    }
    const points = corners.filter((p) => p.y >= floorY);
    const edges = [
      [0, 1], [2, 3], [4, 5], [6, 7],
      [0, 2], [1, 3], [4, 6], [5, 7],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    for (const [i, j] of edges) {
      const p = corners[i!]!;
      const q = corners[j!]!;
      if ((p.y - floorY) * (q.y - floorY) < 0) points.push(p.clone().lerp(q, (floorY - p.y) / (q.y - p.y)));
    }
    if (points.length < 4) return null;
    const geo = new ConvexGeometry(points);
    const basis = new Matrix4().makeBasis(f.a, f.b, f.c);
    const toLocal = new Matrix3().setFromMatrix4(basis).invert();
    const material = new ShaderMaterial({
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        toLocal: { value: toLocal },
        origin: { value: f.origin.clone() },
        floorY: { value: floorY },
        color: { value: new Color() },
        level: { value: 0 },
        opacity: { value: 0.05 },
        time: nightTime,
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4( position, 1.0 );
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform mat3 toLocal;
        uniform vec3 origin;
        uniform float floorY;
        uniform vec3 color;
        uniform float level;
        uniform float opacity;
        uniform float time;
        varying vec3 vWorld;
        ${NOISE3}
        void main() {
          vec3 D = vWorld - cameraPosition;
          float tBack = length( D );
          D /= tBack;
          // where the view ray is inside the beam's box (box space is 0..1 on each axis)
          vec3 ro = toLocal * ( cameraPosition - origin );
          vec3 rd = toLocal * D;
          vec3 inv = 1.0 / ( rd + vec3( 1e-6 ) );
          vec3 t0 = - ro * inv;
          vec3 t1 = ( vec3( 1.0 ) - ro ) * inv;
          vec3 tmin = min( t0, t1 );
          vec3 tmax = max( t0, t1 );
          float tIn = max( max( tmin.x, tmin.y ), max( tmin.z, 0.0 ) );
          float tOut = min( min( min( tmax.x, tmax.y ), tmax.z ), tBack );
          if ( D.y < -1e-4 ) tOut = min( tOut, ( floorY - cameraPosition.y ) / D.y );
          if ( tOut <= tIn ) discard;
          float sum = 0.0;
          float dt = ( tOut - tIn ) / 8.0;
          for ( int i = 0; i < 8; i++ ) {
            float t = tIn + ( float( i ) + 0.5 ) * dt;
            vec3 l = ro + rd * t;
            vec3 wp = cameraPosition + D * t;
            // soft sides, strongest by the window, fading as the light spreads into the room
            float edge = smoothstep( 0.0, 0.16, l.x ) * ( 1.0 - smoothstep( 0.84, 1.0, l.x ) ) * smoothstep( 0.0, 0.16, l.y ) * ( 1.0 - smoothstep( 0.84, 1.0, l.y ) );
            float fade = smoothstep( 0.02, 0.14, l.z ) * pow( 1.0 - l.z, 1.4 );
            // dust and slow air currents in the light
            float dust = 0.55 + 0.9 * mNoise( wp * 2.2 + vec3( 0.0, time * 0.06, time * 0.04 ) );
            sum += edge * fade * dust * dt;
          }
          gl_FragColor = vec4( color * sum * opacity * level, 1.0 );
        }`,
    });
    const mesh = new Mesh(geo, material);
    mesh.name = 'moon_shaft';
    mesh.renderOrder = 15;
    return mesh;
  }

  /** Dust motes drifting slowly inside a beam. */
  private dust(f: ShaftFrame, floorY: number, count: number): Points {
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seed[i * 4] = Math.random();
      seed[i * 4 + 1] = Math.random();
      seed[i * 4 + 2] = Math.pow(Math.random(), 1.6); // more near the window
      seed[i * 4 + 3] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('seed', new BufferAttribute(seed, 4));
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        origin: { value: f.origin.clone() },
        axisA: { value: f.a.clone() },
        axisB: { value: f.b.clone() },
        axisC: { value: f.c.clone() },
        floorY: { value: floorY },
        color: { value: new Color() },
        level: { value: 0 },
        opacity: { value: 0.05 },
        time: nightTime,
      },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform vec3 origin;
        uniform vec3 axisA;
        uniform vec3 axisB;
        uniform vec3 axisC;
        uniform float floorY;
        uniform float time;
        varying float vBright;
        void main() {
          vec3 l = seed.xyz;
          // wandering on slow air, wrapped so the motes stay in the beam
          l.x = fract( l.x + 0.03 * sin( time * 0.13 + seed.w * 40.0 ) );
          l.y = fract( l.y - time * 0.004 * ( 0.5 + seed.w ) );
          l.z = clamp( l.z + 0.02 * sin( time * 0.09 + seed.w * 17.0 ), 0.0, 1.0 );
          vec3 p = origin + axisA * l.x + axisB * l.y + axisC * l.z;
          vec4 mv = viewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp( 7.0 / max( - mv.z, 0.3 ), 1.0, 5.0 );
          float edge = smoothstep( 0.0, 0.2, l.x ) * ( 1.0 - smoothstep( 0.8, 1.0, l.x ) ) * smoothstep( 0.0, 0.2, l.y ) * ( 1.0 - smoothstep( 0.8, 1.0, l.y ) );
          float twinkle = 0.5 + 0.5 * sin( time * ( 0.8 + seed.w * 2.0 ) + seed.x * 30.0 );
          vBright = edge * ( 1.0 - l.z ) * twinkle * step( floorY, p.y );
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform float level;
        uniform float opacity;
        varying float vBright;
        void main() {
          float r = length( gl_PointCoord - 0.5 ) * 2.0;
          float a = 1.0 - smoothstep( 0.2, 1.0, r );
          gl_FragColor = vec4( color * a * vBright * level * opacity * 18.0, 1.0 );
        }`,
    });
    const points = new Points(geo, material);
    points.name = 'moon_dust';
    points.frustumCulled = false;
    points.renderOrder = 16;
    return points;
  }
}
