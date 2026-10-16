import type { Category } from '@/shared/types';

// The single category dictionary: filter, markers, panel (and later forms and cards).
export const CATEGORIES: Record<Category, { label: string; emoji: string; color: string }> = {
  animals:   { label: 'Тварини',    emoji: '🐾', color: '#F59E0B' },
  ecology:   { label: 'Екологія',   emoji: '🌳', color: '#22C55E' },
  elderly:   { label: 'Літні люди', emoji: '👵', color: '#A855F7' },
  logistics: { label: 'Логістика',  emoji: '📦', color: '#3B82F6' },
  donation:  { label: 'Донорство',  emoji: '🩸', color: '#EF4444' },
  city:      { label: 'Місто',      emoji: '🏙️', color: '#64748B' },
};
