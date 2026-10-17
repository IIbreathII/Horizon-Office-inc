'use client';

import { usePathname } from 'next/navigation';

export type Suggestion = { text: string; icon: string };

export const LOADING_STATUSES: Suggestion[] = [
  { text: 'Шукаю відкриті квести у Дніпрі...', icon: 'search' },
  { text: 'Аналізую нагороди та локацію...', icon: 'compass' },
  { text: 'Совка готує відповідь...', icon: 'pen' },
];

export function useSuggestions(): Suggestion[] {
  const path = usePathname();
  if (path.startsWith('/map'))
    return [
      { text: 'Які квести зараз відкриті?', icon: 'map' },
      { text: 'Є квести для початківців?', icon: 'star' },
      { text: 'Хочу допомогти тваринам', icon: 'paw' },
      { text: 'Як записатися на квест?', icon: 'compass' },
    ];
  if (path.startsWith('/quests'))
    return [
      { text: 'Скільки квестів я вже виконав?', icon: 'star' },
      { text: 'Коли мій наступний квест?', icon: 'compass' },
      { text: 'Як скасувати запис на квест?', icon: 'info' },
      { text: 'Що означають статуси квестів?', icon: 'map' },
    ];
  if (path.startsWith('/rewards'))
    return [
      { text: 'Як витратити монети?', icon: 'coins' },
      { text: 'Скільки монет у мене є?', icon: 'coins' },
      { text: 'Що таке подарунок за добрі справи?', icon: 'gift' },
      { text: 'Як отримати промокод?', icon: 'gift' },
    ];
  if (path.startsWith('/profile'))
    return [
      { text: 'Як підвищити рівень?', icon: 'star' },
      { text: 'Скільки XP потрібно для наступного рівня?', icon: 'sparkle' },
      { text: 'Де переглянути мою статистику?', icon: 'user' },
      { text: 'Де мої промокоди?', icon: 'gift' },
    ];
  return [
    { text: 'Які квести є зараз?', icon: 'map' },
    { text: 'Як отримати нагороду?', icon: 'coins' },
    { text: 'Хочу допомогти тваринам', icon: 'paw' },
    { text: 'Як отримати подарунок за добрі справи?', icon: 'gift' },
  ];
}
