import type { CSSProperties } from 'react';

// Surfaces for the volunteer pages, matched to the map and the nav rail (black glass),
// with gold as the main accent, emerald XP and vivid category / rarity colors.
// Every accent color lives here, so the palette changes in one place.

/** Panel surface: dark glass, a touch lighter than the black page. */
export const PANEL =
  'relative rounded-2xl border border-white/10 bg-[#111113]/85 text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_9px_-5px_rgba(0,0,0,0.6)]';

/** Panel that reacts to hover with a gold edge. */
export const PANEL_HOVER = 'transition-colors duration-300 hover:border-amber-400/50 hover:bg-[#161618]/90';

/** A padded panel. */
export const CARD = `${PANEL} p-5`;

/** Inset area inside a panel. */
export const INSET = 'rounded-xl border border-white/[0.08] bg-black/50';

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

const BUTTON_BASE = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${FOCUS}`;

/** Main action: bright gold with dark text and a soft halo. */
export const ACCENT_FILL = 'bg-amber-300 text-black shadow-[0_0_20px_-4px_rgba(252,211,77,0.7)]';

export const BUTTON_PRIMARY = `${BUTTON_BASE} ${ACCENT_FILL} hover:bg-yellow-200`;

export const BUTTON_GHOST = `${BUTTON_BASE} border border-white/20 bg-white/[0.06] text-white hover:border-amber-400/60 hover:bg-white/10`;

/** Destructive action (delete, reject, cancel). */
export const BUTTON_DANGER = `${BUTTON_BASE} border border-rose-400/50 bg-rose-500/[0.06] text-rose-300 hover:border-rose-300/80 hover:bg-rose-500/15`;

/** Compact size modifier for any button above (rows, toolbars). */
export const BUTTON_SM = 'gap-1.5! px-3! py-1.5! text-xs!';

/** Muted look for a button that cannot be used (no opacity tricks). */
export const BUTTON_DISABLED = `${BUTTON_BASE} cursor-not-allowed border border-white/[0.08] bg-white/[0.04] font-medium text-neutral-500`;

export const BADGE = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold';

/** Tile with a bright edge and a soft halo behind a category or item icon. */
export const tileStyle = (color: string): CSSProperties => ({
  backgroundColor: `${color}38`,
  boxShadow: `inset 0 0 0 1px ${color}d9, 0 0 16px -4px ${color}`,
});

export type StatusTone = 'joined' | 'completed' | 'full' | 'available' | 'danger';

export const STATUS_CHIP: Record<StatusTone, string> = {
  joined: `${BADGE} bg-amber-300/20 text-amber-200 ring-1 ring-amber-300/80 shadow-[0_0_12px_-3px_rgba(252,211,77,0.6)]`,
  completed: `${BADGE} bg-emerald-300/20 text-emerald-200 ring-1 ring-emerald-300/80 shadow-[0_0_12px_-3px_rgba(110,231,183,0.6)]`,
  full: `${BADGE} bg-white/[0.06] text-neutral-400 ring-1 ring-white/15`,
  available: `${BADGE} bg-white/10 text-white ring-1 ring-white/40`,
  danger: `${BADGE} bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/60`,
};

/** Accent text and icon color (titles, section icons, links). */
export const ACCENT_TEXT = 'text-amber-300';

/** Bright figures glow softly on the dark panels. */
export const XP_TEXT = 'text-emerald-300 [text-shadow:0_0_14px_rgba(110,231,183,0.55)]';
export const COIN_TEXT = 'text-yellow-300 [text-shadow:0_0_14px_rgba(253,224,71,0.5)]';

/** Progress (slots, bars). */
export const PROGRESS_FILL = 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.7)]';
export const PROGRESS_TRACK = 'bg-white/10';

/** Secondary and tertiary text on panels. */
export const MUTED = 'text-neutral-300';
export const FAINT = 'text-neutral-400';

export const SPINNER = 'size-4 animate-spin rounded-full border-2 border-current border-t-transparent';

export const SKELETON = 'animate-pulse rounded-full bg-white/10';
