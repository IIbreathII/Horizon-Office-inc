'use client';

import { useEffect } from 'react';
import type { InventoryItem } from '@/shared/types';
import { BUTTON } from '@/shared/ui/PageShell';
import { CopyButton } from './CopyButton';

/** Shows the promo code issued after a purchase. */
export function RedeemDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg bg-white p-6 text-center text-gray-900"
      >
        <p className="text-4xl">🎉</p>
        <h2 id="redeem-title" className="text-lg font-semibold">
          {item.title}
        </h2>
        <p className="text-sm text-gray-500">{item.partnerName}</p>
        <p className="text-sm">Ваш промокод:</p>
        <div className="flex items-center gap-2">
          <code className="font-mono text-lg">{item.promoCode}</code>
          <CopyButton text={item.promoCode} />
        </div>
        <p className="text-xs text-gray-500">Код також збережено у вашому профілі.</p>
        <button type="button" onClick={onClose} className={BUTTON}>
          Готово
        </button>
      </div>
    </div>
  );
}
