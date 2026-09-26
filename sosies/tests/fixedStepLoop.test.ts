import { describe, expect, it } from 'vitest';
import { FixedStepLoop } from '../src/core/FixedStepLoop';

describe('FixedStepLoop', () => {
  it('runs one step per 1/60 s regardless of frame rate', () => {
    for (const hz of [30, 60, 144, 240]) {
      const loop = new FixedStepLoop(1 / 60);
      let steps = 0;
      for (let i = 0; i < hz; i++) loop.advance(1 / hz, () => steps++);
      // One second of frames => ~60 steps at any refresh rate.
      expect(steps).toBeGreaterThanOrEqual(59);
      expect(steps).toBeLessThanOrEqual(60);
    }
  });

  it('returns an interpolation factor in [0, 1)', () => {
    const loop = new FixedStepLoop(1 / 60);
    const alpha = loop.advance(1 / 120, () => {});
    expect(alpha).toBeCloseTo(0.5, 5);
  });

  it('clamps long hitches instead of fast-forwarding', () => {
    const loop = new FixedStepLoop(1 / 60, 0.25, 100);
    let steps = 0;
    loop.advance(5, () => steps++); // a 5 s freeze (e.g. breakpoint)
    expect(steps).toBe(15); // 0.25 s worth
  });

  it('caps steps per frame and drops the backlog', () => {
    const loop = new FixedStepLoop(1 / 60, 1, 4);
    let steps = 0;
    const alpha = loop.advance(1, () => steps++);
    expect(steps).toBe(4);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
  });
});
