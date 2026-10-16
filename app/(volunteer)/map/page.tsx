'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { QuestPanel } from '@/features/map/ui/QuestPanel';
import { QuestSearch } from '@/features/map/ui/QuestSearch';
import { useClaimQuest, useQuest, useQuests } from '@/shared/api/queries';
import { CATEGORIES } from '@/shared/categories';
import type { Category, Quest } from '@/shared/types';
import { ICONS } from '@/shared/icons';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';

// WebGL does not exist on the server (§4.7)
const CityMap = dynamic(() => import('@/features/map/CityMap').then((m) => m.CityMap), {
  ssr: false,
  loading: () => <div className="h-dvh w-full animate-pulse bg-slate-200" />,
});

const ALL_CATEGORIES = Object.keys(CATEGORIES) as Category[];

// useSearchParams needs a Suspense boundary in Next.js
export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapScreen />
    </Suspense>
  );
}

function MapScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: allQuests = [] } = useQuests();
  const claim = useClaimQuest();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]); // [] = all
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  // /map?quest=id (e.g. «На мапі» on /quests) opens that quest. Next keeps this page alive between
  // visits (cacheComponents), so every new param is handled here, not only the one present on mount.
  const questParam = searchParams.get('quest');
  const [handledParam, setHandledParam] = useState<string | null>(null);
  if (questParam !== handledParam) {
    setHandledParam(questParam);
    if (questParam) {
      setSelectedId(questParam);
      setPanelOpen(true);
    }
  }
  // drop the param once handled, so opening the same quest again later is a new param
  useEffect(() => {
    if (questParam) router.replace('/map', { scroll: false });
  }, [questParam, router]);

  // finished / cancelled quests are history, not map points
  const quests = allQuests.filter((q) => q.status === 'open' || q.status === 'full');
  const filteredQuests =
    selectedCategories.length === 0 ? quests : quests.filter((q) => selectedCategories.includes(q.category));
  const selectedQuest = filteredQuests.find((q) => q.id === selectedId) ?? null;
  // full card from GET /quests/{id}; the list item is shown until it arrives
  const { data: details } = useQuest(selectedQuest?.id ?? null);
  const panelQuest = selectedQuest && details?.id === selectedQuest.id ? details : selectedQuest;

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

  /** Pin, list row or search result picked: select it (camera flies to it) and show its details. */
  function selectQuest(quest: Quest) {
    setSelectedId(quest.id);
    setPanelOpen(true);
  }

  /** Search result picked: make sure the filter shows it first. */
  function pickQuest(quest: Quest) {
    if (selectedCategories.length > 0 && !selectedCategories.includes(quest.category)) setSelectedCategories([]);
    selectQuest(quest);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <CityMap
        quests={filteredQuests}
        selectedId={selectedId}
        panelOpen={panelOpen}
        onSelect={selectQuest}
        onClose={() => setSelectedId(null)}
      />

      {/* pointer-events-none: the map stays draggable between the chips.
          z-30 > QuestPanel's z-20, so the search dropdown opens over the panel */}
      <nav className="pointer-events-none fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-2 px-4">
        <FilterChip active={selectedCategories.length === 0} onClick={() => applyCategories([])}>
          <Icon src={ICONS.allCategories} />
          Всі
        </FilterChip>
        {ALL_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            active={selectedCategories.includes(category)}
            onClick={() => toggleCategory(category)}
          >
            <Icon src={CATEGORIES[category].icon} />
            {CATEGORIES[category].label}
            <span className="text-white/60">{quests.filter((q) => q.category === category).length}</span>
          </FilterChip>
        ))}
        <div className="ml-auto">
          <QuestSearch quests={quests} onPick={pickQuest} />
        </div>
      </nav>

      <QuestPanel
        quests={filteredQuests}
        quest={panelQuest}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onSelect={selectQuest}
        onBack={() => setSelectedId(null)}
        onClaim={(id) => claim.mutate(id)}
        pending={claim.isPending}
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
      className={`pointer-events-auto flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors ${GLASS} ${active ? 'bg-indigo-500! ring-indigo-300/40!' : 'hover:bg-[#25314f]/90'}`}
    >
      {children}
    </button>
  );
}
