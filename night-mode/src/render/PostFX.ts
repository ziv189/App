import { N8AOPostPass } from 'n8ao';
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  type Pass,
} from 'postprocessing';
import { HalfFloatType, Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
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
  /** Colour saturation after tone mapping, -1..1 (AgX desaturates bright colours; this gives some back). */
  saturation: number;
}

export const DEFAULT_LOOK: LookSettings = {
  exposure: 1,
  toneMapping: ToneMappingMode.AGX,
  bloomIntensity: 0.55,
  bloomThreshold: 0.85,
  vignetteDarkness: 0.55,
  grain: 0.12,
  chromaticAberration: 0.0006,
  aoIntensity: 2.5,
  aoRadius: 1.2,
  saturation: 0.18,
};

/**
 * Post-processing chain (pmndrs "postprocessing" + N8AO):
 *   scene (linear HDR) -> ambient occlusion -> bloom + tone mapping -> SMAA -> lens & film
 *   (chromatic aberration, vignette, grain) -> screen
 */
export class PostFX {
  readonly composer: EffectComposer;
  readonly ao: N8AOPostPass;
  readonly bloom: BloomEffect;
  readonly toneMapping: ToneMappingEffect;
  readonly saturation: HueSaturationEffect;
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
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceSmoothing: 0.25, radius: 0.72 });
    this.toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    this.saturation = new HueSaturationEffect({ saturation: DEFAULT_LOOK.saturation });
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
    this.saturation.saturation = l.saturation;
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

    const hdrEffects = this.bloomEnabled ? [this.bloom, this.toneMapping, this.saturation] : [this.toneMapping, this.saturation];
    this.effectPasses = [
      new EffectPass(this.camera, ...hdrEffects),
      new EffectPass(this.camera, this.smaa),
      new EffectPass(this.camera, this.chromaticAberration, this.vignette, this.grain),
    ];
    const passes: Pass[] = [this.renderPass];
    if (this.aoEnabled) passes.push(this.ao);
    passes.push(...this.effectPasses);
    for (const pass of passes) this.composer.addPass(pass);
  }
}
