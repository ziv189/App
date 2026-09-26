import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings, SettingsStore } from '../src/core/Settings';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('sanitizeSettings', () => {
  it('fills defaults for missing or broken saves', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('garbage')).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range values and rejects unknown quality levels', () => {
    const s = sanitizeSettings({ fov: 400, mouseSensitivity: -3, quality: 'insane', headBob: 'yes' });
    expect(s.fov).toBe(110);
    expect(s.mouseSensitivity).toBe(0.1);
    expect(s.quality).toBe(DEFAULT_SETTINGS.quality);
    expect(s.headBob).toBe(DEFAULT_SETTINGS.headBob);
  });
});

describe('SettingsStore', () => {
  it('persists changes and notifies listeners', () => {
    const storage = memoryStorage();
    const store = new SettingsStore(storage);
    let notified = 0;
    store.onChange(() => notified++);
    store.update({ quality: 'low', invertY: true });
    expect(notified).toBe(1);
    expect(new SettingsStore(storage).get()).toMatchObject({ quality: 'low', invertY: true });
  });

  it('works without storage (private browsing)', () => {
    const store = new SettingsStore(null);
    store.update({ fov: 100 });
    expect(store.get().fov).toBe(100);
  });
});
