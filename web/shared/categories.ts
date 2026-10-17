import type { Category } from '@/shared/types';

// The single category dictionary: filter, markers, panel, cards.
// Icons live in public/icons/categories/ (see also shared/icons.ts).
export const CATEGORIES: Record<Category, { label: string; icon: string; color: string }> = {
  animals:   { label: 'Тварини',    icon: '/icons/categories/animals.svg',   color: '#F59E0B' },
  ecology:   { label: 'Екологія',   icon: '/icons/categories/ecology.svg',   color: '#22C55E' },
  elderly:   { label: 'Літні люди', icon: '/icons/categories/elderly.svg',   color: '#A855F7' },
  logistics: { label: 'Логістика',  icon: '/icons/categories/logistics.svg', color: '#3B82F6' },
  donation:  { label: 'Донорство',  icon: '/icons/categories/donation.svg',  color: '#EF4444' },
  city:      { label: 'Місто',      icon: '/icons/categories/city.svg',      color: '#64748B' },
};
