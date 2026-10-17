// Pure geometry of the mascot's flights, kept apart from React so it can be unit-tested.

export type Point = { x: number; y: number };
/** 1 = the owl's natural pose (its pointing wing is on the right), -1 = mirrored. */
export type Direction = 1 | -1;

const MAX_BANK_DEG = 12;
const round = (n: number) => Math.round(n * 100) / 100;

/** Slow start, slow finish: the owl gathers speed after takeoff and brakes before it perches. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function control(from: Point, to: Point, lift: number): Point {
  return { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
}

/** Point at `t` (0..1) on a quadratic Bézier from `from` to `to`, bowed `lift` px above the higher end. */
export function arcPoint(from: Point, to: Point, lift: number, t: number): Point {
  const c = control(from, to, lift);
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * c.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * c.y + t * t * to.y,
  };
}

/** Longer hops take longer, within limits that still read as one deliberate flight. */
export function flightDuration(from: Point, to: Point): number {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.round(Math.min(1800, Math.max(950, 650 + distance * 0.9)));
}

type ArcOptions = {
  /** Height of the arc above the higher end, px (default grows with the distance). */
  lift?: number;
  steps?: number;
  /** Size of the owl at takeoff, at the top of the arc and on arrival. */
  scale?: [from: number, peak: number, to: number];
};

/**
 * Keyframes for a flight between two top-left corners (px), played with linear easing:
 * the path arcs upward, the owl leans into its travel mid-air (upright at both ends)
 * and grows toward the viewer at the top of the arc.
 */
export function arcKeyframes(
  from: Point,
  to: Point,
  { lift, steps = 24, scale = [1, 1.35, 1.2] }: ArcOptions = {},
): Keyframe[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const arcLift = lift ?? Math.min(180, 40 + distance * 0.3);
  const c = control(from, to, arcLift);
  const [s0, sPeak, s1] = scale;

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = easeInOutCubic(i / steps);
    const p = arcPoint(from, to, arcLift, t);
    // tangent of the Bézier: the direction of travel at t
    const vx = 2 * (1 - t) * (c.x - from.x) + 2 * t * (to.x - c.x);
    const vy = 2 * (1 - t) * (c.y - from.y) + 2 * t * (to.y - c.y);
    const speed = Math.hypot(vx, vy) || 1;
    const swing = Math.sin(Math.PI * t); // 0 at both ends
    const bank = MAX_BANK_DEG * (vx / speed) * swing;
    const size = s0 + (s1 - s0) * t + (sPeak - Math.max(s0, s1)) * swing;
    return {
      offset: i / steps,
      transform: `translate(${round(p.x)}px, ${round(p.y)}px) rotate(${round(bank)}deg) scale(${round(size)})`,
    };
  });
}

/**
 * Where the owl hovers to point at `target` without covering it: `gap` px from the target toward
 * the middle of the screen (so beside the left rail, above the bottom bar). A target in the middle
 * (the focused map pin) gets the owl on its upper left. The owl faces the target.
 */
export function perchNear(
  target: Point,
  viewport: { width: number; height: number },
  gap: number,
): { center: Point; direction: Direction } {
  const dx = viewport.width / 2 - target.x;
  const dy = viewport.height / 2 - target.y;
  const length = Math.hypot(dx, dy);
  const center =
    length < gap
      ? { x: target.x - gap, y: target.y - gap * 0.4 }
      : { x: target.x + (dx / length) * gap, y: target.y + (dy / length) * gap };
  return { center, direction: target.x >= center.x ? 1 : -1 };
}
