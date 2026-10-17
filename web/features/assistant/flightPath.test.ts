import { describe, expect, it } from 'vitest';
import { arcKeyframes, arcPoint, easeInOutCubic, flightDuration, perchNear } from './flightPath';

const parse = (frame: Keyframe) => {
  const m = String(frame.transform).match(/translate\((.+)px, (.+)px\) rotate\((.+)deg\) scale\((.+)\)/);
  if (!m) throw new Error(`unexpected transform: ${String(frame.transform)}`);
  return { x: Number(m[1]), y: Number(m[2]), rotate: Number(m[3]), scale: Number(m[4]) };
};

describe('easeInOutCubic', () => {
  it('starts at 0, ends at 1 and passes the middle at 0.5', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
});

describe('arcPoint', () => {
  const from = { x: 0, y: 500 };
  const to = { x: 400, y: 300 };

  it('starts and ends at the given points', () => {
    expect(arcPoint(from, to, 100, 0)).toEqual(from);
    expect(arcPoint(from, to, 100, 1)).toEqual(to);
  });

  it('bows above the straight line (an arc, not a slide)', () => {
    const straightMiddle = (from.y + to.y) / 2;
    expect(arcPoint(from, to, 100, 0.5).y).toBeLessThan(straightMiddle - 50);
  });
});

describe('arcKeyframes', () => {
  const from = { x: 20, y: 700 };
  const to = { x: 600, y: 300 };
  const frames = arcKeyframes(from, to, { scale: [1, 1.4, 1.2] });

  it('runs from the start to the end, upright and at the requested sizes', () => {
    const first = parse(frames[0]);
    const last = parse(frames.at(-1)!);
    expect(first).toMatchObject({ x: from.x, y: from.y, scale: 1 });
    expect(last).toMatchObject({ x: to.x, y: to.y, scale: 1.2 });
    expect(Math.abs(first.rotate)).toBe(0);
    expect(Math.abs(last.rotate)).toBe(0);
    expect(frames[0].offset).toBe(0);
    expect(frames.at(-1)!.offset).toBe(1);
  });

  it('leans into the travel direction mid-air and grows toward the peak size', () => {
    const middle = parse(frames[Math.floor(frames.length / 2)]);
    expect(middle.rotate).toBeGreaterThan(0);
    expect(middle.scale).toBeGreaterThan(1.2);
    const back = parse(arcKeyframes(to, from)[12]);
    expect(back.rotate).toBeLessThan(0);
  });
});

describe('flightDuration', () => {
  it('is longer for longer flights, within limits', () => {
    const origin = { x: 0, y: 0 };
    expect(flightDuration(origin, { x: 10, y: 0 })).toBe(950);
    expect(flightDuration(origin, { x: 5000, y: 0 })).toBe(1800);
    expect(flightDuration(origin, { x: 600, y: 0 })).toBeGreaterThan(flightDuration(origin, { x: 400, y: 0 }));
  });
});

describe('perchNear', () => {
  const viewport = { width: 1200, height: 800 };

  it('hovers to the right of a button on the left rail, facing it', () => {
    const perch = perchNear({ x: 32, y: 400 }, viewport, 60);
    expect(perch.center).toEqual({ x: 92, y: 400 });
    expect(perch.direction).toBe(-1);
  });

  it('hovers above a button on a bottom bar', () => {
    const perch = perchNear({ x: 600, y: 770 }, viewport, 60);
    expect(perch.center).toEqual({ x: 600, y: 710 });
  });

  it('keeps off a target in the middle of the screen, on its upper left, facing it', () => {
    const perch = perchNear({ x: 600, y: 390 }, viewport, 60);
    expect(perch.center.x).toBeLessThan(600);
    expect(perch.center.y).toBeLessThan(390);
    expect(perch.direction).toBe(1);
  });
});
