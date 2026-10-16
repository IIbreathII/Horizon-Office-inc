// TanStack Query hooks over api.ts: caching, loading states and invalidation after mutations.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buyReward, claimQuest, getInventory, getMe, getOrganizations, getQuest, getQuests, getRewards, type QuestArea } from './api';

/** The whole city of Dnipro (center of the city frame, radius covering it). */
export const CITY_AREA: QuestArea = { lat: 48.462, lng: 34.996, radius: 25_000 };

export const queryKeys = {
  me: ['me'] as const,
  inventory: ['inventory'] as const,
  organizations: ['organizations'] as const,
  quests: ['quests'] as const,
  questsIn: (area: QuestArea) => ['quests', area] as const,
  quest: (id: string) => ['quest', id] as const,
  rewards: ['rewards'] as const,
};

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: getMe });

export const useInventory = () => useQuery({ queryKey: queryKeys.inventory, queryFn: getInventory });

export const useOrganizations = () => useQuery({ queryKey: queryKeys.organizations, queryFn: getOrganizations });

export const useQuests = (area: QuestArea = CITY_AREA) =>
  useQuery({ queryKey: queryKeys.questsIn(area), queryFn: () => getQuests(area) });

export const useQuest = (id: string | null) =>
  useQuery({ queryKey: queryKeys.quest(id ?? ''), queryFn: () => getQuest(id ?? ''), enabled: id !== null });

export const useRewards = () => useQuery({ queryKey: queryKeys.rewards, queryFn: getRewards });

export function useClaimQuest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: claimQuest,
    onSuccess: (_, id) =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.quests }),
        client.invalidateQueries({ queryKey: queryKeys.quest(id) }),
        client.invalidateQueries({ queryKey: queryKeys.me }),
      ]),
  });
}

export function useBuyReward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: buyReward,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.me }),
        client.invalidateQueries({ queryKey: queryKeys.inventory }),
      ]),
  });
}
