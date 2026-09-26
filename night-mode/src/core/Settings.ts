import { DEFAULT_KEYS, sanitizeKeys, type KeyBindings } from '../input/bindings';
import { QUALITY_LEVELS, type QualityLevel } from '../render/quality';

export interface Settings {
  quality: QualityLevel;
  /** Multiplier on the base mouse look speed. */
  mouseSensitivity: number;
  /** Multiplier on the base controller look speed. */
  gamepadSensitivity: number;
  invertY: boolean;
  /** Horizontal field of view in degrees, measured on a 16:9 screen (wider screens see more). */
  fov: number;
  headBob: boolean;
  /** Screen brightness multiplier (exposure). */
  brightness: number;
  /** Midtone gamma after the grade: above 1 lifts the shadows (dark screens, bright rooms). */
  gamma: number;
  /** Master volume 0..1. */
  volume: number;
  subtitles: boolean;
  /** Keyboard keys for each action (see input/bindings.ts). */
  keys: KeyBindings;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  quality: 'high',
  mouseSensitivity: 1,
  gamepadSensitivity: 1,
  invertY: false,
  fov: 90,
  headBob: true,
  brightness: 1,
  gamma: 1,
  volume: 0.9,
  subtitles: true,
  keys: DEFAULT_KEYS as KeyBindings,
};

const STORAGE_KEY = 'nightmode.settings.v1';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Turns anything (e.g. an old or hand-edited save) into valid settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    quality: QUALITY_LEVELS.includes(r.quality as QualityLevel) ? (r.quality as QualityLevel) : d.quality,
    mouseSensitivity: num(r.mouseSensitivity, d.mouseSensitivity, 0.1, 4),
    gamepadSensitivity: num(r.gamepadSensitivity, d.gamepadSensitivity, 0.2, 3),
    invertY: bool(r.invertY, d.invertY),
    fov: num(r.fov, d.fov, 70, 110),
    headBob: bool(r.headBob, d.headBob),
    brightness: num(r.brightness, d.brightness, 0.6, 1.8),
    gamma: num(r.gamma, d.gamma, 0.7, 1.6),
    volume: num(r.volume, d.volume, 0, 1),
    subtitles: bool(r.subtitles, d.subtitles),
    keys: sanitizeKeys(r.keys),
  };
}

/** Settings persisted in this browser. Storage can be unavailable (private mode), so it never throws. */
export class SettingsStore {
  private value: Settings;
  private listeners = new Set<(s: Settings) => void>();

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage()) {
    let stored: unknown = null;
    try {
      const text = this.storage?.getItem(STORAGE_KEY);
      stored = text ? JSON.parse(text) : null;
    } catch {
      stored = null;
    }
    this.value = sanitizeSettings(stored);
  }

  get(): Readonly<Settings> {
    return this.value;
  }

  update(patch: Partial<Settings>): void {
    this.value = sanitizeSettings({ ...this.value, ...patch });
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.value));
    } catch {
      // Not fatal: settings just won't survive a reload.
    }
    for (const fn of this.listeners) fn(this.value);
  }

  onChange(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
