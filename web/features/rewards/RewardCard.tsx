'use client';

import { ICONS } from '@/shared/icons';
import type { Reward } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { BUTTON, CARD } from '@/shared/ui/PageShell';

type RewardCardProps = {
  reward: Reward;
  balance: number;
  buying: boolean;
  onBuy: (id: string) => void;
};

export function RewardCard({ reward, balance, buying, onBuy }: RewardCardProps) {
  const missing = reward.cost - balance;

  return (
    <article className={`flex flex-col gap-2 ${CARD}`}>
      <p className="text-sm text-gray-500">{reward.partnerName}</p>
      <h3 className="font-semibold">{reward.title}</h3>
      <p className="flex items-center gap-1">
        {reward.cost} <Icon src={ICONS.coin} className="size-4" />
      </p>
      <button type="button" onClick={() => onBuy(reward.id)} disabled={missing > 0 || buying} className={`mt-2 ${BUTTON}`}>
        {buying ? 'Купуємо…' : missing > 0 ? `Бракує ${missing} монет` : 'Купити'}
      </button>
    </article>
  );
}
