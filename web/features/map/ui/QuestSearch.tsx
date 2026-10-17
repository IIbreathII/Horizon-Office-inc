'use client';

import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/shared/categories';
import type { Quest } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';

const DEBOUNCE_MS = 300;

/**
 * The API has no search endpoint, so the quests already loaded for the map are filtered:
 * by title, address, organization and category name.
 */
export function matchesSearch(quest: Quest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [quest.title, quest.address, quest.organization.name, CATEGORIES[quest.category].label].some((text) =>
    text.toLowerCase().includes(q),
  );
}

/** Search pill: hands the query to `onSearch` once the user stops typing; it filters the quest list. */
export function QuestSearch({ onSearch, className = 'w-full sm:w-72' }: { onSearch: (query: string) => void; className?: string }) {
  const [query, setQuery] = useState('');

  // Search after the user stops typing for DEBOUNCE_MS
  useEffect(() => {
    const timer = setTimeout(() => onSearch(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation(); // don't also close the quest details
      setQuery('');
      e.currentTarget.blur();
    }
  }

  return (
    <label className={`pointer-events-auto flex h-10 items-center gap-2 rounded-full px-4 ${GLASS} ${className}`}>
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-white/70" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Пошук"
        aria-label="Пошук квестів"
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/60 [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  );
}
