// The only entry point for server data (doc §9). Components and hooks call these functions and get
// domain models (shared/types.ts); they never see URLs, DTOs or mocks.
//
// Going live: set NEXT_PUBLIC_API_URL (e.g. in .env.local) → real requests to `${URL}/api/v1/...`.
// While it is unset, the in-memory mock backend (mock.ts) answers with the same DTO shapes.
import type { InventoryItem, Me, Organization, Quest, Reward } from '@/shared/types';
import type {
  CompleteProfileRequest,
  CreateQuestRequest,
  OrganizationDto,
  ProfileDto,
  QuestClaimDto,
  QuestDto,
  RewardDto,
  UserRewardDto,
} from './dto';
import { http } from './http';
import { toInventoryItem, toMe, toOrganization, toQuest, toReward } from './mappers';
import { mockApi } from './mock';

const USE_MOCK = !process.env.NEXT_PUBLIC_API_URL;

export const ENDPOINTS = {
  profiles: '/profiles',
  me: '/profiles/me',
  inventory: '/profiles/me/inventory',
  organizations: '/organizations', // ASSUMED: not in the API yet
  quests: '/quests',
  quest: (id: string) => `/quests/${id}`,
  claimQuest: (id: string) => `/quests/${id}/claim`,
  approveClaim: (claimId: string) => `/claims/${claimId}/approve`,
  rewards: '/rewards',
  buyReward: (id: string) => `/rewards/${id}/buy`,
};

/** Area for GET /quests; radius in meters (unit ASSUMED — confirm with the backend). */
export type QuestArea = { lat: number; lng: number; radius: number };

// ---------- profile ----------

/** POST /profiles — complete the profile after the first login. */
export async function completeProfile(input: CompleteProfileRequest): Promise<Me> {
  const dto = USE_MOCK
    ? await mockApi.completeProfile(input)
    : await http<ProfileDto>(ENDPOINTS.profiles, { method: 'POST', body: input });
  return toMe(dto);
}

/** GET /profiles/me — profile, balance and XP. */
export async function getMe(): Promise<Me> {
  const dto = USE_MOCK ? await mockApi.getMe() : await http<ProfileDto>(ENDPOINTS.me);
  return toMe(dto);
}

/** GET /profiles/me/inventory — bought promo codes. */
export async function getInventory(): Promise<InventoryItem[]> {
  const dtos = USE_MOCK ? await mockApi.getInventory() : await http<UserRewardDto[]>(ENDPOINTS.inventory);
  return dtos.map(toInventoryItem);
}

// ---------- organizations ----------

/** GET /organizations — all organizations (filter on the map). ASSUMED endpoint. */
export async function getOrganizations(): Promise<Organization[]> {
  const dtos = USE_MOCK ? await mockApi.getOrganizations() : await http<OrganizationDto[]>(ENDPOINTS.organizations);
  return dtos.map(toOrganization);
}

// ---------- quests ----------

/** GET /quests?lat&lng&radius — quests for the map. */
export async function getQuests({ lat, lng, radius }: QuestArea): Promise<Quest[]> {
  const dtos = USE_MOCK
    ? await mockApi.getQuests(lat, lng, radius)
    : await http<QuestDto[]>(ENDPOINTS.quests, { query: { lat, lng, radius } });
  return dtos.map(toQuest);
}

/** GET /quests/{id} — full quest card. */
export async function getQuest(id: string): Promise<Quest> {
  const dto = USE_MOCK ? await mockApi.getQuest(Number(id)) : await http<QuestDto>(ENDPOINTS.quest(id));
  return toQuest(dto);
}

/** POST /quests — create a quest (organization role only). */
export async function createQuest(input: CreateQuestRequest): Promise<Quest> {
  const dto = USE_MOCK
    ? await mockApi.createQuest(input)
    : await http<QuestDto>(ENDPOINTS.quests, { method: 'POST', body: input });
  return toQuest(dto);
}

/** POST /quests/{id}/claim — the «Записатися» button. */
export async function claimQuest(id: string): Promise<void> {
  if (USE_MOCK) await mockApi.claimQuest(Number(id));
  else await http<QuestClaimDto>(ENDPOINTS.claimQuest(id), { method: 'POST' });
}

/** PATCH /claims/{id}/approve — organization confirms the work (awards XP and coins). */
export async function approveClaim(claimId: string): Promise<void> {
  if (USE_MOCK) await mockApi.approveClaim(Number(claimId));
  else await http<QuestClaimDto>(ENDPOINTS.approveClaim(claimId), { method: 'PATCH' });
}

// ---------- rewards ----------

/** GET /rewards — the shop storefront. */
export async function getRewards(): Promise<Reward[]> {
  const dtos = USE_MOCK ? await mockApi.getRewards() : await http<RewardDto[]>(ENDPOINTS.rewards);
  return dtos.map(toReward);
}

/** POST /rewards/{id}/buy — deducts the balance and returns the issued promo code. */
export async function buyReward(id: string): Promise<InventoryItem> {
  const dto = USE_MOCK
    ? await mockApi.buyReward(Number(id))
    : await http<UserRewardDto>(ENDPOINTS.buyReward(id), { method: 'POST' });
  return toInventoryItem(dto);
}
