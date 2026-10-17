// Level presentation only: the level and the XP progress come from the backend (GET /profiles/me),
// which owns the formula (express-api src/modules/claims/level.ts).

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

/** Levels above the last title keep the top title and frame. */
const clampLevel = (level: number) => Math.min(Math.max(level, 1), LEVEL_TITLES.length);

export const levelTitle = (level: number) => LEVEL_TITLES[clampLevel(level) - 1];

export const levelFrameColor = (level: number) => FRAME_COLORS[clampLevel(level) - 1];
