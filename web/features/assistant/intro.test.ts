import { describe, expect, it } from 'vitest';
import { decideIntro, speechPlacement } from './intro';

describe('decideIntro', () => {
  const fresh = { tour: false, greetedThisSession: false };

  it('gives a brand-new account the tour', () => {
    expect(decideIntro(0, fresh)).toBe('tour');
  });

  it('greets an account that already has XP, even if it never saw the tour', () => {
    expect(decideIntro(120, fresh)).toBe('greet');
  });

  it('greets once per session after the tour', () => {
    expect(decideIntro(0, { tour: true, greetedThisSession: false })).toBe('greet');
    expect(decideIntro(0, { tour: true, greetedThisSession: true })).toBeNull();
  });
});

describe('speechPlacement', () => {
  const desktop = { width: 1280, height: 800 };
  const phone = { width: 375, height: 700 };

  it('puts the bubble right of an owl by the left rail', () => {
    const p = speechPlacement({ x: 100, y: 400 }, 36, desktop);
    expect(p.left).toBe(150);
    expect('top' in p).toBe(true);
  });

  it('puts the bubble below an owl in the upper half', () => {
    const p = speechPlacement({ x: 640, y: 320 }, 60, desktop);
    expect(p).toEqual({ left: 490, top: 394, width: 300 });
  });

  it('puts the bubble above an owl over the bottom bar and keeps it on screen', () => {
    const p = speechPlacement({ x: 40, y: 600 }, 33, phone);
    expect(p).toMatchObject({ left: 16, bottom: 147, width: 300 });
  });

  it('narrows the bubble on very small screens', () => {
    expect(speechPlacement({ x: 160, y: 200 }, 30, { width: 320, height: 600 }).width).toBe(288);
  });
});
