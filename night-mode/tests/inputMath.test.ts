import { describe, expect, it } from 'vitest';
import { applyResponseCurve, clampLength, radialDeadzone, verticalFovFromHorizontal16x9 } from '../src/input/math';

describe('radialDeadzone', () => {
  it('ignores small stick drift', () => {
    expect(radialDeadzone(0.1, 0.05)).toEqual({ x: 0, y: 0 });
  });

  it('reaches full output at the outer edge and keeps direction', () => {
    const v = radialDeadzone(0.95 * Math.SQRT1_2, 0.95 * Math.SQRT1_2);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 5);
    expect(v.x).toBeCloseTo(v.y, 10);
  });

  it('starts from zero just outside the dead zone (no jump)', () => {
    const v = radialDeadzone(0.16, 0);
    expect(v.x).toBeGreaterThan(0);
    expect(v.x).toBeLessThan(0.02);
  });
});

describe('applyResponseCurve', () => {
  it('softens small deflections but keeps full deflection', () => {
    expect(applyResponseCurve({ x: 0.5, y: 0 }).x).toBeCloseTo(0.25, 5);
    expect(applyResponseCurve({ x: 1, y: 0 }).x).toBeCloseTo(1, 5);
    expect(applyResponseCurve({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('clampLength', () => {
  it('stops diagonal keyboard movement from being faster', () => {
    const v = clampLength({ x: 1, y: 1 });
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 5);
  });
});

describe('verticalFovFromHorizontal16x9', () => {
  it('converts the common 90 degree setting', () => {
    expect(verticalFovFromHorizontal16x9(90)).toBeCloseTo(58.72, 1);
  });
});
