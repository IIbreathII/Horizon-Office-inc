'use client';

import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES } from '@/shared/categories';
import type { Quest } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 6;

/**
 * Search pill with a debounced dropdown; picking a quest hands it to `onPick`.
 * The API has no search endpoint, so it filters the quests already loaded for the map.
 */
export function QuestSearch({ quests, onPick }: { quests: Quest[]; onPick: (quest: Quest) => void }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Search after the user stops typing for DEBOUNCE_MS
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    return quests
      .filter((quest) =>
        [quest.title, quest.address, quest.organization.name, CATEGORIES[quest.category].label].some((text) =>
          text.toLowerCase().includes(q),
        ),
      )
      .slice(0, MAX_RESULTS);
  }, [quests, debouncedQuery]);
  const loading = query.trim() !== debouncedQuery.trim();

  function change(value: string) {
    setQuery(value);
    setOpen(true);
    setActive(0);
  }

  function pick(quest: Quest) {
    onPick(quest);
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      pick(results[active]);
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // don't also close the quest panel
      setOpen(false);
      e.currentTarget.blur();
    }
  }

  const showDropdown = open && query.trim() !== '';

  return (
    <div className="pointer-events-auto relative w-72">
      <label className={`flex h-10 items-center gap-2 rounded-full px-4 ${GLASS}`}>
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-white/70" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => change(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="Пошук"
          aria-label="Пошук квестів"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/60 [&::-webkit-search-cancel-button]:hidden"
        />
      </label>

      {showDropdown && (
        <ul className={`absolute inset-x-0 top-12 overflow-hidden rounded-2xl py-1 ${GLASS}`}>
          {loading ? (
            <li className="px-4 py-3 text-sm text-white/60">Пошук…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-white/60">Нічого не знайдено</li>
          ) : (
            results.map((quest, i) => (
              <li key={quest.id}>
                <button
                  type="button"
                  // keep the input focused so the click lands before the dropdown closes
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(quest)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-white/10' : ''}`}
                >
                  <Icon src={CATEGORIES[quest.category].icon} className="mt-0.5 size-5" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{quest.title}</span>
                    <span className="block truncate text-xs text-white/60">{quest.address}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
