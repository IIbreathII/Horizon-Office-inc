// The only entry point for server data (doc §9). Components and hooks call these functions and get
// domain models (shared/types.ts); they never see URLs, DTOs or mocks.
//
// Backend: Express API (spec at <backend>/docs). Set NEXT_PUBLIC_API_URL (see .env) to use it; while it is
// unset, the in-memory mock (mock.ts) answers with the same shapes.
// Login and registration go to the separate auth API (go-api) — see features/auth/authApi.ts.
import type { InventoryItem, Me, Organization, Quest, QuestClaim, Reward, RewardSlot, SlotWin } from '@/shared/types';
import type {
  ClaimDto,
  ClaimWithUserDto,
  CursorPage,
  OrganizationDto,
  OrganizationInput,
  PageResult,
  ProfileDto,
  QuestDto,
  QuestInput,
  QuestStatusChange,
  RewardDto,
  RewardSlotDto,
  RewardSlotSpinDto,
  UserRewardDto,
} from './dto';
import { ApiError, http } from './http';
import { toInventoryItem, toMe, toOrganization, toQuest, toQuestClaim, toReward, toRewardSlot, toSlotWin } from './mappers';
import { mockApi } from './mock';

const USE_MOCK = !process.env.NEXT_PUBLIC_API_URL;
/** No backend configured: the in-memory mock answers and nobody needs to sign in. */
export const IS_MOCK = USE_MOCK;

export const ENDPOINTS = {
  me: '/profiles/me',
  inventory: '/profiles/me/inventory',
  myQuests: '/profiles/me/quests',
  rewards: '/rewards',
  buyReward: (id: string) => `/rewards/${id}/buy`,
  rewardSlot: '/rewards/slot',
  spinRewardSlot: '/rewards/slot/spin',
  organizations: '/organizations',
  myOrganization: '/organizations/me',
  organizationQuests: (orgId: string) => `/organizations/${orgId}/quests`,
  quests: '/quests',
  quest: (id: string) => `/quests/${id}`,
  questStatus: (id: string) => `/quests/${id}/status`,
  claims: (questId: string) => `/quests/${questId}/claims`,
  myClaim: (questId: string) => `/quests/${questId}/claims/me`,
  claim: (questId: string, claimId: string) => `/quests/${questId}/claims/${claimId}`,
  completeClaim: (questId: string, claimId: string) => `/quests/${questId}/claims/${claimId}/complete`,
};

/** Area for GET /quests; radius in km (max 100). */
export type QuestArea = { lat: number; lng: number; radius: number };

const PAGE_LIMIT = 100; // backend maximum
const MAX_PAGES = 20;

// ---------- profile ----------

/** GET /profiles/me — profile, balance and XP. */
export async function getMe(): Promise<Me> {
  return toMe(USE_MOCK ? await mockApi.getMe() : await http<ProfileDto>(ENDPOINTS.me));
}

/** GET /profiles/me/quests — every quest I applied to, in any quest status (in progress, completed…). */
export async function getMyQuests(): Promise<Quest[]> {
  const quests = USE_MOCK ? await mockApi.getMyQuests() : await http<QuestDto[]>(ENDPOINTS.myQuests);
  return quests.map(toQuest);
}

/** GET /profiles/me/inventory — bought and won promo codes, newest first. */
export async function getInventory(): Promise<InventoryItem[]> {
  const items = USE_MOCK ? await mockApi.getInventory() : await http<UserRewardDto[]>(ENDPOINTS.inventory);
  return items.map(toInventoryItem);
}

// ---------- organizations ----------

/** GET /organizations — all organizations (filter on the map); paginated, follows all pages. */
export async function getOrganizations(): Promise<Organization[]> {
  if (USE_MOCK) return (await mockApi.getOrganizations()).data.map(toOrganization);
  const all: OrganizationDto[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await http<PageResult<OrganizationDto>>(ENDPOINTS.organizations, { query: { page, limit: PAGE_LIMIT } });
    all.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return all.map(toOrganization);
}

// ---------- quests ----------

/** GET /quests?lat&lng&radius — open quests in the area; follows the cursor through all pages. */
export async function getQuests({ lat, lng, radius }: QuestArea): Promise<Quest[]> {
  if (USE_MOCK) return (await mockApi.getQuests(lat, lng, radius)).data.map(toQuest);

  const all: QuestDto[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await http<CursorPage<QuestDto>>(ENDPOINTS.quests, { query: { lat, lng, radius, limit: PAGE_LIMIT, cursor } });
    all.push(...res.data);
    if (!res.meta.hasMore || !res.meta.nextCursor) break;
    cursor = res.meta.nextCursor;
  }
  return all.map(toQuest);
}

/** GET /quests/{id} — full quest card (with the current user's claim). */
export async function getQuest(id: string): Promise<Quest> {
  const dto = USE_MOCK ? await mockApi.getQuest(Number(id)) : await http<QuestDto>(ENDPOINTS.quest(id));
  return toQuest(dto);
}

/** POST /quests — create a quest (organization profile required). */
export async function createQuest(input: QuestInput): Promise<Quest> {
  const dto = USE_MOCK
    ? await mockApi.createQuest(input)
    : await http<QuestDto>(ENDPOINTS.quests, { method: 'POST', body: input });
  return toQuest(dto);
}

/** PATCH /quests/{id} — edit an own quest (only while open / in progress). */
export async function updateQuest(id: string, input: Partial<QuestInput>): Promise<Quest> {
  const dto = USE_MOCK
    ? await mockApi.updateQuest(Number(id), input)
    : await http<QuestDto>(ENDPOINTS.quest(id), { method: 'PATCH', body: input });
  return toQuest(dto);
}

/** DELETE /quests/{id} — deleted if nobody applied, otherwise archived. */
export async function deleteQuest(id: string): Promise<'deleted' | 'archived'> {
  const res = USE_MOCK
    ? await mockApi.deleteQuest(Number(id))
    : await http<{ id: number; result: 'deleted' | 'archived' }>(ENDPOINTS.quest(id), { method: 'DELETE' });
  return res.result;
}

/** PATCH /quests/{id}/status — open → in_progress / cancelled, in_progress → completed / cancelled. */
export async function changeQuestStatus(id: string, status: QuestStatusChange): Promise<Quest> {
  const dto = USE_MOCK
    ? await mockApi.changeQuestStatus(Number(id), status)
    : await http<QuestDto>(ENDPOINTS.questStatus(id), { method: 'PATCH', body: { status } });
  return toQuest(dto);
}

/** POST /quests/{id}/claims — the «Записатися» button (needs auth). */
export async function claimQuest(id: string): Promise<void> {
  if (USE_MOCK) {
    await mockApi.claimQuest(Number(id));
    return;
  }
  try {
    await http<ClaimDto>(ENDPOINTS.claims(id), { method: 'POST' });
  } catch (error) {
    // applied earlier (another tab…): the refetched quest shows the existing claim
    if (!(error instanceof ApiError && error.status === 409 && /already applied/i.test(error.message))) throw error;
  }
}

/** DELETE /quests/{id}/claims/me — «Скасувати заявку»: takes back a pending or approved claim. */
export async function withdrawClaim(id: string): Promise<void> {
  if (USE_MOCK) await mockApi.withdrawClaim(Number(id));
  else await http(ENDPOINTS.myClaim(id), { method: 'DELETE' });
}

/** GET /quests/{id}/claims — applications to an own quest, with the volunteers (follows all pages). */
export async function getQuestClaims(questId: string): Promise<QuestClaim[]> {
  if (USE_MOCK) return (await mockApi.getQuestClaims(Number(questId))).data.map(toQuestClaim);
  const all: ClaimWithUserDto[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await http<PageResult<ClaimWithUserDto>>(ENDPOINTS.claims(questId), { query: { page, limit: PAGE_LIMIT } });
    all.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return all.map(toQuestClaim);
}

/** PATCH /quests/{id}/claims/{claimId} — organization approves (takes a slot) or rejects an application. */
export async function decideClaim(questId: string, claimId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (USE_MOCK) await mockApi.decideClaim(Number(questId), Number(claimId), status);
  else await http<ClaimDto>(ENDPOINTS.claim(questId, claimId), { method: 'PATCH', body: { status } });
}

/** POST /quests/{id}/claims/{claimId}/complete — organization confirms the work (awards XP and coins). */
export async function completeClaim(questId: string, claimId: string): Promise<void> {
  if (USE_MOCK) await mockApi.completeClaim(Number(questId), Number(claimId));
  else await http(ENDPOINTS.completeClaim(questId, claimId), { method: 'POST' });
}

// ---------- organization ----------

/** GET /organizations/me — the current user's organization, or null if they have none yet. */
export async function getMyOrganization(): Promise<Organization | null> {
  try {
    const dto = USE_MOCK ? await mockApi.getMyOrganization() : await http<OrganizationDto>(ENDPOINTS.myOrganization);
    return toOrganization(dto);
  } catch (error) {
    // no profile: the Express API answers 403 «Organization profile required» (its requireOrg guard), the mock 404
    const noProfile =
      error instanceof ApiError &&
      (error.status === 404 || (error.status === 403 && /organization profile required/i.test(error.message)));
    if (noProfile) return null;
    throw error;
  }
}

/** POST /organizations — create the organization profile of the current user. */
export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const dto = USE_MOCK
    ? await mockApi.createOrganization(input)
    : await http<OrganizationDto>(ENDPOINTS.organizations, { method: 'POST', body: input });
  return toOrganization(dto);
}

/** PATCH /organizations/me — update the organization profile. */
export async function updateOrganization(input: Partial<OrganizationInput>): Promise<Organization> {
  const dto = USE_MOCK
    ? await mockApi.updateOrganization(input)
    : await http<OrganizationDto>(ENDPOINTS.myOrganization, { method: 'PATCH', body: input });
  return toOrganization(dto);
}

/** GET /organizations/{id}/quests — all quests of an organization, any status (follows all pages). */
export async function getOrganizationQuests(orgId: string): Promise<Quest[]> {
  if (USE_MOCK) return (await mockApi.getOrganizationQuests(Number(orgId))).data.map(toQuest);
  const all: QuestDto[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await http<PageResult<QuestDto>>(ENDPOINTS.organizationQuests(orgId), { query: { page, limit: PAGE_LIMIT } });
    all.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return all.map(toQuest);
}

// ---------- rewards ----------

/** GET /rewards — the shop storefront, cheapest first. */
export async function getRewards(): Promise<Reward[]> {
  const rewards = USE_MOCK ? await mockApi.getRewards() : await http<RewardDto[]>(ENDPOINTS.rewards);
  return rewards.map(toReward);
}

/** POST /rewards/{id}/buy — deducts the balance, returns the promo code; 402 when coins are short. */
export async function buyReward(id: string): Promise<InventoryItem> {
  const item = USE_MOCK
    ? await mockApi.buyReward(Number(id))
    : await http<UserRewardDto>(ENDPOINTS.buyReward(id), { method: 'POST' });
  return toInventoryItem(item);
}

/** GET /rewards/slot — lucky slot: completed quests and spins used. */
export async function getRewardSlot(): Promise<RewardSlot> {
  return toRewardSlot(USE_MOCK ? await mockApi.getRewardSlot() : await http<RewardSlotDto>(ENDPOINTS.rewardSlot));
}

// TODO(remove-test-spin): test helpers for the lucky slot, mock only (hidden with a real backend).
export const CAN_GRANT_TEST_SPIN = USE_MOCK;

export async function grantTestSpin(): Promise<RewardSlot> {
  return toRewardSlot(await mockApi.grantTestSpin());
}

/** POST /rewards/slot/spin — spend one spin for a free random reward; 409 when none are left. */
export async function spinRewardSlot(): Promise<SlotWin> {
  const win = USE_MOCK
    ? await mockApi.spinRewardSlot()
    : await http<RewardSlotSpinDto>(ENDPOINTS.spinRewardSlot, { method: 'POST' });
  return toSlotWin(win);
}
