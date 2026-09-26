import type { N8AOQualityMode } from 'n8ao';
import { SMAAPreset } from 'postprocessing';

export const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export interface QualityPreset {
  /** Render resolution relative to the window, before the pixel-ratio cap. */
  resolutionScale: number;
  /** Cap on devicePixelRatio (high-DPI laptops would otherwise render 4x the pixels). */
  maxPixelRatio: number;
  ambientOcclusion: false | { mode: N8AOQualityMode; halfRes: boolean };
  bloom: boolean;
  smaa: SMAAPreset;
  shadowMapSize: number;
  anisotropy: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    resolutionScale: 0.75,
    maxPixelRatio: 1,
    ambientOcclusion: false,
    bloom: false,
    smaa: SMAAPreset.LOW,
    shadowMapSize: 1024,
    anisotropy: 2,
  },
  medium: {
    resolutionScale: 1,
    maxPixelRatio: 1,
    ambientOcclusion: { mode: 'Low', halfRes: true },
    bloom: true,
    smaa: SMAAPreset.MEDIUM,
    shadowMapSize: 2048,
    anisotropy: 4,
  },
  high: {
    resolutionScale: 1,
    maxPixelRatio: 1.5,
    ambientOcclusion: { mode: 'Medium', halfRes: false },
    bloom: true,
    smaa: SMAAPreset.HIGH,
    shadowMapSize: 2048,
    anisotropy: 8,
  },
  ultra: {
    resolutionScale: 1,
    maxPixelRatio: 2,
    ambientOcclusion: { mode: 'High', halfRes: false },
    bloom: true,
    smaa: SMAAPreset.ULTRA,
    shadowMapSize: 4096,
    anisotropy: 16,
  },
};

export function pixelRatioFor(preset: QualityPreset, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, preset.maxPixelRatio) * preset.resolutionScale;
}
