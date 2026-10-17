import { describe, expect, it } from 'vitest';
import { inferNavigation } from './navigation';

describe('inferNavigation', () => {
  it('ignores questions that do not ask where something is', () => {
    expect(inferNavigation('скільки в мене монет?', 'У тебе 180 монет, витратиш їх у «Нагородах».')).toBeNull();
  });

  it('takes the section the answer names first', () => {
    expect(inferNavigation('де мої промокоди?', 'Вони в «Профілі», а нові купуються в «Нагородах».')).toEqual({
      href: '/profile',
      label: 'Відкрити Профіль',
    });
  });

  it('falls back to the previous answer for a bare «покажи»', () => {
    expect(inferNavigation('покажи', 'Ось, лови!', 'Зазирни у розділ «Нагороди».')?.href).toBe('/rewards');
  });

  it('falls back to the question itself', () => {
    expect(inferNavigation('відкрий мапу', 'Тримай!')?.href).toBe('/map');
  });

  it('treats «квести» as a section only when named as one', () => {
    expect(inferNavigation('де знайти квести?', 'Є кілька квестів для тебе.')).toBeNull();
    expect(inferNavigation('де мої квести?', 'Вони у розділі «Квести».')?.href).toBe('/quests');
  });

  it('does not take «де» inside another word for a question', () => {
    expect(inferNavigation('ідея для квесту', 'Глянь на мапу')).toBeNull();
  });
});
