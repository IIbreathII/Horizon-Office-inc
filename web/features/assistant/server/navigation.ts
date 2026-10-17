// Safety net for «покажи»: the model sometimes answers "it's in Profile" without calling
// suggest_navigation, and then there is no button and the owl has nowhere to fly.
import type { NavSuggestion } from '../types';

// letters-aware word edges: \b does not work for Cyrillic
const word = (pattern: string) => new RegExp(`(?<![\\p{L}])(?:${pattern})(?![\\p{L}])`, 'iu');

/** The user wants to be shown where something is. */
const ASKS_WHERE = word("покажи|покажіть|де|відкрий|відкрийте|куди|перейти|перейди|як потрапити|як знайти|де знайти");

/** Sections by how an answer names them; «Квести» only as a section name, the word alone means quests in general. */
const SECTIONS: { pattern: RegExp; nav: NavSuggestion }[] = [
  { pattern: /нагород/iu, nav: { href: '/rewards', label: 'Перейти до Нагород' } },
  { pattern: /профіл/iu, nav: { href: '/profile', label: 'Відкрити Профіль' } },
  { pattern: /(?<![\p{L}])мап[аиіу]/iu, nav: { href: '/map', label: 'Відкрити Мапу' } },
  { pattern: /«Квести»|розділ\p{L}* «?Квест/iu, nav: { href: '/quests', label: 'Перейти до Квестів' } },
];

/** The section named first in `text`, if any. */
function firstSection(text: string): NavSuggestion | null {
  let best: { index: number; nav: NavSuggestion } | null = null;
  for (const { pattern, nav } of SECTIONS) {
    const index = text.search(pattern);
    if (index >= 0 && (!best || index < best.index)) best = { index, nav };
  }
  return best?.nav ?? null;
}

/**
 * When the user asked where something is, pick the section to fly to: the one named first in the
 * answer, else in the previous answer («покажи» right after "it's in Rewards"), else in the question.
 */
export function inferNavigation(question: string, answer: string, previousAnswer = ''): NavSuggestion | null {
  if (!ASKS_WHERE.test(question)) return null;
  return firstSection(answer) ?? firstSection(previousAnswer) ?? firstSection(question);
}
