'use client';

import { useEffect, useRef } from 'react';
import type { InventoryItem, Reward } from '@/shared/types';
import { DISPLAY } from '@/shared/ui/fonts';
import { LineIcon } from '@/shared/ui/LineIcon';
import { BUTTON_GHOST, BUTTON_PRIMARY, COIN_TEXT, FAINT, INSET, MUTED, SPINNER, tileStyle } from '@/shared/ui/surface';
import { SystemPanel } from '@/shared/ui/SystemPanel';
import { CopyButton } from './CopyButton';
import { rewardRarity } from './rarity';

export type RedeemState =
  | { status: 'confirm' }
  | { status: 'pending' }
  | { status: 'success'; item: InventoryItem }
  | { status: 'error' };

type RedeemDialogProps = {
  reward: Reward;
  balance: number;
  state: RedeemState;
  onConfirm: () => void;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])';

/** Confirm the exchange, then show the issued promo code. */
export function RedeemDialog({ reward, balance, state, onConfirm, onClose }: RedeemDialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const pending = state.status === 'pending';
  const close = pending ? () => {} : onClose; // don't drop the dialog mid-purchase
  const rarity = rewardRarity(reward.cost);

  // focus the dialog on open and give focus back to the opener on close
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  // move focus to the new content when the step changes (e.g. confirm → success)
  useEffect(() => {
    if (state.status !== 'pending') panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [state.status]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    // focus trap: Tab cycles inside the panel
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md motion-safe:transition-opacity motion-safe:starting:opacity-0"
      onClick={close}
      onKeyDown={onKeyDown}
    >
      <SystemPanel
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-title"
        aria-busy={pending}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-5 bg-[#111113]/95! p-8 text-center"
      >
        {state.status === 'success' ? (
          <Success item={state.item} onClose={onClose} />
        ) : (
          <>
            <span
              className="flex size-16 items-center justify-center rounded-2xl"
              style={{ ...tileStyle(rarity.color), color: rarity.color }}
            >
              <LineIcon name="gift" className="size-8" />
            </span>
            <div>
              <p className="text-xs font-semibold" style={{ color: rarity.color }}>
                {rarity.label} · {reward.partnerName}
              </p>
              <h2 id="redeem-title" className={`mt-1 text-xl leading-snug font-semibold text-white ${DISPLAY}`}>
                {reward.title}
              </h2>
            </div>
            <dl className={`grid w-full grid-cols-[1fr_auto] gap-y-2 px-4 py-3 text-left text-sm ${INSET}`}>
              <dt className={MUTED}>Вартість</dt>
              <dd className={`flex items-center gap-1 justify-self-end font-bold ${COIN_TEXT}`}>
                <LineIcon name="coin" className="size-4" />
                {reward.cost}
              </dd>
              <dt className={MUTED}>Залишиться</dt>
              <dd className="flex items-center gap-1 justify-self-end text-neutral-100">
                <LineIcon name="coin" className="size-4" />
                {balance - reward.cost}
              </dd>
            </dl>
            {state.status === 'error' && (
              <p role="alert" className="text-sm text-rose-300">
                Обмін не пройшов, монети не списано. Спробуйте ще раз
              </p>
            )}
            <div className="flex w-full gap-2">
              <button type="button" onClick={onClose} disabled={pending} className={`flex-1 ${BUTTON_GHOST}`}>
                Скасувати
              </button>
              <button type="button" onClick={onConfirm} disabled={pending} className={`flex-1 ${BUTTON_PRIMARY}`}>
                {pending && <span className={SPINNER} />}
                {state.status === 'error' ? 'Ще раз' : 'Обміняти'}
              </button>
            </div>
          </>
        )}
      </SystemPanel>
    </div>
  );
}

function Success({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  return (
    // "pop" on appear; skipped with reduced motion
    <div className="flex w-full flex-col items-center gap-5 motion-safe:transition motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:scale-95 motion-safe:starting:opacity-0">
      <span className="flex size-16 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-emerald-300">
        <LineIcon name="check" className="size-8" />
      </span>
      <div>
        <p className="text-sm font-semibold text-emerald-300">Обмін успішний</p>
        <h2 id="redeem-title" className={`mt-1 text-xl leading-snug font-semibold text-white ${DISPLAY}`}>
          {item.title}
        </h2>
        <p className={`mt-0.5 text-xs ${FAINT}`}>{item.partnerName}</p>
      </div>
      <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-[#fbbf24]/30 bg-black/50 p-5">
        <p className={`text-xs ${FAINT}`}>Ваш промокод</p>
        <code className={`font-mono text-2xl tracking-[0.2em] break-all select-all ${COIN_TEXT}`}>{item.promoCode}</code>
        <CopyButton text={item.promoCode} />
      </div>
      <p className={`text-xs ${FAINT}`}>Код також збережено у вашому профілі</p>
      <button type="button" onClick={onClose} className={`w-full ${BUTTON_PRIMARY}`}>
        Готово
      </button>
    </div>
  );
}
