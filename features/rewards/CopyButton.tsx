'use client';

import { useState } from 'react';
import { BUTTON } from '@/shared/ui/PageShell';

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
    <button type="button" onClick={copy} className={BUTTON}>
      {copied ? 'Скопійовано' : 'Копіювати'}
    </button>
  );
}
