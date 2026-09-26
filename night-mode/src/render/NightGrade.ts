import { Effect } from 'postprocessing';
import { Uniform, Vector3 } from 'three';
import { NIGHT } from './nightConfig';

const fragmentShader = /* glsl */ `
uniform vec3 shadowTint;
uniform vec3 highlightTint;
uniform float splitStrength;
uniform float saturation;
uniform float contrast;
uniform float pivot;
uniform float gamma;
uniform float blackLevel;

vec3 toDisplay( vec3 c ) { return pow( max( c, 0.0 ), vec3( 1.0 / 2.2 ) ); }
vec3 toLinear( vec3 c ) { return pow( max( c, 0.0 ), vec3( 2.2 ) ); }

void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  const vec3 W = vec3( 0.2126, 0.7152, 0.0722 );
  vec3 p = toDisplay( inputColor.rgb );
  float l = dot( p, W );
  // less colour, as the eye sees at night
  p = mix( vec3( l ), p, 1.0 + saturation );
  // contrast around a low pivot: deeper darks without clipping the lamps
  p = max( ( p - pivot ) * contrast + pivot, 0.0 );
  // split toning: cool shadows, warm highlights (hue shifts that keep the brightness)
  l = dot( p, W );
  float s = 1.0 - smoothstep( 0.0, 0.55, l );
  float h = smoothstep( 0.35, 1.0, l );
  p += ( shadowTint - dot( shadowTint, W ) ) * splitStrength * s + ( highlightTint - dot( highlightTint, W ) ) * splitStrength * h;
  // the player's gamma, then a floor so shadows never crush to pure black
  p = pow( max( p, 0.0 ), vec3( 1.0 / gamma ) );
  p = blackLevel + p * ( 1.0 - blackLevel );
  outputColor = vec4( toLinear( p ), inputColor.a );
}`;

const DAY_GRADE = {
  shadowTint: '#808080',
  highlightTint: '#808080',
  splitStrength: 0,
  saturation: 0.18,
  contrast: 1,
  pivot: 0.5,
  blackLevel: 0,
};

const srgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** The night colour grade (NIGHT.grade), after tone mapping. */
export class NightGrade extends Effect {
  constructor() {
    super('NightGrade', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['shadowTint', new Uniform(new Vector3())],
        ['highlightTint', new Uniform(new Vector3())],
        ['splitStrength', new Uniform(0)],
        ['saturation', new Uniform(0)],
        ['contrast', new Uniform(1)],
        ['pivot', new Uniform(0.3)],
        ['gamma', new Uniform(1)],
        ['blackLevel', new Uniform(0)],
      ]),
    });
    this.apply();
  }

  private day = false;

  /**
   * The day look (the dawn after one ending): the game's original grade, which only gave back some of
   * the saturation AgX tone mapping takes. Otherwise the night grade.
   */
  setDay(day: boolean): void {
    this.day = day;
    this.apply();
  }

  /** Pushes NIGHT.grade (or the day look) to the shader. */
  apply(): void {
    const g = this.day ? DAY_GRADE : NIGHT.grade;
    const u = this.uniforms;
    u.get('shadowTint')!.value = srgb(g.shadowTint);
    u.get('highlightTint')!.value = srgb(g.highlightTint);
    u.get('splitStrength')!.value = g.splitStrength;
    u.get('saturation')!.value = g.saturation;
    u.get('contrast')!.value = g.contrast;
    u.get('pivot')!.value = g.pivot;
    u.get('blackLevel')!.value = g.blackLevel;
  }

  /** The player's gamma setting (1 = neutral, higher = brighter midtones). */
  set gamma(value: number) {
    this.uniforms.get('gamma')!.value = value;
  }
}
