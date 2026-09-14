/**
 * Signal smoothing for hand tracking.
 *
 * The One-Euro filter (Casiez et al., 2012) is the gold standard for pointer
 * input from noisy sensors: it adapts its cutoff to speed, so slow movements
 * are heavily smoothed (rock-steady cursor) while fast movements pass through
 * with minimal lag. We use it for the pinch cursor. EMA smoothers back the
 * scalar/vector deltas (rotation, zoom) where simple exponential smoothing
 * is sufficient.
 */

class LowPass {
  private y: number | null = null;
  private s: number | null = null;
  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * (this.s as number);
    }
    this.y = value;
    return this.s as number;
  }
  reset() {
    this.y = null;
    this.s = null;
  }
  hasLast() {
    return this.y !== null;
  }
  last() {
    return this.s ?? 0;
  }
}

export class OneEuro {
  private xf = new LowPass();
  private dxf = new LowPass();
  private lastTime: number | null = null;
  private lastX = 0;

  constructor(
    private minCutoff = 1.2,
    private beta = 0.03,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      this.lastX = x;
      this.xf.filter(x, 1);
      return x;
    }
    let dt = (timestampMs - this.lastTime) / 1000;
    if (dt <= 0) dt = 1 / 60;
    this.lastTime = timestampMs;

    const dx = (x - this.lastX) / dt;
    this.lastX = x;
    const edx = this.dxf.filter(dx, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xf.filter(x, this.alpha(cutoff, dt));
  }

  reset() {
    this.xf.reset();
    this.dxf.reset();
    this.lastTime = null;
    this.lastX = 0;
  }
}

/** Two-axis One-Euro filter for a 2D point. */
export class OneEuro2D {
  private fx: OneEuro;
  private fy: OneEuro;
  constructor(minCutoff = 1.2, beta = 0.03, dCutoff = 1.0) {
    this.fx = new OneEuro(minCutoff, beta, dCutoff);
    this.fy = new OneEuro(minCutoff, beta, dCutoff);
  }
  filter(x: number, y: number, t: number): { x: number; y: number } {
    return { x: this.fx.filter(x, t), y: this.fy.filter(y, t) };
  }
  reset() {
    this.fx.reset();
    this.fy.reset();
  }
}

/** Exponential moving average for a scalar. */
export class EMA {
  private v: number | null = null;
  constructor(private alpha = 0.35) {}
  next(x: number): number {
    this.v = this.v === null ? x : this.alpha * x + (1 - this.alpha) * this.v;
    return this.v;
  }
  reset() {
    this.v = null;
  }
}
