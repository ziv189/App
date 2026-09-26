/**
 * Fixed-timestep accumulator ("fix your timestep").
 *
 * Physics and movement always advance in identical steps (default 1/60 s) no matter the monitor's
 * refresh rate, so the game feels the same at 60, 144 or 240 Hz. Rendering happens every frame and
 * uses the returned `alpha` to interpolate between the last two simulation states.
 */
export class FixedStepLoop {
  private accumulator = 0;

  /**
   * @param step Simulation step in seconds.
   * @param maxFrameTime Longest frame we accept (s); longer hitches are clamped so the game slows
   *   down briefly instead of fast-forwarding.
   * @param maxSteps Upper bound on steps per frame (protects against a "spiral of death").
   */
  constructor(
    readonly step = 1 / 60,
    readonly maxFrameTime = 0.25,
    readonly maxSteps = 8,
  ) {}

  /** Runs `fixedUpdate` zero or more times; returns the interpolation factor in [0, 1). */
  advance(frameTime: number, fixedUpdate: (step: number) => void): number {
    this.accumulator += Math.min(Math.max(frameTime, 0), this.maxFrameTime);
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSteps) {
      fixedUpdate(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    // If we hit the step cap, drop the backlog rather than carrying it into the next frame.
    if (this.accumulator >= this.step) this.accumulator %= this.step;
    return this.accumulator / this.step;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
