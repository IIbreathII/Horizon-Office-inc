import type { CSSProperties } from 'react';

// Surfaces for the volunteer pages: translucent deep-blue glass, ivory actions, champagne details.
// No glows: depth comes from translucency, hairlines and one soft neutral shadow.
// Every accent color lives here, so the palette changes in one place.

/** Panel surface: translucent glass with a hairline edge and a top highlight. */
export const PANEL =
  'relative rounded-2xl border border-white/10 bg-[#152a48]/60 text-slate-50 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_9px_-5px_rgba(2,8,20,0.5)]';

/** Panel that reacts to hover with a champagne edge. */
export const PANEL_HOVER = 'transition-colors duration-300 hover:border-[#d9bf8c]/35 hover:bg-[#17304f]/65';

/** A padded panel. */
export const CARD = `${PANEL} p-5`;

/** Inset area inside a panel. */
export const INSET = 'rounded-xl border border-white/[0.06] bg-[#0c1a2e]/50';

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-[#d9bf8c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d33]';

const BUTTON_BASE = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${FOCUS}`;

/** Main action: ivory with a fine top highlight. */
export const ACCENT_FILL = 'bg-[#f1ece2] text-[#0f1d33] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]';

export const BUTTON_PRIMARY = `${BUTTON_BASE} ${ACCENT_FILL} hover:bg-white`;

export const BUTTON_GHOST = `${BUTTON_BASE} border border-white/15 bg-white/[0.04] text-slate-100 hover:border-[#d9bf8c]/45 hover:bg-white/[0.07]`;

/** Muted look for a button that cannot be used (no opacity tricks). */
export const BUTTON_DISABLED = `${BUTTON_BASE} cursor-not-allowed border border-white/[0.06] bg-white/[0.03] font-medium text-slate-400`;

export const BADGE = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold';

/** Soft tile with a hairline behind a category or item icon. */
export const tileStyle = (color: string): CSSProperties => ({
  backgroundColor: `${color}14`,
  boxShadow: `inset 0 0 0 1px ${color}40`,
});

export type StatusTone = 'joined' | 'completed' | 'full' | 'available';

export const STATUS_CHIP: Record<StatusTone, string> = {
  joined: `${BADGE} bg-[#d9bf8c]/12 text-[#e7d3aa] ring-1 ring-[#d9bf8c]/30`,
  completed: `${BADGE} bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-200/25`,
  full: `${BADGE} bg-white/[0.04] text-slate-400 ring-1 ring-white/10`,
  available: `${BADGE} bg-white/[0.06] text-slate-100 ring-1 ring-white/15`,
};

/** Accent text and icon color (titles, section icons, links). */
export const ACCENT_TEXT = 'text-[#d9bf8c]';

export const XP_TEXT = 'text-emerald-200';
export const COIN_TEXT = 'text-[#e8c77f]';

/** Progress (slots, bars). */
export const PROGRESS_FILL = 'bg-[#d9bf8c]';
export const PROGRESS_TRACK = 'bg-white/[0.07]';

/** Secondary and tertiary text on panels. */
export const MUTED = 'text-slate-300';
export const FAINT = 'text-slate-400';

export const SPINNER = 'size-4 animate-spin rounded-full border-2 border-current border-t-transparent';

export const SKELETON = 'animate-pulse rounded-full bg-white/[0.07]';
