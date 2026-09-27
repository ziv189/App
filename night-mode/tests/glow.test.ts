import { Color, DataTexture, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { glowOf } from '../src/world/Cell';

function exported(userData: Record<string, unknown>, emissive = 0x000000, intensity = 1): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({ emissive, emissiveIntensity: intensity });
  mat.userData = userData;
  return mat;
}

describe('glowing materials', () => {
  it('glows in the moonlight even though it was exported with the lights on (black)', () => {
    const stars = exported({ nm_emit_states: 'moon', nm_emit_color: '#b8ffae', nm_emit_strength: 1.2 });
    const glow = glowOf(stars)!;
    expect(glow.color.equals(new Color('#b8ffae'))).toBe(true);
    expect(glow.intensity).toBeCloseTo(1.2);
    expect([...glow.states]).toEqual(['moon']);
  });

  it('keeps the glow a lamp was exported with', () => {
    const bulb = exported({ nm_emit_states: 'on', nm_emit_color: '#ffd2a0', nm_emit_strength: 4 }, 0xffd2a0, 4);
    const glow = glowOf(bulb)!;
    expect(glow.color.equals(bulb.emissive)).toBe(true);
    expect(glow.intensity).toBe(bulb.emissiveIntensity);
    // older rooms: nothing but the states in the extras
    const old = glowOf(exported({ nm_emit_states: 'on,moon' }, 0x3f8cff, 4))!;
    expect(old.color.getHex()).toBe(0x3f8cff);
    expect(old.intensity).toBe(4);
  });

  it('follows the colour texture when textured, and leaves other materials alone', () => {
    const blind = exported({ nm_emit_states: 'moon', nm_emit_color: '#8a9cc4', nm_emit_strength: 0.3, nm_emit_textured: 1 });
    blind.map = new DataTexture(new Uint8Array(4), 1, 1);
    glowOf(blind);
    expect(blind.emissiveMap).toBe(blind.map);
    expect(glowOf(exported({}))).toBeNull();
  });
});
