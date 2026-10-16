'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '@/shared/categories';
import { ICONS } from '@/shared/icons';
import type { Category } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';

type CategoryDropdownProps = {
  categories: Category[];
  /** Selected categories; [] = all. */
  selected: Category[];
  counts: Record<Category, number>;
  onToggle: (category: Category) => void;
  onReset: () => void;
};

/** Compact category filter for narrow screens: one button that opens the same multi-select as the chips. */
export function CategoryDropdown({ categories, selected, counts, onToggle, onReset }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // close on a click outside or Esc
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    selected.length === 0 ? 'Всі категорії' : selected.length === 1 ? CATEGORIES[selected[0]].label : `Категорії · ${selected.length}`;

  return (
    <div ref={root} className="pointer-events-auto relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors ${GLASS} ${selected.length > 0 ? 'bg-[#228fff]! ring-[#228fff]/40!' : 'hover:bg-neutral-800/90'}`}
      >
        <Icon src={selected.length === 1 ? CATEGORIES[selected[0]].icon : ICONS.allCategories} />
        <span className="max-w-32 truncate">{label}</span>
        <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div role="group" aria-label="Категорії" className={`absolute top-12 left-0 w-64 overflow-hidden rounded-2xl p-1.5 ${GLASS}`}>
          <Option active={selected.length === 0} onClick={onReset} icon={ICONS.allCategories} label="Всі" />
          {categories.map((category) => (
            <Option
              key={category}
              active={selected.includes(category)}
              onClick={() => onToggle(category)}
              icon={CATEGORIES[category].icon}
              label={CATEGORIES[category].label}
              count={counts[category]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Option({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-[#228fff]/25' : 'hover:bg-white/10'}`}
    >
      <Icon src={icon} />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-white/60 tabular-nums">{count}</span>}
      <span className={`flex size-5 items-center justify-center rounded-md ring-1 ${active ? 'bg-[#228fff] ring-[#228fff]' : 'ring-white/25'}`}>
        {active && (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
