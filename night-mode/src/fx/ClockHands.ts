import { Quaternion, Vector3, type Object3D } from 'three';

/** Minutes past midnight for a story time such as '10:00 PM', or null if it can't be read. */
export function parseClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(text.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3]?.toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

/** Where a 12-hour dial stands at a time (minutes): [minute hand, hour hand] turned from twelve, radians. */
export function handAngles(minutes: number): [number, number] {
  const t = ((minutes % 720) + 720) % 720;
  return [((t % 60) / 60) * Math.PI * 2, (t / 720) * Math.PI * 2];
}

/** How far the hands may spin forward in a second when the story jumps ahead (minutes). */
const CATCH_UP = 180;
/** Stopped, the clock shows 2:14: the minute Ivy went out on the ice, a year ago tonight. */
const STOPPED = 2 * 60 + 14;

/**
 * The grandfather clock's hands. Stopped at 2:14 until the clock is wound; running, they show the story's
 * time moving on in real time, and when the story jumps ahead they spin round to catch up (they never go
 * backwards). Stopped again, they stay where they are.
 */
export class ClockHands {
  /** The time the hands show, in minutes on a 12-hour dial (null until the first update). */
  private shown: number | null = null;
  private stoppedAt = STOPPED;
  private storyText = '';
  private storySince = 0;
  private readonly minuteBase: Quaternion;
  private readonly hourBase: Quaternion;
  private readonly turn = new Quaternion();

  constructor(
    private readonly minute: Object3D,
    private readonly hour: Object3D,
    /** The way the dial faces (towards someone reading it), in the hands' parent space. */
    private readonly facing: Vector3,
  ) {
    this.minuteBase = minute.quaternion.clone();
    this.hourBase = hour.quaternion.clone();
  }

  /** The clock stops where it is. */
  stop(): void {
    if (this.shown !== null) this.stoppedAt = this.shown;
  }

  /** A new game: the clock has not been wound since that night. */
  reset(): void {
    this.stoppedAt = STOPPED;
    this.shown = null;
  }

  update(running: boolean, storyClock: string, nowMs: number, dt: number): void {
    if (storyClock !== this.storyText) {
      this.storyText = storyClock;
      this.storySince = nowMs;
    }
    const story = parseClock(storyClock);
    const target = running && story !== null ? story + (nowMs - this.storySince) / 60000 : this.stoppedAt;
    const wanted = ((target % 720) + 720) % 720;
    if (this.shown === null) {
      this.shown = wanted;
    } else {
      const ahead = (((wanted - this.shown) % 720) + 720) % 720;
      this.shown = ahead < 1e-3 || ahead > 720 - 1e-3 ? wanted : (this.shown + Math.min(ahead, dt * CATCH_UP)) % 720;
    }
    const [m, h] = handAngles(this.shown);
    // clockwise, as seen by someone facing the dial
    this.minute.quaternion.copy(this.minuteBase).premultiply(this.turn.setFromAxisAngle(this.facing, -m));
    this.hour.quaternion.copy(this.hourBase).premultiply(this.turn.setFromAxisAngle(this.facing, -h));
  }
}
