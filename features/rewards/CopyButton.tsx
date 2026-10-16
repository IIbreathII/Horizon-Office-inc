'use client';

import { useState } from 'react';
import { LineIcon } from '@/shared/ui/LineIcon';
import { BUTTON_GHOST } from '@/shared/ui/surface';

/** Copies `text` to the clipboard and briefly confirms. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context): the code stays selectable
    }
  }

  return (
    <button type="button" onClick={copy} className={`shrink-0 py-1.5! ${BUTTON_GHOST} ${copied ? 'border-emerald-300/50! text-emerald-300!' : ''}`}>
      <LineIcon name={copied ? 'check' : 'copy'} className="size-4" />
      {copied ? 'Скопійовано' : 'Копіювати'}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Промокод скопійовано' : ''}
      </span>
    </button>
  );
}
