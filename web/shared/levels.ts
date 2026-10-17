// Level rules, tuned by hand until the backend defines them.

/** Total XP needed to reach each level: index 0 = level 1. */
const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

const LEVEL_TITLES = [
  'Новачок',
  'Помічник',
  'Активіст',
  'Волонтер',
  'Досвідчений волонтер',
  'Наставник',
  'Опора громади',
  'Герой міста',
  'Легенда Дніпра',
  'Почесний волонтер',
];

/** Avatar frame color by level tier. */
const FRAME_COLORS = ['#94a3b8', '#94a3b8', '#34d399', '#34d399', '#38bdf8', '#38bdf8', '#a78bfa', '#a78bfa', '#fbbf24', '#fbbf24'];

const clampLevel = (level: number) => Math.min(Math.max(level, 1), LEVEL_XP.length);

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < LEVEL_XP.length && xp >= LEVEL_XP[level]) level++;
  return level;
}

export function levelProgress(xp: number, level: number): { current: number; required: number } {
  const l = clampLevel(level);
  const start = LEVEL_XP[l - 1];
  const next = LEVEL_XP[l];
  return next === undefined ? { current: 0, required: 0 } : { current: Math.max(0, xp - start), required: next - start };
}

export const levelTitle = (level: number) => LEVEL_TITLES[clampLevel(level) - 1];

export const levelFrameColor = (level: number) => FRAME_COLORS[clampLevel(level) - 1];
