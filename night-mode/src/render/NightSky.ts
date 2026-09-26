import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from 'three';
import { NIGHT } from './nightConfig';

/** Seconds since start, shared by every animated night shader (sky, sway, mist, lamps). */
export const nightTime = { value: 0 };

/** Direction towards the moon (game space, normalised). */
export const MOON_DIR = new Vector3(...NIGHT.moonDirection).normalize();

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  // a dome at infinity: rotate with the view but never move, and sit on the far plane
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
  gl_Position = p.xyww;
}`;

const fragmentShader = /* glsl */ `
uniform float time;
uniform vec3 moonDir;
uniform vec3 zenithColor;
uniform vec3 horizonColor;
uniform vec3 hazeColor;
uniform vec3 townColor;
uniform vec3 townDir;
uniform float townStrength;
uniform float brightness;
uniform float starDensity;
uniform float starBrightness;
uniform float twinkle;
uniform float milkyWay;
uniform vec3 moonColor;
uniform vec3 glowColor;
uniform float moonRadius;
uniform float moonIntensity;
uniform float glow;
uniform float halo;
uniform float ring;
uniform float cloudCoverage;
uniform float cloudScale;
uniform float cloudOpacity;
uniform vec2 cloudOffset;
uniform vec3 cloudShadow;
uniform vec3 cloudLit;
varying vec3 vDir;

float hash13( vec3 p ) {
  p = fract( p * 0.1031 );
  p += dot( p, p.zyx + 31.32 );
  return fract( ( p.x + p.y ) * p.z );
}
vec3 hash33( vec3 p ) {
  p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
  p += dot( p, p.yxz + 33.33 );
  return fract( ( p.xxy + p.yxx ) * p.zyx );
}
float hash12( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
float noise2( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash12( i ), hash12( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash12( i + vec2( 0.0, 1.0 ) ), hash12( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
float noise3( vec3 p ) {
  vec3 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float a = mix( mix( hash13( i ), hash13( i + vec3( 1, 0, 0 ) ), f.x ), mix( hash13( i + vec3( 0, 1, 0 ) ), hash13( i + vec3( 1, 1, 0 ) ), f.x ), f.y );
  float b = mix( mix( hash13( i + vec3( 0, 0, 1 ) ), hash13( i + vec3( 1, 0, 1 ) ), f.x ), mix( hash13( i + vec3( 0, 1, 1 ) ), hash13( i + vec3( 1, 1, 1 ) ), f.x ), f.y );
  return mix( a, b, f.z );
}
float fbm( vec2 p ) {
  float s = 0.0, a = 0.5;
  for ( int i = 0; i < 5; i++ ) {
    s += a * noise2( p );
    p = mat2( 1.6, 1.2, -1.2, 1.6 ) * p + 7.3;
    a *= 0.5;
  }
  return s;
}

// Two layers of stars: a point in some cells of a 3D grid, lit where the sky sphere passes close to it.
vec3 starLayer( vec3 d, float scale, float keep, float seed, float band ) {
  vec3 p = d * scale;
  vec3 id = floor( p );
  vec3 h = hash33( id + seed );
  float present = step( keep - band, hash13( id * 1.7 + seed + 3.1 ) );
  vec3 pos = 0.2 + 0.6 * h;
  float dist = length( fract( p ) - pos );
  // at least about a pixel wide (so stars don't shimmer), keeping their brightness when widened
  float px = length( fwidth( p ) ) * 0.7;
  float r0 = 0.02 + 0.045 * h.z * h.z;
  float r = max( r0, px );
  float core = exp( - dist * dist / ( r * r ) ) * min( 1.0, ( r0 * r0 ) / ( r * r ) * 1.6 );
  // a few bright stars, many faint ones
  float mag = pow( h.x, 9.0 ) * 9.0 + 0.012;
  float tw = 1.0 + twinkle * ( 0.55 * sin( time * ( 1.7 + 4.0 * h.y ) + h.z * 40.0 ) + 0.3 * sin( time * ( 6.0 + 9.0 * h.x ) + h.y * 23.0 ) );
  vec3 tint = mix( vec3( 0.72, 0.8, 1.0 ), vec3( 1.0, 0.85, 0.68 ), h.y * h.y );
  return present * core * mag * max( tw, 0.0 ) * tint;
}

void main() {
  vec3 d = normalize( vDir );
  float up = d.y;
  float h = max( up, 0.0 );
  float cosA = dot( d, moonDir );

  // ---- gradient: near black above, deep blue-purple at the horizon, haze right on it
  vec3 sky = mix( horizonColor, zenithColor, pow( smoothstep( 0.0, 1.0, h ), 0.5 ) );
  float hazeK = exp( - h * 16.0 );
  sky = mix( sky, hazeColor, hazeK );
  // a warm glow of the town, low over the horizon
  vec3 flatDir = normalize( vec3( d.x, 0.0, d.z ) + 1e-5 );
  sky += townColor * townStrength * pow( max( dot( flatDir, townDir ), 0.0 ), 3.0 ) * exp( - h * 10.0 );
  // the moon lightens the sky around it
  sky += glowColor * halo * 0.35 * pow( max( cosA, 0.0 ), 5.0 );

  // ---- the Milky Way: a faint, patchy band
  vec3 mwN = normalize( vec3( 0.35, 0.55, -0.76 ) );
  float bandD = dot( d, mwN );
  float band = exp( - bandD * bandD / 0.03 );
  float mwNoise = noise3( d * 6.0 ) * 0.6 + noise3( d * 17.0 ) * 0.4;
  vec3 milky = vec3( 0.55, 0.6, 0.8 ) * milkyWay * 0.012 * band * smoothstep( 0.3, 0.8, mwNoise ) * smoothstep( 0.0, 0.25, h );

  // ---- stars (thicker in the band), fading into the horizon haze
  vec3 stars = starLayer( d, starDensity, 0.9, 0.0, band * 0.35 ) + starLayer( d, starDensity * 0.42, 0.96, 19.0, band * 0.12 ) * 1.8;
  stars *= starBrightness * smoothstep( 0.02, 0.22, h );

  // ---- clouds: drifting fbm on a flat layer, moonlit edges near the moon
  vec2 cuv = d.xz / ( h + 0.14 ) * cloudScale * 0.3 + cloudOffset;
  float n = fbm( cuv );
  float density = smoothstep( 1.0 - cloudCoverage - 0.12, 1.0 - cloudCoverage + 0.3, n ) * smoothstep( 0.0, 0.16, h );
  float n2 = fbm( cuv + normalize( moonDir.xz + 1e-4 ) * 0.07 );
  float facing = clamp( 0.45 + ( n - n2 ) * 4.0, 0.0, 1.0 );
  float nearMoon = pow( max( cosA, 0.0 ), 10.0 );
  vec3 cloudCol = mix( cloudShadow, cloudLit, clamp( facing * 0.3 + nearMoon * ( 1.1 - density * 0.5 ), 0.0, 1.0 ) );
  // thin edges light up around the moon (forward scattering: a silver lining)
  cloudCol += glowColor * pow( max( cosA, 0.0 ), 40.0 ) * density * ( 1.0 - density ) * 6.0;
  float cover = density * cloudOpacity;

  // ---- the moon: disc with dark seas and limb darkening, glow, halo and the 22-degree ring
  float ang = acos( clamp( cosA, -1.0, 1.0 ) );
  vec3 moon = vec3( 0.0 );
  if ( ang < moonRadius * 1.3 ) {
    vec3 mx = normalize( cross( moonDir, vec3( 0.0, 1.0, 0.0 ) ) );
    vec3 my = cross( mx, moonDir );
    vec2 m = vec2( dot( d, mx ), dot( d, my ) ) / sin( moonRadius );
    float limb = sqrt( max( 0.0, 1.0 - dot( m, m ) ) );
    float seas = smoothstep( 0.42, 0.62, fbm( m * 2.2 + 11.0 ) );
    float albedo = mix( 1.0, 0.62, seas ) * ( 0.9 + 0.1 * noise2( m * 22.0 ) );
    float disc = 1.0 - smoothstep( moonRadius * 0.965, moonRadius, ang );
    moon = moonColor * moonIntensity * albedo * ( 0.5 + 0.5 * limb ) * disc;
  }
  float outside = max( ang - moonRadius, 0.0 );
  vec3 moonGlow = glowColor * ( glow * exp( - outside / 0.014 ) + halo * exp( - outside / 0.2 ) + ring * exp( - pow( ( ang - 0.384 ) / 0.014, 2.0 ) ) );

  vec3 col = sky + milky * ( 1.0 - hazeK ) + stars;
  col = mix( col, cloudCol, cover );
  col += moon * ( 1.0 - cover * 0.92 ) + moonGlow * ( 1.0 - cover * 0.45 );
  if ( up < 0.0 ) col = hazeColor;
  gl_FragColor = vec4( col * brightness, 1.0 );
}`;

/**
 * The night sky outdoors: drawn behind everything (on the far plane, so every camera sees it, the
 * reflection probe and the view out of the windows included). It replaces the graded daytime photo
 * the game used before; the dawn after one ending still uses that photo.
 */
export class NightSky {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  private readonly offset = new Vector2();

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        time: nightTime,
        moonDir: { value: MOON_DIR },
        zenithColor: { value: new Color() },
        horizonColor: { value: new Color() },
        hazeColor: { value: new Color() },
        townColor: { value: new Color() },
        townDir: { value: new Vector3() },
        townStrength: { value: 0 },
        brightness: { value: 1 },
        starDensity: { value: 1 },
        starBrightness: { value: 1 },
        twinkle: { value: 0 },
        milkyWay: { value: 0 },
        moonColor: { value: new Color() },
        glowColor: { value: new Color() },
        moonRadius: { value: 0.02 },
        moonIntensity: { value: 1 },
        glow: { value: 0 },
        halo: { value: 0 },
        ring: { value: 0 },
        cloudCoverage: { value: 0 },
        cloudScale: { value: 1 },
        cloudOpacity: { value: 0 },
        cloudOffset: { value: this.offset },
        cloudShadow: { value: new Color() },
        cloudLit: { value: new Color() },
      },
    });
    this.mesh = new Mesh(new SphereGeometry(1, 48, 24), this.material);
    this.mesh.name = 'night_sky';
    this.mesh.frustumCulled = false;
    // after the opaque scene: it only fills the pixels nothing else covered
    this.mesh.renderOrder = 1_000_000;
    this.apply();
  }

  /** Pushes NIGHT.sky to the shader (call after changing the config). */
  apply(): void {
    const s = NIGHT.sky;
    const u = this.material.uniforms;
    u.zenithColor!.value.set(s.zenith);
    u.horizonColor!.value.set(s.horizon);
    u.hazeColor!.value.set(NIGHT.fog.color).lerp(new Color(s.haze), 0.5);
    u.townColor!.value.set(s.townGlow);
    const az = (s.townGlowAzimuth * Math.PI) / 180;
    u.townDir!.value.set(Math.sin(az), 0, -Math.cos(az));
    u.townStrength!.value = s.townGlowStrength;
    u.brightness!.value = s.brightness;
    u.starDensity!.value = s.stars.density;
    u.starBrightness!.value = s.stars.brightness;
    u.twinkle!.value = s.stars.twinkle;
    u.milkyWay!.value = s.stars.milkyWay;
    u.moonColor!.value.set(s.moon.color);
    u.glowColor!.value.set(s.moon.glowColor);
    u.moonRadius!.value = (s.moon.radiusDeg * Math.PI) / 180;
    u.moonIntensity!.value = s.moon.intensity;
    u.glow!.value = s.moon.glow;
    u.halo!.value = s.moon.halo;
    u.ring!.value = s.moon.ring;
    u.cloudCoverage!.value = s.clouds.coverage;
    u.cloudScale!.value = s.clouds.scale;
    u.cloudOpacity!.value = s.clouds.opacity;
    u.cloudShadow!.value.set(s.clouds.shadow);
    u.cloudLit!.value.set(s.clouds.lit);
  }

  update(dt: number): void {
    const [sx, sz] = NIGHT.sky.clouds.speed;
    this.offset.x += sx * dt;
    this.offset.y += sz * dt;
  }
}
