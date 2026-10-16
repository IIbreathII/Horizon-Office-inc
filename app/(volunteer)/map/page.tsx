'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { QuestPanel } from '@/features/map/ui/QuestPanel';
import { getQuests, joinQuest, leaveQuest } from '@/shared/api/api';
import { CATEGORIES } from '@/shared/categories';
import type { Category, Quest } from '@/shared/types';

// WebGL does not exist on the server (§4.7)
const CityMap = dynamic(() => import('@/features/map/CityMap').then((m) => m.CityMap), {
  ssr: false,
  loading: () => <div className="h-dvh w-full animate-pulse bg-slate-200" />,
});

const ALL_CATEGORIES = Object.keys(CATEGORIES) as Category[];

export default function MapPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]); // [] = all
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getQuests().then((data) => {
      if (!cancelled) setQuests(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredQuests =
    selectedCategories.length === 0 ? quests : quests.filter((q) => selectedCategories.includes(q.category));
  const selectedQuest = filteredQuests.find((q) => q.id === selectedId) ?? null;

  function applyCategories(next: Category[]) {
    setSelectedCategories(next);
    // Close the panel if the selected quest gets filtered out
    const selected = quests.find((q) => q.id === selectedId);
    if (selected && next.length > 0 && !next.includes(selected.category)) setSelectedId(null);
  }

  function toggleCategory(category: Category) {
    applyCategories(
      selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category],
    );
  }

  async function updateParticipation(action: (id: string) => Promise<void>, id: string) {
    setPending(true);
    try {
      await action(id);
      setQuests(await getQuests());
    } catch (error) {
      console.error(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <CityMap
        quests={filteredQuests}
        selectedId={selectedId}
        onSelect={(quest) => setSelectedId(quest.id)}
        onClose={() => setSelectedId(null)}
      />

      {/* pointer-events-none: the map stays draggable between the chips */}
      <nav className="pointer-events-none fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-2 px-4">
        <FilterChip active={selectedCategories.length === 0} onClick={() => applyCategories([])}>
          Всі
        </FilterChip>
        {ALL_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            active={selectedCategories.includes(category)}
            onClick={() => toggleCategory(category)}
          >
            {CATEGORIES[category].emoji} {CATEGORIES[category].label}{' '}
            <span className="opacity-60">{quests.filter((q) => q.category === category).length}</span>
          </FilterChip>
        ))}
      </nav>

      <QuestPanel
        quest={selectedQuest}
        onClose={() => setSelectedId(null)}
        onJoin={(id) => updateParticipation(joinQuest, id)}
        onLeave={(id) => updateParticipation(leaveQuest, id)}
        pending={pending}
      />
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pointer-events-auto cursor-pointer rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap shadow-md transition-colors ${active ? 'bg-slate-900 text-white' : 'bg-white/90 text-slate-800 hover:bg-white'}`}
    >
      {children}
    </button>
  );
}
