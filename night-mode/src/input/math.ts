/** Pure helpers for input shaping (unit-tested in tests/inputMath.test.ts). */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Radial dead zone for an analog stick. Readings inside `inner` become zero; the remaining range is
 * rescaled so output still reaches 1 at `outer` (worn sticks rarely report a full 1.0).
 */
export function radialDeadzone(x: number, y: number, inner = 0.15, outer = 0.95): Vec2 {
  const mag = Math.hypot(x, y);
  if (mag <= inner || mag === 0) return { x: 0, y: 0 };
  const scaled = Math.min(1, (mag - inner) / (outer - inner));
  return { x: (x / mag) * scaled, y: (y / mag) * scaled };
}

/**
 * Applies an exponent to the stick's magnitude while keeping its direction: small deflections give
 * fine aim, full deflection still gives full speed.
 */
export function applyResponseCurve(v: Vec2, exponent = 2): Vec2 {
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return { x: 0, y: 0 };
  const curved = Math.min(1, mag) ** exponent;
  return { x: (v.x / mag) * curved, y: (v.y / mag) * curved };
}

/** Limits a vector to length 1 (so diagonal keyboard movement isn't faster). */
export function clampLength(v: Vec2, max = 1): Vec2 {
  const mag = Math.hypot(v.x, v.y);
  return mag > max ? { x: (v.x / mag) * max, y: (v.y / mag) * max } : v;
}

/**
 * Converts a horizontal FOV measured on a 16:9 screen into the camera's vertical FOV (degrees).
 * Keeping the vertical FOV fixed means wider monitors see more to the sides ("Hor+"), which is
 * what players expect from a FOV slider.
 */
export function verticalFovFromHorizontal16x9(horizontalDeg: number): number {
  const h = (horizontalDeg * Math.PI) / 180;
  return (2 * Math.atan(Math.tan(h / 2) / (16 / 9)) * 180) / Math.PI;
}
