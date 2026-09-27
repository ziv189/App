import { Box3, Scene, ShaderMaterial, Vector3, type Vector2, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { WindowSnow } from '../src/fx/WindowSnow';
import type { Cell } from '../src/world/Cell';

const renderer = { getDrawingBufferSize: (v: Vector2) => v.set(1280, 720) } as unknown as WebGLRenderer;
const room = (exterior: boolean, night = 0) =>
  ({ def: { exterior }, bounds: new Box3(new Vector3(-2, 0, -3), new Vector3(3, 3, 4)), night, brightness: 1 }) as unknown as Cell;

describe('snow past the windows', () => {
  it('falls outside the room only, and only indoors', () => {
    const scene = new Scene();
    const snow = new WindowSnow(scene, 100);
    expect(scene.children).toContain(snow.points);
    snow.update(room(false), renderer);
    expect(snow.points.visible).toBe(true);
    const u = (snow.points.material as ShaderMaterial).uniforms;
    // the room's own bounds (a little larger) are where no flake is drawn
    expect(u.roomMin!.value.x).toBeCloseTo(-2.02);
    expect(u.roomMax!.value.z).toBeCloseTo(4.02);
    expect(u.roomLit!.value).toBe(1);
    expect(u.viewHeight!.value).toBe(720);
    // the lights out: no warm light from the house on the flakes
    snow.update(room(false, 1), renderer);
    expect(u.roomLit!.value).toBe(0);
    // outside, the garden's own snowfall takes over
    snow.update(room(true), renderer);
    expect(snow.points.visible).toBe(false);
    snow.update(null, renderer);
    expect(snow.points.visible).toBe(false);
  });

  it('halves for the Low preset', () => {
    const snow = new WindowSnow(new Scene(), 100);
    snow.setDetail(false);
    expect(snow.points.geometry.drawRange.count).toBe(50);
    snow.setDetail(true);
    expect(snow.points.geometry.drawRange.count).toBe(100);
  });
});
