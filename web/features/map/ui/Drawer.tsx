'use client';

import { useEffect } from 'react';
import { ICONS } from '@/shared/icons';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';

type DrawerProps = {
  title: string;
  /** Edge it slides in from (the side of the button that opens it). */
  side: 'left' | 'right';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Under the title, above the scrolling content (e.g. a search field). */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Map drawers for phones and tablets: the whole screen on phones (solid, nothing shows through),
 * a side drawer over the dimmed map on tablets. Closes on the cross, a tap outside or Esc.
 */
export function Drawer({ title, side, open, onOpenChange, toolbar, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const edge = side === 'right' ? 'right-0 sm:rounded-l-2xl' : 'left-0 sm:rounded-r-2xl';
  const hidden = side === 'right' ? 'translate-x-full' : '-translate-x-full';

  return (
    <>
      {/* dims the map; a tap outside the drawer closes it */}
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        aria-label={title}
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 z-50 flex w-full flex-col bg-[#000000]! transition-transform duration-300 ease-out sm:w-[min(24rem,88vw)] sm:bg-[#000000]/90! ${edge} ${GLASS} ${open ? 'translate-x-0' : hidden}`}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-2 pl-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Закрити"
            className="cursor-pointer rounded-full p-2.5 opacity-60 hover:bg-white/10 hover:opacity-100"
          >
            <Icon src={ICONS.close} className="size-3.5" />
          </button>
        </header>
        {toolbar && <div className="shrink-0 px-3 pb-3">{toolbar}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </aside>
    </>
  );
}
