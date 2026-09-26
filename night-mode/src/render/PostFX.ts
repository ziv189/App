import { N8AOPostPass } from 'n8ao';
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  type Pass,
} from 'postprocessing';
import { HalfFloatType, Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
import { NIGHT } from './nightConfig';
import { NightGrade } from './NightGrade';
import type { QualityPreset } from './quality';

/** Level-tunable look. The delusion system will drive several of these at runtime later. */
export interface LookSettings {
  exposure: number;
  toneMapping: ToneMappingMode;
  bloomIntensity: number;
  bloomThreshold: number;
  vignetteDarkness: number;
  grain: number;
  chromaticAberration: number;
  aoIntensity: number;
  /** World-space AO radius in metres (roughly the size of the crevices that darken). */
  aoRadius: number;
}

/** The look from the night config (NIGHT): tone mapping, bloom, lens. */
function nightLook(): Partial<LookSettings> {
  return {
    toneMapping: NIGHT.grade.toneMapping === 'aces' ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.AGX,
    bloomIntensity: NIGHT.bloom.intensity,
    bloomThreshold: NIGHT.bloom.threshold,
    vignetteDarkness: NIGHT.lens.vignette,
    grain: NIGHT.lens.grain,
  };
}

export const DEFAULT_LOOK: LookSettings = {
  exposure: 1,
  toneMapping: ToneMappingMode.ACES_FILMIC,
  bloomIntensity: 0.75,
  bloomThreshold: 0.82,
  vignetteDarkness: 0.6,
  grain: 0.1,
  chromaticAberration: 0.0006,
  aoIntensity: 2.5,
  aoRadius: 1.2,
  ...nightLook(),
};

/**
 * Post-processing chain (pmndrs "postprocessing" + N8AO):
 *   scene (linear HDR) -> ambient occlusion -> bloom + tone mapping + night grade -> SMAA -> lens & film
 *   (chromatic aberration, vignette, grain, dithering) -> screen
 */
export class PostFX {
  readonly composer: EffectComposer;
  readonly ao: N8AOPostPass;
  readonly bloom: BloomEffect;
  readonly toneMapping: ToneMappingEffect;
  readonly grade: NightGrade;
  readonly smaa: SMAAEffect;
  readonly chromaticAberration: ChromaticAberrationEffect;
  readonly vignette: VignetteEffect;
  readonly grain: NoiseEffect;

  private readonly renderPass: RenderPass;
  private effectPasses: EffectPass[] = [];
  private look: LookSettings = { ...DEFAULT_LOOK };
  private bloomEnabled = true;
  private aoEnabled = true;

  constructor(
    private readonly renderer: WebGLRenderer,
    scene: Scene,
    private readonly camera: PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
    this.renderPass = new RenderPass(scene, camera);
    this.ao = new N8AOPostPass(scene, camera, 1, 1);
    this.ao.configuration.distanceFalloff = 1;
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceSmoothing: NIGHT.bloom.smoothing, radius: NIGHT.bloom.radius });
    this.toneMapping = new ToneMappingEffect({ mode: DEFAULT_LOOK.toneMapping });
    this.grade = new NightGrade();
    this.smaa = new SMAAEffect();
    this.chromaticAberration = new ChromaticAberrationEffect({
      offset: new Vector2(),
      radialModulation: true,
      modulationOffset: 0.25,
    });
    this.vignette = new VignetteEffect({ offset: 0.32 });
    // Overlay-blended noise darkens and lightens equally: reads as film grain, not haze.
    this.grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
    this.setLook(this.look);
    this.rebuild();
  }

  applyQuality(preset: QualityPreset): void {
    this.smaa.applyPreset(preset.smaa);
    this.aoEnabled = preset.ambientOcclusion !== false;
    if (preset.ambientOcclusion) {
      this.ao.setQualityMode(preset.ambientOcclusion.mode);
      this.ao.configuration.halfRes = preset.ambientOcclusion.halfRes;
    }
    this.bloomEnabled = preset.bloom;
    this.rebuild();
  }

  getLook(): Readonly<LookSettings> {
    return this.look;
  }

  /** Re-reads the night config (NIGHT): tone mapping, bloom, lens and the grade. */
  applyNight(): void {
    this.bloom.luminanceMaterial.smoothing = NIGHT.bloom.smoothing;
    this.bloom.mipmapBlurPass.radius = NIGHT.bloom.radius;
    this.grade.apply();
    this.setLook(this.dayLook ? {} : nightLook());
  }

  private dayLook = false;

  /**
   * The dawn after one ending keeps the game's original day look: its own tone mapping (AgX) and no
   * night grade. Everything else is night.
   */
  setDayLook(day: boolean): void {
    if (day === this.dayLook) return;
    this.dayLook = day;
    this.grade.setDay(day);
    this.toneMapping.mode = day ? ToneMappingMode.AGX : (nightLook().toneMapping ?? ToneMappingMode.ACES_FILMIC);
  }

  /** The player's gamma (Settings). */
  setGamma(gamma: number): void {
    this.grade.gamma = gamma;
  }

  setLook(patch: Partial<LookSettings>): void {
    this.look = { ...this.look, ...patch };
    const l = this.look;
    this.renderer.toneMappingExposure = l.exposure;
    this.toneMapping.mode = l.toneMapping;
    this.bloom.intensity = l.bloomIntensity;
    this.bloom.luminanceMaterial.threshold = l.bloomThreshold;
    this.vignette.darkness = l.vignetteDarkness;
    this.grain.blendMode.opacity.value = l.grain;
    this.chromaticAberration.offset.set(l.chromaticAberration, l.chromaticAberration);
    this.ao.configuration.intensity = l.aoIntensity;
    this.ao.configuration.aoRadius = l.aoRadius;
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height, false);
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  /** Recreates the pass list (effects keep their settings). Convolution effects need separate passes. */
  private rebuild(): void {
    for (const pass of this.composer.passes.slice()) this.composer.removePass(pass);
    for (const pass of this.effectPasses) pass.fullscreenMaterial.dispose();

    const hdrEffects = this.bloomEnabled ? [this.bloom, this.toneMapping, this.grade] : [this.toneMapping, this.grade];
    const lens = new EffectPass(this.camera, this.chromaticAberration, this.vignette, this.grain);
    // dark gradients (night sky, fog) band on 8-bit screens without it
    lens.dithering = true;
    this.effectPasses = [new EffectPass(this.camera, ...hdrEffects), new EffectPass(this.camera, this.smaa), lens];
    const passes: Pass[] = [this.renderPass];
    if (this.aoEnabled) passes.push(this.ao);
    passes.push(...this.effectPasses);
    for (const pass of passes) this.composer.addPass(pass);
  }
}
