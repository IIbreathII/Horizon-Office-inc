'use client';

import { useState } from 'react';
import { useBuyReward, useMe, useRewards } from '@/shared/api/queries';
import type { Reward } from '@/shared/types';
import { CARD, SKELETON } from '@/shared/ui/surface';
import { RedeemDialog, type RedeemState } from './RedeemDialog';
import { RewardCard } from './RewardCard';
import { LuckyGift } from './LuckyGift';

export function RewardShop() {
  const { data: me } = useMe();
  const { data: rewards, isPending, isError } = useRewards();
  const buy = useBuyReward();
  const [selected, setSelected] = useState<Reward | null>(null);

  if (isPending) return <ShopSkeleton />;
  if (isError) return <p className={`${CARD} text-sm text-rose-300`}>Не вдалося завантажити нагороди</p>;

  const balance = me?.balance ?? 0;

  function open(reward: Reward) {
    buy.reset();
    setSelected(reward);
  }

  const state: RedeemState = buy.isPending
    ? { status: 'pending' }
    : buy.isSuccess
      ? { status: 'success', item: buy.data }
      : buy.isError
        ? { status: 'error' }
        : { status: 'confirm' };

  return (
    <>
      <LuckyGift />
      <h2 className="mt-10 mb-4 text-xl font-semibold text-white">Магазин нагород</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rewards.map((reward) => (
          <RewardCard key={reward.id} reward={reward} balance={balance} onBuy={open} />
        ))}
      </div>
      {selected && (
        <RedeemDialog
          reward={selected}
          balance={balance}
          state={state}
          onConfirm={() => buy.mutate(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ShopSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Завантаження нагород">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex flex-col gap-3 ${CARD}`}>
          <div className="flex items-center gap-3">
            <div className={`size-11 rounded-xl! ${SKELETON}`} />
            <div className={`h-5 w-1/2 ${SKELETON}`} />
          </div>
          <div className={`h-6 w-20 ${SKELETON}`} />
          <div className={`h-10 w-full rounded-xl! ${SKELETON}`} />
        </div>
      ))}
    </div>
  );
}
