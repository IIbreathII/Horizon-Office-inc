// Display-only rarity for the reward shop, derived from the price. Tune the thresholds here.

export type Rarity = { label: string; color: string };

const RARITIES: { minCost: number; rarity: Rarity }[] = [
  { minCost: 300, rarity: { label: 'Легендарна', color: '#f59e0b' } },
  { minCost: 200, rarity: { label: 'Епічна', color: '#a78bfa' } },
  { minCost: 100, rarity: { label: 'Рідкісна', color: '#0ea5e9' } },
  { minCost: 0, rarity: { label: 'Звичайна', color: '#2dd4bf' } },
];

export function rewardRarity(cost: number): Rarity {
  return (RARITIES.find((r) => cost >= r.minCost) ?? RARITIES[RARITIES.length - 1]).rarity;
}

/** All rarities, rarest first (e.g. for the lucky-slot reels). */
export const RARITY_LEVELS: Rarity[] = RARITIES.map((r) => r.rarity);
