'use client';

import type { Reward } from '@/shared/types';
import { DISPLAY } from '@/shared/ui/fonts';
import { LineIcon } from '@/shared/ui/LineIcon';
import { BUTTON_DISABLED, BUTTON_PRIMARY, COIN_TEXT, FAINT, PANEL, PANEL_HOVER, PROGRESS_TRACK, tileStyle } from '@/shared/ui/surface';
import { rewardRarity } from './rarity';

type RewardCardProps = {
  reward: Reward;
  balance: number;
  onBuy: (reward: Reward) => void;
};

export function RewardCard({ reward, balance, onBuy }: RewardCardProps) {
  const missing = reward.cost - balance;
  const progress = reward.cost === 0 ? 100 : Math.min(100, (balance / reward.cost) * 100);
  const rarity = rewardRarity(reward.cost);

  return (
    <article className={`flex flex-col overflow-hidden ${PANEL} ${PANEL_HOVER}`}>
      {/* item showcase, tinted by rarity */}
      <div
        className="relative flex h-32 items-center justify-center border-b border-white/[0.06]"
        style={{ background: `linear-gradient(180deg, ${rarity.color}14, transparent)` }}
      >
        <span className="flex size-16 items-center justify-center rounded-2xl" style={{ ...tileStyle(rarity.color), color: rarity.color }}>
          <LineIcon name="gift" className="size-8" />
        </span>
        <span
          className="absolute top-3 left-3 rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: rarity.color, backgroundColor: `${rarity.color}1a`, boxShadow: `inset 0 0 0 1px ${rarity.color}40` }}
        >
          {rarity.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className={`truncate text-xs ${FAINT}`}>{reward.partnerName}</p>
        <h3 className={`mt-1 line-clamp-2 text-lg leading-snug font-semibold text-[#f6f1e7] ${DISPLAY}`}>{reward.title}</h3>

        <p className={`mt-3 flex items-center gap-1.5 text-xl font-semibold tabular-nums ${COIN_TEXT} ${DISPLAY}`}>
          <LineIcon name="coin" className="size-5" />
          {reward.cost}
        </p>
        {missing > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className={`h-1 overflow-hidden rounded-full ${PROGRESS_TRACK}`}>
              <div className="h-full rounded-full bg-[#e8c77f]" style={{ width: `${progress}%` }} />
            </div>
            <p className={`text-xs ${FAINT}`}>Не вистачає {missing} монет</p>
          </div>
        )}

        <div className="mt-auto pt-5">
          {missing > 0 ? (
            <button type="button" disabled className={`w-full ${BUTTON_DISABLED}`}>
              <LineIcon name="lock" className="size-4" />
              Обміняти
            </button>
          ) : (
            <button type="button" onClick={() => onBuy(reward)} className={`w-full ${BUTTON_PRIMARY}`}>
              Обміняти
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
