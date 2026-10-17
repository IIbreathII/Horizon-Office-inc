import { CATEGORIES } from '@/shared/categories';
import { formatDateTime } from '@/shared/format';
import { Icon } from '@/shared/ui/Icon';
import { FAINT, tileStyle } from '@/shared/ui/surface';
import type { AssistantQuestCard } from '../types';
import { ActionIcon } from './ActionIcon';

/** A quest the assistant found: category, slots, rewards and «На мапі» (the owl flies there). */
export function QuestCardMini({
  card,
  onNavigate,
  flyToMap,
}: {
  card: AssistantQuestCard;
  onNavigate: () => void;
  flyToMap: (questId: string) => void;
}) {
  const { quest } = card;
  const category = CATEGORIES[quest.category];
  const freeSlots = Math.max(0, quest.slotsTotal - quest.slotsTaken);

  return (
    <div className="group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-3 shadow-md backdrop-blur-md transition-all duration-200 hover:border-amber-300/50 hover:bg-black/70 hover:shadow-[0_0_24px_-6px_rgba(252,211,77,0.35)] animate-message-in">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-inner transition-transform duration-200 group-hover:scale-105"
          style={tileStyle(category.color)}
        >
          <Icon src={category.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${category.color}33`, color: category.color }}
            >
              {category.label}
            </span>
            {freeSlots > 0 && (
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                {freeSlots} місць
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-bold text-white transition-colors group-hover:text-amber-200">
            {quest.title}
          </p>
          <p className={`mt-0.5 truncate text-xs ${FAINT}`}>
            {formatDateTime(quest.startsAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1 text-sky-400">
            <ActionIcon name="sparkle" className="size-3" />
            +{quest.xpReward} XP
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <ActionIcon name="coins" className="size-3" />
            +{quest.coinsReward}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate();
            flyToMap(quest.id);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-amber-300 px-3 py-1.5 text-xs font-bold text-black transition-all duration-200 hover:bg-yellow-200 hover:shadow-[0_0_12px_rgba(252,211,77,0.6)] group-hover:translate-x-0.5 active:scale-95"
        >
          <span>На мапі</span>
          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L14.586 11H3a1 1 0 1 1 0-2h11.586l-4.293-4.293a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
