import { Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ClockHands, handAngles, parseClock } from '../src/fx/ClockHands';

/** The angle a hand has turned from twelve, clockwise as seen from the front (the dial faces -z). */
function turned(hand: Object3D): number {
  const up = new Vector3(0, 1, 0).applyQuaternion(hand.quaternion);
  // seen from the front (from -z), clockwise from twelve is towards -x
  const a = Math.atan2(-up.x, up.y);
  return (a + Math.PI * 2) % (Math.PI * 2);
}

/** Minutes on a 12-hour dial read back from the minute and hour hands. */
function reading(minute: Object3D, hour: Object3D): [number, number] {
  return [(turned(minute) / (Math.PI * 2)) * 60, (turned(hour) / (Math.PI * 2)) * 12];
}

function clock() {
  const minute = new Object3D();
  const hour = new Object3D();
  return { minute, hour, hands: new ClockHands(minute, hour, new Vector3(0, 0, -1)) };
}

describe('the grandfather clock', () => {
  it('reads the story times', () => {
    expect(parseClock('8:05 PM')).toBe(20 * 60 + 5);
    expect(parseClock('10:00 PM')).toBe(22 * 60);
    expect(parseClock('12:30 AM')).toBe(30);
    expect(parseClock('12:15 PM')).toBe(12 * 60 + 15);
    expect(parseClock('3:00 AM')).toBe(180);
    expect(parseClock('late')).toBeNull();
    const [m, h] = handAngles(2 * 60 + 15);
    expect(m).toBeCloseTo(Math.PI / 2);
    expect(h).toBeCloseTo(((2.25 / 12) * Math.PI * 2));
  });

  it('stands at 2:14 until it is wound, then shows the story time and keeps it', () => {
    const { minute, hour, hands } = clock();
    hands.update(false, '8:05 PM', 0, 0.016);
    let [m, h] = reading(minute, hour);
    expect(m).toBeCloseTo(14, 3);
    expect(h).toBeCloseTo(2 + 14 / 60, 3);
    // wound: the hands spin forward to the story's time (never backwards), three hours a second
    for (let i = 0; i < 400; i++) hands.update(true, '8:05 PM', 0, 0.016);
    [m, h] = reading(minute, hour);
    expect(m).toBeCloseTo(5, 3);
    expect(h).toBeCloseTo(8 + 5 / 60, 3);
    // a minute later, it's a minute later
    hands.update(true, '8:05 PM', 60_000, 0.016);
    [m] = reading(minute, hour);
    expect(m).toBeCloseTo(6, 3);
  });

  it('spins round to catch up when the story jumps ahead, and stays put once stopped', () => {
    const { minute, hour, hands } = clock();
    hands.update(true, '10:00 PM', 0, 0.016);
    hands.update(true, '11:30 PM', 0, 0.1);
    let [m, h] = reading(minute, hour);
    // 18 minutes on after a tenth of a second
    expect(h).toBeCloseTo(10 + 18 / 60, 2);
    for (let i = 0; i < 100; i++) hands.update(true, '11:30 PM', 0, 0.1);
    [m, h] = reading(minute, hour);
    expect(m).toBeCloseTo(30, 3);
    hands.stop();
    hands.update(false, '1:30 AM', 0, 0.1);
    [m, h] = reading(minute, hour);
    expect(h).toBeCloseTo(11.5, 3);
    // a new game: back to 2:14
    hands.reset();
    hands.update(false, '8:02 PM', 0, 0.1);
    [m, h] = reading(minute, hour);
    expect(m).toBeCloseTo(14, 3);
  });
});
