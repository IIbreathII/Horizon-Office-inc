'use client';

import Link from 'next/link';
import { CopyButton } from '@/features/rewards/CopyButton';
import { useInventory, useMe, useQuests } from '@/shared/api/queries';
import { CATEGORIES } from '@/shared/categories';
import { formatDate } from '@/shared/format';
import { levelTitle } from '@/shared/levels';
import { DISPLAY } from '@/shared/ui/fonts';
import { Icon } from '@/shared/ui/Icon';
import { LineIcon, type LineIconName } from '@/shared/ui/LineIcon';
import { ACCENT_TEXT, CARD, COIN_TEXT, FAINT, INSET, MUTED, PANEL, SKELETON, XP_TEXT, tileStyle } from '@/shared/ui/surface';
import { SystemPanel } from '@/shared/ui/SystemPanel';
import { LevelAvatar } from './LevelAvatar';
import { XpBar } from './XpBar';

export function ProfileView() {
  const { data: me, isPending, isError } = useMe();
  const { data: inventory } = useInventory();
  const { data: quests } = useQuests();

  if (isPending) return <ProfileSkeleton />;
  if (isError) return <p className={`${CARD} text-sm text-rose-300`}>Не вдалося завантажити профіль. Оновіть сторінку</p>;

  const completed = quests?.filter((q) => q.myParticipation?.status === 'completed');

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <SystemPanel className="flex flex-col gap-7 overflow-hidden p-6 sm:p-8 lg:col-span-2">
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <LevelAvatar
            name={me.username}
            avatarUrl={me.avatarUrl}
            level={me.level}
            current={me.levelProgress.current}
            required={me.levelProgress.required}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${ACCENT_TEXT}`}>{levelTitle(me.level)}</p>
            <h2 className={`mt-1 truncate text-2xl font-semibold tracking-tight text-[#f6f1e7] sm:text-3xl ${DISPLAY}`}>{me.username}</h2>
            <p className={`mt-1 truncate text-sm ${FAINT}`}>{me.email}</p>
          </div>
          <ul className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            <Stat icon="xp" label="Досвід" value={me.xp} className={XP_TEXT} />
            <Stat icon="coin" label="Монети" value={me.balance} className={COIN_TEXT} />
            <Stat icon="trophy" label="Квестів" value={completed?.length ?? '…'} className="text-slate-100" />
          </ul>
        </div>

        <div className="relative">
          <XpBar userId={me.id} level={me.level} current={me.levelProgress.current} required={me.levelProgress.required} />
        </div>
      </SystemPanel>

      <section className={PANEL}>
        <SectionTitle icon="ticket" title="Мої промокоди" count={inventory?.length} />
        {!inventory ? (
          <p className={`px-5 py-4 text-sm ${FAINT}`}>Завантаження…</p>
        ) : inventory.length === 0 ? (
          <p className={`px-5 py-4 text-sm ${MUTED}`}>
            Промокодів ще немає.{' '}
            <Link href="/rewards" className={`font-semibold underline-offset-4 hover:underline ${ACCENT_TEXT}`}>
              Обміняйте монети на нагороди
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {inventory.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <div className="min-w-40 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className={`truncate text-xs ${FAINT}`}>
                    {item.partnerName}, {formatDate(item.claimedAt)}
                  </p>
                </div>
                <code className={`rounded-lg border border-[#d9bf8c]/30 bg-[#0c1a2e]/50 px-2.5 py-1 font-mono text-sm tracking-wider ${COIN_TEXT}`}>{item.promoCode}</code>
                <CopyButton text={item.promoCode} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={PANEL}>
        <SectionTitle icon="trophy" title="Виконані квести" count={completed?.length} />
        {!completed ? (
          <p className={`px-5 py-4 text-sm ${FAINT}`}>Завантаження…</p>
        ) : completed.length === 0 ? (
          <p className={`px-5 py-4 text-sm ${MUTED}`}>Виконайте перший квест, і він з’явиться тут</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {completed.map((quest) => {
              const category = CATEGORIES[quest.category];
              return (
                <li key={quest.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={tileStyle(category.color)} title={category.label}>
                    <Icon src={category.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{quest.title}</span>
                  <span className={`flex items-center gap-1 text-sm font-semibold ${XP_TEXT}`}>
                    <LineIcon name="xp" className="size-3.5" />+{quest.xpReward}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ icon, title, count }: { icon: LineIconName; title: string; count?: number }) {
  return (
    <h2 className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4 text-base font-semibold text-[#f6f1e7]">
      <LineIcon name={icon} className={`size-4 ${ACCENT_TEXT}`} />
      <span className={DISPLAY}>{title}</span>
      {count !== undefined && <span className={`ml-auto rounded-md bg-white/[0.06] px-1.5 text-xs leading-5 tabular-nums ${MUTED}`}>{count}</span>}
    </h2>
  );
}

function Stat({ icon, label, value, className }: { icon: LineIconName; label: string; value: React.ReactNode; className: string }) {
  return (
    <li className={`flex min-w-0 flex-col items-center gap-1 px-2 py-3 sm:min-w-22 sm:items-start sm:px-3 ${INSET}`}>
      <span className={`flex items-center gap-1.5 text-lg font-semibold tabular-nums ${className} ${DISPLAY}`}>
        <LineIcon name={icon} className="size-4" />
        {value}
      </span>
      <span className={`text-xs ${FAINT}`}>{label}</span>
    </li>
  );
}

function ProfileSkeleton() {
  return (
    <div className={`flex flex-col gap-6 ${CARD} p-8!`} aria-busy="true" aria-label="Завантаження профілю">
      <div className="flex items-center gap-6">
        <div className={`size-40 shrink-0 ${SKELETON}`} />
        <div className="flex flex-1 flex-col gap-3">
          <div className={`h-4 w-28 ${SKELETON}`} />
          <div className={`h-8 w-56 ${SKELETON}`} />
        </div>
      </div>
      <div className={`h-2.5 w-full ${SKELETON}`} />
    </div>
  );
}
