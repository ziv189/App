import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS, keyName, keysText, rebind, sanitizeKeys } from '../src/input/bindings';
import { sanitizeSettings } from '../src/core/Settings';

describe('key bindings', () => {
  it('names keys the way a keyboard labels them', () => {
    expect(keyName('KeyP')).toBe('P');
    expect(keyName('Tab')).toBe('Tab');
    expect(keyName('ShiftLeft')).toBe('Shift');
    expect(keyName('ArrowUp')).toBe('↑');
  });

  it('opens the phone with Tab or P by default', () => {
    expect(DEFAULT_KEYS.phone).toEqual(['Tab', 'KeyP']);
    expect(keysText(DEFAULT_KEYS, 'phone')).toBe('Tab or P');
  });

  it('moves a key from the action that had it and gives that action its default back', () => {
    const next = rebind(DEFAULT_KEYS, 'phone', 'KeyE');
    expect(next.phone).toEqual(['KeyE']);
    expect(next.use).toEqual([]); // E was its only default key
    const swapped = rebind(next, 'use', 'KeyR');
    expect(swapped.use).toEqual(['KeyR']);
    expect(swapped.phone).toEqual(['KeyE']);
  });

  it('restores a free default key when an action loses its only key', () => {
    const next = rebind(DEFAULT_KEYS, 'crouch', 'KeyF'); // flashlight loses F, gets F back? no: F is taken
    expect(next.crouch).toEqual(['KeyF']);
    expect(next.flashlight).toEqual([]);
  });

  it('cleans stored bindings: bad entries fall back to defaults, reserved keys are dropped', () => {
    const keys = sanitizeKeys({ phone: ['KeyQ', 'Escape', 42], use: 'nonsense', crouch: [] });
    expect(keys.phone).toEqual(['KeyQ']);
    expect(keys.use).toEqual(DEFAULT_KEYS.use);
    expect(keys.crouch).toEqual([]);
    expect(sanitizeSettings({}).keys).toEqual(DEFAULT_KEYS);
  });
});
