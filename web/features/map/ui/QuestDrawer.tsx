'use client';

import type { Quest } from '@/shared/types';
import { Drawer } from './Drawer';
import { QuestList } from './QuestPanel';
import { QuestSearch } from './QuestSearch';

type QuestDrawerProps = {
  /** Quests after the filters and the search. */
  quests: Quest[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (query: string) => void;
  onSelect: (quest: Quest) => void;
};

/**
 * Phones and tablets: the quest list slides in from the right over the map,
 * with the search on top. Picking a quest closes it, so the map shows that quest.
 */
export function QuestDrawer({ quests, open, onOpenChange, onSearch, onSelect }: QuestDrawerProps) {
  return (
    <Drawer
      title={`Квести (${quests.length})`}
      side="right"
      open={open}
      onOpenChange={onOpenChange}
      toolbar={<QuestSearch onSearch={onSearch} className="w-full bg-white/10!" />}
    >
      <QuestList quests={quests} onSelect={onSelect} />
    </Drawer>
  );
}
