// Display-only rarity for the reward shop, derived from the price. Tune the thresholds here.

export type Rarity = { label: string; color: string };

const RARITIES: { minCost: number; rarity: Rarity }[] = [
  { minCost: 300, rarity: { label: 'Легендарна', color: '#fbbf24' } },
  { minCost: 200, rarity: { label: 'Епічна', color: '#818cf8' } },
  { minCost: 100, rarity: { label: 'Рідкісна', color: '#38bdf8' } },
  { minCost: 0, rarity: { label: 'Звичайна', color: '#5eead4' } },
];

export function rewardRarity(cost: number): Rarity {
  return (RARITIES.find((r) => cost >= r.minCost) ?? RARITIES[RARITIES.length - 1]).rarity;
}
