'use client';

import { useMe } from '@/shared/api/queries';
import { DISPLAY } from '@/shared/ui/fonts';
import { LineIcon } from '@/shared/ui/LineIcon';
import { COIN_TEXT, FAINT, PANEL } from '@/shared/ui/surface';

/** The volunteer's coin balance, shown next to the page title. */
export function BalancePill() {
  const { data: me } = useMe();

  return (
    <p className={`flex items-center gap-3 rounded-full! border-[#d9bf8c]/30! py-2 pr-5 pl-2 ${PANEL}`}>
      <span className={`flex size-10 items-center justify-center rounded-full border border-[#d9bf8c]/40 ${COIN_TEXT}`}>
        <LineIcon name="coin" className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`text-xs ${FAINT}`}>Ваш баланс</span>
        <span className={`text-xl font-semibold tabular-nums ${COIN_TEXT} ${DISPLAY}`}>{me?.balance ?? '…'}</span>
      </span>
    </p>
  );
}
