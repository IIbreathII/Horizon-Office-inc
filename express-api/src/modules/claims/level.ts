/**
 * Уровень по опыту. Временная формула: 1 → 0 xp, 2 → 100, 3 → 400, 4 → 900, ...
 * Поменять здесь, когда согласуете формулу (план, раздел 9, вопрос 3).
 */
export function calcLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
}
