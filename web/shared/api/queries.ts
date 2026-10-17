// TanStack Query hooks over api.ts: caching, loading states and invalidation after mutations.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { OrganizationInput, QuestInput, QuestStatusChange } from './dto';
import {
  buyReward,
  changeQuestStatus,
  claimQuest,
  completeClaim,
  createOrganization,
  createQuest,
  decideClaim,
  deleteQuest,
  getInventory,
  getMe,
  getMyQuests,
  getMyOrganization,
  getOrganizationQuests,
  getOrganizations,
  getQuest,
  getQuestClaims,
  getQuests,
  getRewardSlot,
  grantTestSpin,
  getRewards,
  spinRewardSlot,
  updateOrganization,
  updateQuest,
  withdrawClaim,
  type QuestArea,
} from './api';

/** The whole city of Dnipro (center of the city frame, radius in km covering it). */
export const CITY_AREA: QuestArea = { lat: 48.462, lng: 34.996, radius: 25 };

export const queryKeys = {
  me: ['me'] as const,
  inventory: ['inventory'] as const,
  organizations: ['organizations'] as const,
  quests: ['quests'] as const,
  questsIn: (area: QuestArea) => ['quests', area] as const,
  // under ['quests'], so every quest invalidation refreshes it too
  myQuests: ['quests', 'mine'] as const,
  quest: (id: string) => ['quest', id] as const,
  rewards: ['rewards'] as const,
  rewardSlot: ['reward-slot'] as const,
  myOrganization: ['my-organization'] as const,
  orgQuests: (orgId: string) => ['org-quests', orgId] as const,
  claims: (questId: string) => ['claims', questId] as const,
};

/** After any quest / claim change: refresh everything that shows quests (map, org lists, cards, claims). */
function invalidateQuestData(client: QueryClient) {
  return Promise.all(
    [['quests'], ['quest'], ['org-quests'], ['claims']].map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: getMe });

/** My quests in any status — «Мої квести» and the profile (the map feed has open quests only). */
export const useMyQuests = () => useQuery({ queryKey: queryKeys.myQuests, queryFn: getMyQuests });

export const useInventory = () => useQuery({ queryKey: queryKeys.inventory, queryFn: getInventory });

export const useOrganizations = () => useQuery({ queryKey: queryKeys.organizations, queryFn: getOrganizations });

export const useQuests = (area: QuestArea = CITY_AREA) =>
  useQuery({ queryKey: queryKeys.questsIn(area), queryFn: () => getQuests(area) });

export const useQuest = (id: string | null) =>
  useQuery({ queryKey: queryKeys.quest(id ?? ''), queryFn: () => getQuest(id ?? ''), enabled: id !== null });

export const useRewards = () => useQuery({ queryKey: queryKeys.rewards, queryFn: getRewards });

export const useRewardSlot = () => useQuery({ queryKey: queryKeys.rewardSlot, queryFn: getRewardSlot });

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

// ---------- organization ----------

export const useMyOrganization = () => useQuery({ queryKey: queryKeys.myOrganization, queryFn: getMyOrganization });

export const useOrganizationQuests = (orgId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.orgQuests(orgId ?? ''),
    queryFn: () => getOrganizationQuests(orgId ?? ''),
    enabled: orgId !== undefined,
  });

export const useQuestClaims = (questId: string) =>
  useQuery({ queryKey: queryKeys.claims(questId), queryFn: () => getQuestClaims(questId) });

/** «Скасувати заявку»: the volunteer takes back a pending or approved claim. */
export function useWithdrawClaim() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: withdrawClaim,
    onSuccess: (_, id) =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.quests }),
        client.invalidateQueries({ queryKey: queryKeys.quest(id) }),
      ]),
  });
}

export function useSaveOrganization() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, exists }: { input: OrganizationInput; exists: boolean }) =>
      exists ? updateOrganization(input) : createOrganization(input),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.myOrganization }),
        client.invalidateQueries({ queryKey: queryKeys.organizations }),
        client.invalidateQueries({ queryKey: queryKeys.me }),
      ]),
  });
}

export function useCreateQuest() {
  const client = useQueryClient();
  return useMutation({ mutationFn: createQuest, onSuccess: () => invalidateQuestData(client) });
}

export function useUpdateQuest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<QuestInput> }) => updateQuest(id, input),
    onSuccess: () => invalidateQuestData(client),
  });
}

export function useDeleteQuest() {
  const client = useQueryClient();
  return useMutation({ mutationFn: deleteQuest, onSuccess: () => invalidateQuestData(client) });
}

export function useChangeQuestStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuestStatusChange }) => changeQuestStatus(id, status),
    onSuccess: () => invalidateQuestData(client),
  });
}

export function useDecideClaim() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ questId, claimId, status }: { questId: string; claimId: string; status: 'approved' | 'rejected' }) =>
      decideClaim(questId, claimId, status),
    onSuccess: () => invalidateQuestData(client),
  });
}

export function useCompleteClaim() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ questId, claimId }: { questId: string; claimId: string }) => completeClaim(questId, claimId),
    onSuccess: () =>
      Promise.all([
        invalidateQuestData(client),
        client.invalidateQueries({ queryKey: queryKeys.me }),
        client.invalidateQueries({ queryKey: queryKeys.rewardSlot }), // a completed quest counts toward a spin
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

/** TODO(remove-test-spin): test only — adds one lucky-slot spin. */
export function useGrantTestSpin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: grantTestSpin,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.rewardSlot }),
  });
}

/** Spend a lucky-slot spin: refreshes the spin counter and the inventory with the won promo code. */
export function useSpinRewardSlot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: spinRewardSlot,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.rewardSlot }),
        client.invalidateQueries({ queryKey: queryKeys.inventory }),
      ]),
  });
}
