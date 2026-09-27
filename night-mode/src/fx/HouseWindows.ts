import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type Material,
} from 'three';
import { NIGHT } from '../render/nightConfig';
import { MOON_DIR, nightTime } from '../render/NightSky';
import type { Cell } from '../world/Cell';

/** Middle of the house (game space): windows face away from it. */
const HOUSE_CENTRE = new Vector3(-4.5, 0, -3.5);
/** The child's room upstairs at the front: its night light burns all night, whatever the rest of the house does. */
const NIGHT_LIGHT_AT = new Vector3(1.72, 4.62, 0.835);
/** Floor level of each storey inside the house (ground floor, first floor, attic), game space. */
const STOREY_FLOORS = [-0.35, 3.02, 8.1];
/** The garage along the west wall: nobody is in it. */
const GARAGE_X = -13.3;
const UP = new Vector3(0, 1, 0);

/** One connected piece of window glass (a sash, a light of a divided window, a side of a lantern). */
interface Pane {
  mesh: Mesh;
  verts: number[];
  /** Facing: one of 8 compass directions (index), and that direction, outward. */
  dir: number;
  normal: Vector3;
  /** Extent along the wall, height, and distance out along the normal. */
  a0: number;
  a1: number;
  y0: number;
  y1: number;
  plane: number;
}

/** What is behind a group of windows close together on one storey. */
interface Room {
  seed: number;
  /** Nobody is in it: its light is off unless the whole house blazes. */
  dark: boolean;
  /** How bright its lamp is. */
  brightness: number;
  /** Wake-up group (the house lights up group by group in one scene). */
  group: number;
  nightLight: boolean;
}

/** A window: the panes (sashes) of one opening, and the room behind it. */
interface HouseWindow {
  panes: Pane[];
  /** Middle of the window, on the glass. */
  centre: Vector3;
  /** Outward and horizontal. */
  normal: Vector3;
  width: number;
  height: number;
  bottom: number;
  storey: number;
  /** How far below the bottom of the glass the room's floor is. */
  floorBelow: number;
  seed: number;
  room: Room | null;
  /** Not a window: the glass of a lantern (glows with the house's lights). */
  lamp: boolean;
}

const hash = (x: number) => {
  const s = Math.sin(x * 91.7) * 43758.5453;
  return s - Math.floor(s);
};

const glassVertex = /* glsl */ `
attribute vec4 winCentre;
attribute vec4 winAxis;
attribute vec4 winSize;
varying vec3 vWorld;
// the same at every vertex of a window: not interpolated, so hashing them gives the same room everywhere
// on the glass (interpolation error, hashed, turns into streaks)
flat varying vec4 vCentre;
flat varying vec4 vAxis;
flat varying vec4 vSize;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4( position, 1.0 );
  vWorld = w.xyz;
  vCentre = winCentre;
  vAxis = winAxis;
  vSize = winSize;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

/**
 * Interior mapping: each window looks into a room that isn't there. The view ray is followed through
 * the glass into a box (walls, ceiling, floor) furnished from the window's seed and lit by the room's
 * lamp; curtains hang either side, and the glass reflects the night sky at glancing angles.
 */
const glassFragment = /* glsl */ `
uniform float time;
uniform float lit;
uniform float groupBoost[ 4 ];
uniform float nightLight;
uniform vec3 skyColor;
uniform vec3 lampColor;
uniform vec3 moonDir;
varying vec3 vWorld;
flat varying vec4 vCentre;
flat varying vec4 vAxis;
flat varying vec4 vSize;
#include <fog_pars_fragment>

float wh( float n ) { return fract( sin( n * 91.7 ) * 43758.5453 ); }

vec3 wallColour( float s ) {
  float k = wh( s * 5.3 );
  return k < 0.2 ? vec3( 0.55, 0.43, 0.3 ) : k < 0.4 ? vec3( 0.4, 0.46, 0.36 ) : k < 0.6 ? vec3( 0.52, 0.36, 0.32 ) : k < 0.8 ? vec3( 0.6, 0.55, 0.46 ) : vec3( 0.38, 0.42, 0.52 );
}
vec3 clothColour( float s ) {
  float k = wh( s * 6.7 );
  return k < 0.25 ? vec3( 0.8, 0.64, 0.44 ) : k < 0.5 ? vec3( 0.6, 0.2, 0.17 ) : k < 0.75 ? vec3( 0.88, 0.82, 0.7 ) : vec3( 0.3, 0.44, 0.36 );
}

// fades a pattern of this period out as it gets too fine for the pixels (fw: the pixel's footprint)
float fine( float period, float fw ) { return 1.0 - smoothstep( period * 0.1, period * 0.3, fw ); }

void main() {
  vec3 V = normalize( vWorld - cameraPosition );
  vec3 n = normalize( vec3( vAxis.x, 0.0, vAxis.y ) );
  float W = vSize.x;
  float H = vSize.y;
  int flags = int( vSize.w + 0.5 );
  // window space: x along the window (0 = middle), y up (0 = bottom of the glass), z into the room
  vec3 t = normalize( cross( vec3( 0.0, 1.0, 0.0 ), n ) );
  vec3 rel = vWorld - vCentre.xyz;
  vec3 p = vec3( dot( rel, t ), rel.y + H * 0.5, 0.0 );
  // how much of the glass one pixel covers (before any branching, where derivatives are defined)
  float fwGlass = max( fwidth( p.x ), fwidth( p.y ) );
  // the glass reflects the night sky (and the moon) at glancing angles
  float cosi = clamp( - dot( V, n ), 0.0, 1.0 );
  vec3 R = reflect( V, n );
  vec3 sky = skyColor * ( 0.4 + 0.8 * clamp( R.y * 2.0, 0.0, 1.0 ) ) + vec3( 0.6, 0.66, 0.85 ) * 3.0 * pow( max( dot( R, moonDir ), 0.0 ), 120.0 );
  float fres = 0.04 + 0.96 * pow( 1.0 - cosi, 5.0 );
  vec3 col;
  if ( ( flags & 4 ) != 0 ) {
    // a lantern's glass: the flame behind it
    col = lampColor * 3.5 * lit;
    fres *= 0.3;
  } else if ( W < 0.01 ) {
    col = vec3( 0.0 );
  } else {
    float seed = vAxis.z;
    float roomSeed = vAxis.w;
    bool dark = ( flags & 1 ) != 0;
    bool nightRoom = ( flags & 2 ) != 0;
    int group = ( flags >> 3 ) & 3;
    // glass down to the floor: a door or a french window (no curtains)
    bool door = vCentre.w < 0.2;
    vec3 d = vec3( dot( V, t ), V.y, max( - dot( V, n ), 0.03 ) );
    // the room: wider than the window and not quite centred on it
    float roomW = max( W * 2.0, 2.6 ) * ( 0.9 + 0.3 * wh( seed * 7.1 ) );
    float xOff = ( wh( seed * 2.9 ) - 0.5 ) * max( roomW - W, 0.0 ) * 0.5;
    float floorY = - vCentre.w;
    float ceilY = max( floorY + 2.55 + 0.2 * wh( roomSeed * 6.1 ), H + 0.12 );
    float depth = 2.6 + 2.0 * wh( seed * 3.3 );
    float left = xOff - roomW * 0.5;
    float right = xOff + roomW * 0.5;
    float tx = d.x > 1e-4 ? ( right - p.x ) / d.x : d.x < -1e-4 ? ( left - p.x ) / d.x : 1e9;
    float ty = d.y > 1e-4 ? ( ceilY - p.y ) / d.y : d.y < -1e-4 ? ( floorY - p.y ) / d.y : 1e9;
    float tz = depth / d.z;
    float th = min( min( tx, ty ), tz );
    vec3 h = p + d * th;
    // a pixel's footprint where the ray lands in the room: the glass's, grown with the distance behind it
    float fw = fwGlass * ( 1.0 + th * length( d ) / max( length( vWorld - cameraPosition ), 0.5 ) );
    vec3 wall = wallColour( roomSeed );
    vec3 albedo;
    int surf;
    if ( th == tz ) { albedo = wall; surf = 0; }
    else if ( th == ty ) { surf = d.y > 0.0 ? 1 : 2; albedo = d.y > 0.0 ? vec3( 0.66, 0.64, 0.6 ) : mix( vec3( 0.34, 0.21, 0.12 ), vec3( 0.42, 0.3, 0.22 ), wh( roomSeed * 8.8 ) ); }
    else { albedo = wall * 0.92; surf = 3; }
    // floorboards or a rug, a skirting board, wallpaper
    if ( surf == 2 ) {
      albedo *= 1.0 - 0.16 * fine( 0.22, fw ) * step( 0.5, fract( h.x * 4.5 ) );
      if ( abs( h.x - xOff ) < roomW * 0.28 && abs( h.z - depth * 0.45 ) < depth * 0.25 ) albedo = clothColour( roomSeed * 1.9 ) * 0.55;
    }
    if ( surf == 0 || surf == 3 ) {
      float along = surf == 0 ? h.x : h.z;
      albedo *= 1.0 - 0.06 * fine( 0.16, fw ) * ( 0.5 + 0.5 * sin( along * 40.0 ) );
      if ( h.y < floorY + 0.12 ) albedo = vec3( 0.62, 0.6, 0.56 );
    }
    if ( surf == 0 ) {
      // furniture against the back wall: a low sofa or sideboard, or a tall bookcase
      float fx = xOff + ( wh( seed * 8.3 ) - 0.5 ) * roomW * 0.45;
      float fwid = 0.45 + 0.5 * wh( seed * 1.7 );
      float tall = step( 0.62, wh( seed * 5.9 ) );
      float fh = floorY + 0.7 + 1.25 * tall;
      if ( abs( h.x - fx ) < fwid && h.y < fh ) {
        albedo = mix( vec3( 0.16, 0.1, 0.07 ), clothColour( seed * 3.1 ) * 0.45, 1.0 - tall );
        // shelves of books (their average colour when they are too small to make out)
        if ( tall > 0.5 && fract( ( h.y - floorY ) * 2.6 ) > 0.18 ) albedo *= 1.0 + ( 0.8 * wh( floor( h.x * 22.0 ) + seed ) - 0.4 ) * fine( 0.045, fw );
      }
      // a picture
      float px = xOff - ( wh( seed * 4.7 ) - 0.5 ) * roomW * 0.4;
      vec2 pic = vec2( h.x - px, h.y - ( floorY + 1.7 ) );
      if ( abs( pic.x ) < 0.3 && abs( pic.y ) < 0.21 ) albedo = abs( pic.x ) > 0.26 || abs( pic.y ) > 0.17 ? vec3( 0.3, 0.22, 0.1 ) : mix( vec3( 0.25, 0.3, 0.22 ), vec3( 0.45, 0.33, 0.2 ), wh( roomSeed * 3.9 ) );
      // a doorway through to a darker hall
      float dx = xOff + ( wh( seed * 9.9 ) - 0.5 ) * roomW * 0.7;
      if ( wh( seed * 12.1 ) > 0.55 && abs( h.x - dx ) < 0.42 && h.y < floorY + 2.05 ) albedo *= 0.12;
    }
    // the lamp: a ceiling light, or a standard lamp by the back wall (the child's room: a little lamp low down)
    bool standard = nightRoom || wh( roomSeed * 11.3 ) > 0.5;
    vec3 lampP = standard
      ? vec3( xOff + ( wh( seed * 3.7 ) > 0.5 ? 0.33 : -0.33 ) * roomW, floorY + ( nightRoom ? 0.55 : 1.4 ), depth * 0.8 )
      : vec3( xOff, ceilY - 0.3, depth * 0.45 );
    vec3 warm = nightRoom ? vec3( 1.0, 0.55, 0.25 ) : mix( vec3( 1.0, 0.6, 0.32 ), vec3( 1.0, 0.76, 0.52 ), wh( roomSeed * 2.3 ) );
    vec3 toL = lampP - h;
    // lit from the lamp (a ceiling light lights the floor and walls more than the ceiling round it)
    float fall = 0.25 + 1.5 / ( 1.0 + dot( toL, toL ) );
    if ( surf == 1 && !standard ) fall = 0.2 + 0.9 / ( 1.0 + dot( toL, toL ) * 3.0 );
    vec3 room = albedo * warm * fall;
    // the lamp itself where the view ray passes close to it (in front of what it hits)
    vec3 toLamp = lampP - p;
    float along = clamp( dot( toLamp, d ) / dot( d, d ), 0.0, th );
    vec3 near = p + d * along - lampP;
    float glow = exp( - dot( near, near ) * ( nightRoom ? 60.0 : 38.0 ) );
    room += warm * ( nightRoom ? 5.0 : 3.0 ) * glow;
    // a television in some rooms, flickering blue on the walls
    if ( wh( roomSeed * 17.3 ) > 0.8 ) room += albedo * vec3( 0.16, 0.28, 0.7 ) * ( 0.55 + 0.45 * sin( time * 7.3 + roomSeed * 20.0 ) * sin( time * 2.3 + roomSeed ) );
    float boost = group == 0 ? groupBoost[ 0 ] : group == 1 ? groupBoost[ 1 ] : group == 2 ? groupBoost[ 2 ] : groupBoost[ 3 ];
    // blazing, a room gets brighter but stays warm (not blown out to white)
    float roomLit = lit * ( boost > 1.0 ? 1.0 + ( boost - 1.0 ) * 0.5 : boost ) * vSize.z;
    // empty rooms stay dark, until the whole house blazes
    if ( dark ) roomLit *= smoothstep( 1.4, 2.2, boost );
    // the child's night light: its own small light, on whatever the house does
    if ( nightRoom ) roomLit = max( roomLit, nightLight * 0.22 );
    col = room * roomLit;
    // unlit, a room still shows a little in the moonlight coming in
    vec3 moonFill = vec3( 0.018, 0.022, 0.034 );
    col += albedo * moonFill * ( 1.0 - clamp( roomLit, 0.0, 1.0 ) );
    if ( !door ) {
      // curtains either side of the window, glowing with the lamp behind them
      float u = p.x / W + 0.5;
      float cw = 0.06 + 0.2 * wh( seed * 13.7 );
      float drape = max( 1.0 - smoothstep( cw - 0.03, cw, u ), smoothstep( 1.0 - cw, 1.0 - cw + 0.03, u ) );
      float folds = 1.0 - 0.28 * fine( 0.1, fwGlass ) * ( 0.5 + 0.5 * sin( p.x * 60.0 + seed * 20.0 ) );
      vec3 curtain = clothColour( roomSeed ) * folds * ( warm * roomLit * 0.55 + moonFill );
      col = mix( col, curtain, drape * step( 0.5, wh( roomSeed * 21.1 ) + 0.35 ) );
      // a roller blind part way down in some windows, lit through
      float blind = H * ( 1.0 - 0.15 - 0.4 * wh( seed * 23.7 ) );
      if ( wh( seed * 19.3 ) > 0.72 && p.y > blind ) {
        float bar = 1.0 - 0.5 * ( 1.0 - smoothstep( 0.015, 0.03, p.y - blind ) );
        col = vec3( 0.9, 0.84, 0.72 ) * bar * ( warm * roomLit * 0.5 + moonFill );
      }
    }
  }
  col = mix( col, sky, fres );
  gl_FragColor = vec4( col, 1.0 );
  #include <fog_fragment>
}`;

/**
 * The house's windows seen from outside at night. The glass shows rooms behind it (interior mapping:
 * each room furnished and lit differently, some left dark, a child's night light upstairs), and the lit
 * ground-floor windows throw soft, window-shaped patches of warm light on the snow a step out from the
 * wall. The windows light up in four groups for the scene where the house wakes up.
 */
export class HouseWindows {
  readonly windows: HouseWindow[] = [];
  readonly rooms: Room[] = [];
  private readonly glass: ShaderMaterial;
  private readonly pools: ShaderMaterial;
  private readonly groupBoost = [1, 1, 1, 1];

  constructor(
    private readonly exterior: Cell,
    group: Group,
  ) {
    this.findWindows();
    this.findRooms();
    this.glass = this.buildGlass();
    this.pools = this.buildPools(group);
    this.apply();
  }

  /** Re-reads NIGHT (the pools' and the lanterns' colour, the sky in the glass). */
  apply(): void {
    this.pools.uniforms.poolColor!.value.set(NIGHT.practicals.windowPool);
    this.glass.uniforms.lampColor!.value.set(NIGHT.practicals.lampColor);
    this.glass.uniforms.skyColor!.value.set(NIGHT.sky.horizon);
  }

  /** Lights (or darkens) one of the four window groups: 1 = normal, 2.8 = blazing, 0 = off. */
  setGroup(group: number, level: number): void {
    if (group >= 0 && group < 4) this.groupBoost[group] = level;
  }

  setAllGroups(level: number): void {
    this.groupBoost.fill(level);
  }

  update(): void {
    const cell = this.exterior;
    // the house's lights (with their flicker and power cuts)
    const lit = (1 - cell.night) * cell.brightness;
    this.glass.uniforms.lit!.value = lit;
    this.glass.uniforms.nightLight!.value = 0.9 + 0.1 * Math.sin(nightTime.value * 0.7);
  }

  // ---------------------------------------------------------------------------------- finding them

  /** Splits the window glass into panes (connected pieces), then joins the panes of each opening. */
  private findWindows(): void {
    const panes: Pane[] = [];
    this.exterior.root.updateMatrixWorld(true);
    this.exterior.root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material) || !/WindowGlow/.test((mesh.material as Material).name)) return;
      panes.push(...splitPanes(mesh));
    });

    // panes of one opening: same facing, same wall, touching (sashes, lights of a divided window)
    const parent = panes.map((_, i) => i);
    const find = (a: number): number => {
      while (parent[a] !== a) {
        parent[a] = parent[parent[a]!]!;
        a = parent[a]!;
      }
      return a;
    };
    for (let i = 0; i < panes.length; i++) {
      for (let j = i + 1; j < panes.length; j++) {
        const a = panes[i]!;
        const b = panes[j]!;
        if (a.dir !== b.dir || storeyOf(a.y0) !== storeyOf(b.y0) || Math.abs(a.plane - b.plane) > 0.25) continue;
        const gapAlong = Math.max(a.a0, b.a0) - Math.min(a.a1, b.a1);
        const gapUp = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
        if (gapAlong < 0.14 && gapUp < 0.3) parent[find(i)] = find(j);
      }
    }
    const openings = new Map<number, Pane[]>();
    panes.forEach((p, i) => {
      const root = find(i);
      const list = openings.get(root);
      if (list) list.push(p);
      else openings.set(root, [p]);
    });

    for (const ps of openings.values()) {
      const normal = ps[0]!.normal;
      const along = new Vector3().crossVectors(UP, normal);
      const a0 = Math.min(...ps.map((p) => p.a0));
      const a1 = Math.max(...ps.map((p) => p.a1));
      const y0 = Math.min(...ps.map((p) => p.y0));
      const y1 = Math.max(...ps.map((p) => p.y1));
      const plane = ps.reduce((s, p) => s + p.plane, 0) / ps.length;
      const width = a1 - a0;
      const height = y1 - y0;
      const centre = along.clone().multiplyScalar((a0 + a1) / 2).addScaledVector(normal, plane).setY((y0 + y1) / 2);
      const storey = storeyOf(y0);
      this.windows.push({
        panes: ps,
        centre,
        normal: normal.clone(),
        width,
        height,
        bottom: y0,
        storey,
        floorBelow: Math.min(1.1, Math.max(0.02, y0 - STOREY_FLOORS[storey]!)),
        seed: hash(centre.x * 12.9898 + centre.y * 78.233 + centre.z * 37.719),
        room: null,
        // small glass all round a light: a lantern
        lamp: width < 0.3 && height < 0.3,
      });
    }
  }

  /** Windows close together on one storey look into one room: its colours, its lamp, lit or not. */
  private findRooms(): void {
    const windows = this.windows.filter((w) => !w.lamp && w.width > 0.12 && w.height > 0.12);
    const parent = windows.map((_, i) => i);
    const find = (a: number): number => {
      while (parent[a] !== a) {
        parent[a] = parent[parent[a]!]!;
        a = parent[a]!;
      }
      return a;
    };
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const a = windows[i]!;
        const b = windows[j]!;
        if (a.storey === b.storey && Math.hypot(a.centre.x - b.centre.x, a.centre.z - b.centre.z) < 1.8) parent[find(i)] = find(j);
      }
    }
    const byRoot = new Map<number, HouseWindow[]>();
    windows.forEach((w, i) => {
      const r = find(i);
      const list = byRoot.get(r);
      if (list) list.push(w);
      else byRoot.set(r, [w]);
    });
    const rooms: { room: Room; storey: number; x: number }[] = [];
    for (const ws of byRoot.values()) {
      const middle = ws.reduce((s, w) => s.add(w.centre), new Vector3()).divideScalar(ws.length);
      const seed = hash(middle.x * 3.17 + middle.y * 11.3 + middle.z * 7.41);
      const nightLight = ws.some((w) => w.centre.distanceTo(NIGHT_LIGHT_AT) < 0.7);
      const garage = ws[0]!.storey === 0 && ws.every((w) => w.centre.x < GARAGE_X);
      const room: Room = {
        seed,
        // the child is asleep (only the night light), nobody is in the garage, and a few rooms are empty
        dark: nightLight || garage || hash(seed * 31.7) < 0.18,
        brightness: 0.75 + 0.5 * hash(seed * 47.3),
        group: 0,
        nightLight,
      };
      for (const w of ws) w.room = room;
      rooms.push({ room, storey: ws[0]!.storey, x: middle.x });
    }
    // the wake-up: the ground floor lights up from one end to the other, then the floors above
    rooms.sort((a, b) => a.storey - b.storey || a.x - b.x);
    rooms.forEach((r, i) => (r.room.group = Math.min(3, Math.floor((i * 4) / rooms.length))));
    this.rooms.push(...rooms.map((r) => r.room));
  }

  // ---------------------------------------------------------------------------------- the glass

  private buildGlass(): ShaderMaterial {
    const material = new ShaderMaterial({
      fog: true,
      side: DoubleSide,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          lit: { value: 1 },
          nightLight: { value: 1 },
          skyColor: { value: new Color() },
          lampColor: { value: new Color() },
          moonDir: { value: MOON_DIR.clone() },
        },
      ]),
      vertexShader: glassVertex,
      fragmentShader: glassFragment,
    });
    // named as the glass it replaces, so the outdoor view from inside the house leaves it out (World.HOUSE_MATERIALS)
    material.name = 'NM_WindowGlow_Rooms';
    // shared, not copied: the story and the clock change them
    material.uniforms.time = nightTime;
    material.uniforms.groupBoost = { value: this.groupBoost };

    // every vertex of a window's panes carries the window: its middle, facing, size, seeds and state
    const meshes = new Set<Mesh>();
    for (const w of this.windows) for (const p of w.panes) meshes.add(p.mesh);
    for (const mesh of meshes) {
      const count = mesh.geometry.getAttribute('position').count;
      mesh.geometry.setAttribute('winCentre', new BufferAttribute(new Float32Array(count * 4), 4));
      mesh.geometry.setAttribute('winAxis', new BufferAttribute(new Float32Array(count * 4), 4));
      mesh.geometry.setAttribute('winSize', new BufferAttribute(new Float32Array(count * 4), 4));
    }
    for (const w of this.windows) {
      const room = w.room;
      const usable = w.lamp || room !== null;
      const flags = (room?.dark ? 1 : 0) + (room?.nightLight ? 2 : 0) + (w.lamp ? 4 : 0) + (room?.group ?? 0) * 8;
      for (const p of w.panes) {
        const g = p.mesh.geometry;
        const c = g.getAttribute('winCentre') as BufferAttribute;
        const a = g.getAttribute('winAxis') as BufferAttribute;
        const s = g.getAttribute('winSize') as BufferAttribute;
        for (const i of p.verts) {
          c.setXYZW(i, w.centre.x, w.centre.y, w.centre.z, w.floorBelow);
          a.setXYZW(i, w.normal.x, w.normal.z, w.seed, room?.seed ?? 0);
          s.setXYZW(i, usable ? w.width : 0, w.height, room?.brightness ?? 1, flags);
        }
      }
    }
    for (const mesh of meshes) {
      mesh.material = material;
      mesh.castShadow = false;
    }
    return material;
  }

  // ---------------------------------------------------------------------- light on the snow

  /**
   * Under each lit ground-floor window, the light that falls out of it: a soft patch the shape of the
   * window a step out from the wall (the wall below the sill keeps the ground next to it dark), with the
   * shadow of the sash bars across it, fading the further it reaches.
   */
  private buildPools(group: Group): ShaderMaterial {
    const pos: number[] = [];
    const uv: number[] = [];
    const info: number[] = [];
    const index: number[] = [];
    for (const w of this.windows) {
      const room = w.room;
      if (!room || w.storey !== 0 || w.width < 0.2 || room.nightLight) continue;
      const out = w.normal;
      const side = new Vector3().crossVectors(UP, out);
      // the ground in front: the median of three samples, so a porch railing doesn't lift it
      const samples = [0.9, 1.6, 2.4]
        .map((d) => this.exterior.groundAt(w.centre.x + out.x * d, w.centre.z + out.z * d, w.bottom + 0.2))
        .filter((h): h is number => h !== null)
        .sort((a, b) => a - b);
      const floor = samples[Math.floor(samples.length / 2)];
      if (floor === undefined || floor > w.bottom + 0.05) continue;
      // light through the glass falls steeply: it reaches the ground a little way out, as far again as the
      // window is tall
      const sill = Math.max(0, w.bottom - floor);
      const near = 0.25 + sill * 0.5;
      const far = near + 0.8 + w.height * 0.85;
      const y = floor + 0.03;
      const base = pos.length / 3;
      const corners: [number, number, number, number][] = [
        [near, -0.55 * w.width, -1, 0],
        [near, 0.55 * w.width, 1, 0],
        [far, 0.65 * w.width + 0.12, 1, 1],
        [far, -0.65 * w.width - 0.12, -1, 1],
      ];
      for (const [d, s, u, v] of corners) {
        pos.push(w.centre.x + out.x * d + side.x * s, y, w.centre.z + out.z * d + side.z * s);
        uv.push(u, v);
        info.push(room.group + (room.dark ? 4 : 0), room.brightness);
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    geo.setAttribute('poolInfo', new BufferAttribute(new Float32Array(info), 2));
    geo.setIndex(index);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: { poolColor: { value: new Color() }, level: { value: 0 }, groupBoost: { value: this.groupBoost } },
      vertexShader: /* glsl */ `
        attribute vec2 poolInfo;
        uniform float groupBoost[ 4 ];
        varying vec2 vUv;
        varying float vLevel;
        void main() {
          vUv = uv;
          int info = int( poolInfo.x + 0.5 );
          int g = info & 3;
          float boost = g == 0 ? groupBoost[ 0 ] : g == 1 ? groupBoost[ 1 ] : g == 2 ? groupBoost[ 2 ] : groupBoost[ 3 ];
          // an empty room's window lights the snow only when the whole house blazes
          vLevel = boost * poolInfo.y * ( ( info & 4 ) != 0 ? smoothstep( 1.4, 2.2, boost ) : 1.0 );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 poolColor;
        uniform float level;
        varying vec2 vUv;
        varying float vLevel;
        void main() {
          float across = 1.0 - smoothstep( 0.4, 1.0, abs( vUv.x ) );
          float along = smoothstep( 0.0, 0.3, vUv.y ) * ( 1.0 - smoothstep( 0.35, 1.0, vUv.y ) );
          // the sash bars' shadows: a stile down the middle, the meeting rail across
          float bars = ( 1.0 - 0.65 * ( 1.0 - smoothstep( 0.025, 0.07, abs( vUv.x ) ) ) ) * ( 1.0 - 0.65 * ( 1.0 - smoothstep( 0.02, 0.055, abs( vUv.y - 0.47 ) ) ) );
          gl_FragColor = vec4( poolColor * level * vLevel * across * along * bars, 1.0 );
        }`,
    });
    const pools = new Mesh(geo, material);
    pools.name = 'window_light';
    pools.renderOrder = 5;
    pools.frustumCulled = false;
    // set as it is drawn, so the outdoor views captured for inside the house (World.captureOutdoorViews)
    // get the light of the state each is captured in
    pools.onBeforeRender = () => {
      const cell = this.exterior;
      material.uniforms.level!.value = (1 - cell.night) * cell.brightness * NIGHT.practicals.windowPoolIntensity;
    };
    group.add(pools);
    return material;
  }
}

/** Ground floor, first floor or attic, from the bottom of a piece of glass. */
function storeyOf(y: number): number {
  return y < 2.6 ? 0 : y < 7 ? 1 : 2;
}

/** The mesh's glass split into connected pieces, each measured along its (outward) facing. */
function splitPanes(mesh: Mesh): Pane[] {
  const pos = mesh.geometry.getAttribute('position');
  const nrm = mesh.geometry.getAttribute('normal');
  const index = mesh.geometry.index;
  const parent = Array.from({ length: pos.count }, (_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]!]!;
      a = parent[a]!;
    }
    return a;
  };
  const n = index ? index.count : pos.count;
  const at = (i: number) => (index ? index.getX(i) : i);
  for (let t = 0; t < n; t += 3) {
    const a = find(at(t));
    parent[find(at(t + 1))] = a;
    parent[find(at(t + 2))] = a;
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const r = find(i);
    const list = groups.get(r);
    if (list) list.push(i);
    else groups.set(r, [i]);
  }
  const rotation = new Matrix4().extractRotation(mesh.matrixWorld);
  const v = new Vector3();
  const w = new Vector3();
  const panes: Pane[] = [];
  for (const verts of groups.values()) {
    const mid = new Vector3();
    const sum = new Vector3();
    for (const i of verts) {
      mid.add(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
      if (nrm) sum.add(w.fromBufferAttribute(nrm, i).applyMatrix4(rotation));
    }
    mid.divideScalar(verts.length);
    // outward: the glass's own normal, turned away from the middle of the house, snapped to the 8
    // directions the walls and the bays' slanted sides face
    const away = mid.clone().sub(HOUSE_CENTRE).setY(0);
    const normal = sum.setY(0);
    if (normal.lengthSq() < 1e-6) normal.copy(away);
    normal.normalize();
    if (normal.dot(away) < 0) normal.negate();
    const dir = (Math.round(Math.atan2(normal.z, normal.x) / (Math.PI / 4)) + 8) % 8;
    const angle = (dir * Math.PI) / 4;
    normal.set(Math.round(Math.cos(angle) * 1e6) / 1e6, 0, Math.round(Math.sin(angle) * 1e6) / 1e6);
    const along = new Vector3().crossVectors(UP, normal);
    const pane: Pane = { mesh, verts, dir, normal, a0: Infinity, a1: -Infinity, y0: Infinity, y1: -Infinity, plane: 0 };
    for (const i of verts) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const a = v.dot(along);
      pane.a0 = Math.min(pane.a0, a);
      pane.a1 = Math.max(pane.a1, a);
      pane.y0 = Math.min(pane.y0, v.y);
      pane.y1 = Math.max(pane.y1, v.y);
      pane.plane += v.dot(normal);
    }
    pane.plane /= verts.length;
    panes.push(pane);
  }
  return panes;
}
