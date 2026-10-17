// The mascot's hello after sign-in: who gets the guided tour, who a quick wave, and where its speech goes.
import type { Point } from './flightPath';

export type IntroKind = 'tour' | 'greet';

/**
 * A new account (no XP yet) that has not seen the tour gets it; everyone else gets a short hello,
 * once per browser session. Accounts that had XP before the tour existed never get it.
 */
export function decideIntro(xp: number, seen: { tour: boolean; greetedThisSession: boolean }): IntroKind | null {
  if (!seen.tour) return xp === 0 ? 'tour' : 'greet';
  return seen.greetedThisSession ? null : 'greet';
}

export type TourStop = { href: string; title: string; text: string };

/** Tour stops, in the order of the nav. Only what the app really does (same facts as the assistant prompt). */
export const TOUR: TourStop[] = [
  { href: '/map', title: 'Мапа', text: 'Тут усі відкриті квести Дніпра. Обери квест на мапі й натисни «Записатися».' },
  { href: '/quests', title: 'Квести', text: 'Квести, на які ти записався, і вже виконані. Не можеш обрати — спробуй «щасливий квест».' },
  { href: '/rewards', title: 'Нагороди', text: 'За квести отримуєш XP і монети. Монети міняй тут на промокоди партнерів.' },
  { href: '/profile', title: 'Профіль', text: 'Твій рівень, досвід і всі отримані промокоди.' },
];

const BUBBLE_MAX_WIDTH = 300;
const EDGE = 16; // px kept clear of the screen edges
const GAP = 14; // px between the owl and its bubble

export type Placement = { left: number; width: number } & ({ top: number } | { bottom: number });

/**
 * Where the speech bubble of an owl centered at `at` (radius px) goes: beside it when the owl hovers
 * by the left rail (wide screens), otherwise above it in the lower half of the screen, below it in the upper.
 */
export function speechPlacement(at: Point, radius: number, viewport: { width: number; height: number }): Placement {
  const width = Math.min(BUBBLE_MAX_WIDTH, viewport.width - EDGE * 2);
  const clampLeft = (left: number) => Math.min(Math.max(left, EDGE), viewport.width - width - EDGE);

  if (viewport.width >= 640 && at.x - radius < viewport.width * 0.2) {
    return { left: clampLeft(at.x + radius + GAP), top: Math.max(EDGE, at.y - 56), width };
  }
  const left = clampLeft(at.x - width / 2);
  return at.y > viewport.height / 2
    ? { left, bottom: viewport.height - (at.y - radius - GAP), width }
    : { left, top: at.y + radius + GAP, width };
}
