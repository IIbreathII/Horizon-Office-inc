'use client';

import { useState } from 'react';
import { useBuyReward, useMe, useRewards } from '@/shared/api/queries';
import { ICONS } from '@/shared/icons';
import type { InventoryItem } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { RedeemDialog } from './RedeemDialog';
import { RewardCard } from './RewardCard';

export function RewardShop() {
  const { data: me } = useMe();
  const { data: rewards, isPending, isError } = useRewards();
  const buy = useBuyReward();
  const [bought, setBought] = useState<InventoryItem | null>(null);

  if (isPending) return <p>Завантаження нагород…</p>;
  if (isError) return <p>Не вдалося завантажити нагороди</p>;

  return (
    <>
      <p className="mb-6 flex items-center gap-1">
        Ваш баланс: {me?.balance ?? '…'} <Icon src={ICONS.coin} className="size-4" />
      </p>
      {buy.isError && <p className="mb-4 text-sm text-red-600">Не вдалося купити нагороду, спробуйте ще раз</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            balance={me?.balance ?? 0}
            buying={buy.isPending && buy.variables === reward.id}
            onBuy={(id) => buy.mutate(id, { onSuccess: setBought })}
          />
        ))}
      </div>
      {bought && <RedeemDialog item={bought} onClose={() => setBought(null)} />}
    </>
  );
}
