// The moves the flying owl's acts are made of (flights to a target, the sign-in hello and tour).
import { arcKeyframes, flightDuration, type Point } from './flightPath';

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where the corner owl sits (top-left, px) and its size: acts start and end exactly on it. */
export function measureHome(home: HTMLElement | null): { home: Point; size: number } {
  const rect = home?.getBoundingClientRect();
  return rect && rect.width > 0
    ? { home: { x: rect.left, y: rect.top }, size: rect.width }
    : { home: { x: 16, y: window.innerHeight - 96 }, size: 48 };
}

/** Top-left corner of an owl of `size` px centered on `center`. */
export const cornerAt = (center: Point, size: number): Point => ({ x: center.x - size / 2, y: center.y - size / 2 });

const SPRUNG = 'translateY(-3px) scale(0.94, 1.08)';

/**
 * Drives the owl's two layers with the Web Animations API: `bird` travels (position, lean, size),
 * `body` squashes and lunges. Everything is tracked, so `stop()` ends the whole act at once;
 * a move awaited after that rejects. With reduced motion the moves are instant (reading pauses are kept).
 */
export function createPuppet(bird: HTMLElement, body: HTMLElement) {
  let stopped = false;
  const running: Animation[] = [];
  const timers: number[] = [];
  const instant = prefersReducedMotion();

  const play = async (el: HTMLElement, frames: Keyframe[], duration: number, easing = 'ease-in-out') => {
    if (stopped) throw new Error('act stopped');
    const animation = el.animate(frames, { duration: instant ? 0 : duration, easing, fill: 'forwards' });
    running.push(animation);
    await animation.finished;
  };

  return {
    place(corner: Point, size: number) {
      bird.style.width = bird.style.height = `${size}px`;
      bird.style.transform = `translate(${corner.x}px, ${corner.y}px)`;
    },
    /** Waits `ms` — reading time, so not shortened for reduced motion. */
    wait: (ms: number) => new Promise<void>((resolve) => timers.push(window.setTimeout(resolve, ms))),
    later: (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms)),
    /** Anticipation: crouch, then spring into the air. */
    async takeOff() {
      await play(body, [{ transform: 'none' }, { transform: 'translateY(4px) scale(1.15, 0.8)', offset: 0.6 }, { transform: SPRUNG }], 240);
      play(body, [{ transform: SPRUNG }, { transform: 'none' }], 220).catch(() => {});
    },
    /** An arc between two top-left corners; `scale` = size at takeoff, at the top of the arc, on arrival. */
    fly: (from: Point, to: Point, scale: [number, number, number], lift?: number) =>
      play(bird, arcKeyframes(from, to, { scale, lift }), flightDuration(from, to), 'linear'),
    /** A quick jab by (dx, dy) px and back — a tap on whatever is there. */
    lunge: (dx: number, dy: number) =>
      play(
        body,
        [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(1.08, 0.94)`, offset: 0.4 }, { transform: 'none' }],
        520,
        'cubic-bezier(0.3, 0, 0.2, 1)',
      ),
    /** Touchdown: a small squash. */
    land: () =>
      play(body, [{ transform: 'none' }, { transform: 'translateY(3px) scale(1.12, 0.86)', offset: 0.4 }, { transform: 'none' }], 300, 'ease-out'),
    stop() {
      stopped = true;
      running.forEach((animation) => animation.cancel());
      timers.forEach((id) => window.clearTimeout(id));
    },
  };
}

export type Puppet = ReturnType<typeof createPuppet>;
