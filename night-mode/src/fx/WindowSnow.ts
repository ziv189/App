import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { nightTime } from '../render/NightSky';
import type { Cell } from '../world/Cell';

/**
 * Snow falling outside the windows while you are indoors. The view out of a window is a picture of the
 * garden captured once (World.captureOutdoorViews); these flakes fall between the glass and that picture,
 * in a box that travels with the camera, and only outside the room: a flake inside the room's bounds isn't
 * drawn, so the walls hide the rest and the windows show them. Near the house they catch the warm light
 * from its rooms.
 */
export class WindowSnow {
  readonly points: Points;
  private readonly material: ShaderMaterial;
  private readonly count: number;
  private readonly viewSize = new Vector2();

  constructor(scene: Scene, count = 2600) {
    this.count = count;
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    const geo = new BufferGeometry();
    // positions are made in the shader; three.js still wants a position attribute
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('seed', new BufferAttribute(seed, 4));
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: nightTime,
        size: { value: 1.3 },
        viewHeight: { value: 1080 },
        box: { value: new Vector3(12, 8, 12) },
        roomMin: { value: new Vector3() },
        roomMax: { value: new Vector3() },
        roomLit: { value: 0 },
        ambient: { value: new Color(0.13, 0.15, 0.21) },
        warm: { value: new Color(1.0, 0.72, 0.45) },
      },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform float time;
        uniform float size;
        uniform float viewHeight;
        uniform vec3 box;
        uniform vec3 roomMin;
        uniform vec3 roomMax;
        uniform float roomLit;
        uniform vec3 ambient;
        uniform vec3 warm;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec3 p = seed.xyz * box;
          float t = time;
          p.y -= t * ( 0.7 + 0.45 * seed.w );
          p.x += t * 0.4 + sin( t * ( 0.7 + seed.w ) + seed.x * 40.0 ) * 0.3;
          p.z += t * 0.12 + cos( t * ( 0.5 + seed.w ) + seed.z * 40.0 ) * 0.3;
          // wrapped into a box that travels with the camera
          vec3 origin = cameraPosition - box * vec3( 0.5, 0.45, 0.5 );
          p = origin + mod( p - origin, box );
          // outside the room only
          vec3 out3 = max( roomMin - p, 0.0 ) + max( p - roomMax, 0.0 );
          float away = length( out3 );
          vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
          gl_Position = away > 0.0 ? projectionMatrix * mvPosition : vec4( 2.0, 2.0, 2.0, 1.0 );
          float dist = max( - mvPosition.z, 0.2 );
          gl_PointSize = size * ( 0.55 + 0.9 * seed.w * seed.w ) * ( viewHeight / 1080.0 ) * 10.0 / dist;
          // moonlit, and warm close to the lit rooms of the house
          vColor = ambient + warm * roomLit * 0.55 * exp( - away * 1.3 );
          vAlpha = smoothstep( 0.02, 0.3, away ) * ( 1.0 - smoothstep( 5.0, 6.0, dist ) );
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float r = length( gl_PointCoord - 0.5 ) * 2.0;
          float a = ( 1.0 - smoothstep( 0.35, 1.0, r ) ) * vAlpha * 0.85;
          gl_FragColor = vec4( vColor, a );
        }`,
    });
    this.points = new Points(geo, this.material);
    this.points.name = 'window_snow';
    this.points.frustumCulled = false;
    this.points.visible = false;
    // behind the window glass, which draws after the room
    this.points.renderOrder = 1;
    scene.add(this.points);
  }

  /** Full detail, or the Low preset's half as many flakes. */
  setDetail(full: boolean): void {
    this.points.geometry.setDrawRange(0, full ? this.count : Math.floor(this.count / 2));
  }

  update(cell: Cell | null, renderer: WebGLRenderer): void {
    const indoors = Boolean(cell && !cell.def.exterior);
    this.points.visible = indoors;
    if (!cell || !indoors) return;
    const u = this.material.uniforms;
    u.roomMin!.value.copy(cell.bounds.min).subScalar(0.02);
    u.roomMax!.value.copy(cell.bounds.max).addScalar(0.02);
    u.roomLit!.value = (1 - cell.night) * cell.brightness;
    u.viewHeight!.value = renderer.getDrawingBufferSize(this.viewSize).y;
  }
}
