/**
 * Уровень по опыту. Временная формула: 1 → 0 xp, 2 → 100, 3 → 400, 4 → 900, ...
 * Поменять здесь, когда согласуете формулу (план, раздел 9, вопрос 3).
 * Единственный источник правды: фронт берёт уровень и прогресс из GET /profiles/me, сам не считает.
 */
export function calcLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
}

/** Сколько всего xp нужно, чтобы достичь уровня (обратная к calcLevel). */
export function levelStartXp(level: number): number {
  return 100 * (Math.max(level, 1) - 1) ** 2;
}

/** Уровень и прогресс внутри него: current из required xp до следующего уровня. */
export function levelProgress(xp: number) {
  const level = calcLevel(xp);
  const start = levelStartXp(level);
  return { level, current: Math.max(xp, 0) - start, required: levelStartXp(level + 1) - start };
}
