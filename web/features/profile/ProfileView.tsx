'use client';

import { CopyButton } from '@/features/rewards/CopyButton';
import { useInventory, useMe, useQuests } from '@/shared/api/queries';
import { formatDate } from '@/shared/format';
import { ICONS } from '@/shared/icons';
import { levelTitle } from '@/shared/levels';
import { Icon } from '@/shared/ui/Icon';
import { CARD } from '@/shared/ui/PageShell';
import { LevelAvatar } from './LevelAvatar';
import { XpBar } from './XpBar';

export function ProfileView() {
  const { data: me, isPending, isError } = useMe();
  const { data: inventory } = useInventory();
  const { data: quests } = useQuests();

  if (isPending) return <p>Завантаження профілю…</p>;
  if (isError) return <p>Не вдалося завантажити профіль</p>;

  const completed = quests?.filter((q) => q.myParticipation?.status === 'completed').length;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <section className={`flex flex-col gap-4 ${CARD}`}>
        <div className="flex items-center gap-4">
          <LevelAvatar name={me.username} avatarUrl={me.avatarUrl} level={me.level} />
          <div>
            <h2 className="text-lg font-semibold">{me.username}</h2>
            <p className="text-sm text-gray-500">{levelTitle(me.level)}</p>
            <p className="text-sm text-gray-500">{me.email}</p>
          </div>
        </div>
        <XpBar userId={me.id} level={me.level} current={me.levelProgress.current} required={me.levelProgress.required} />
        <ul className="flex gap-6 text-sm">
          <li className="flex items-center gap-1">
            Баланс: {me.balance} <Icon src={ICONS.coin} className="size-4" />
          </li>
          <li>Досвід: {me.xp} XP</li>
          <li>Виконано квестів: {completed ?? '…'}</li>
        </ul>
      </section>

      <section className={CARD}>
        <h2 className="mb-3 font-semibold">Мої промокоди</h2>
        {!inventory ? (
          <p className="text-sm">Завантаження…</p>
        ) : inventory.length === 0 ? (
          <p className="text-sm text-gray-500">Ще немає промокодів — обміняйте монети в розділі «Нагороди».</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-200">
            {inventory.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-2">
                <div className="flex-1">
                  <p>{item.title}</p>
                  <p className="text-sm text-gray-500">
                    {item.partnerName} · {formatDate(item.claimedAt)}
                  </p>
                </div>
                <code className="font-mono">{item.promoCode}</code>
                <CopyButton text={item.promoCode} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
