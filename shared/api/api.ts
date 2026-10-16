// The only entry point for server data (doc §9). Components and hooks call these functions and get
// domain models (shared/types.ts); they never see URLs, DTOs or mocks.
//
// Backend: Express API (spec at <backend>/docs). Set NEXT_PUBLIC_API_URL (see .env) to use it; while it is
// unset, the in-memory mock (mock.ts) answers with the same shapes. Endpoints the backend does not have
// yet (profile, rewards, inventory) always use the mock — switch them to http() when the routes appear.
import type { InventoryItem, Me, Organization, Quest, QuestClaim, Reward, RewardSlot, SlotWin } from '@/shared/types';
import type {
  ClaimDto,
  ClaimWithUserDto,
  CompleteProfileRequest,
  CursorPage,
  OrganizationDto,
  OrganizationInput,
  PageResult,
  QuestDto,
  QuestInput,
  QuestStatusChange,
} from './dto';
import { ApiError, http } from './http';
import { toInventoryItem, toMe, toOrganization, toQuest, toQuestClaim, toReward, toRewardSlot, toSlotWin } from './mappers';
import { mockApi } from './mock';

const USE_MOCK = !process.env.NEXT_PUBLIC_API_URL;

// TODO(backend): quests don't include the current user's claim yet (and there is no GET /claims/me),
// so the claims made from this browser are remembered here and merged into quests.
// Remove this block once GET /quests and GET /quests/{id} return `claim`.
const CLAIMS_KEY = 'horizon:my-claims';

function knownClaims(): Record<string, ClaimDto> {
  try {
    return JSON.parse(localStorage.getItem(CLAIMS_KEY) ?? '{}') as Record<string, ClaimDto>;
  } catch {
    return {};
  }
}

function rememberClaim(claim: ClaimDto) {
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify({ ...knownClaims(), [claim.questId]: claim }));
  } catch {
    // storage unavailable: the claim just won't be shown after a reload
  }
}

function withKnownClaim(dto: QuestDto): QuestDto {
  if (dto.claim !== undefined) return dto;
  const claim = knownClaims()[dto.id];
  return claim ? { ...dto, claim } : dto;
}

export const ENDPOINTS = {
  organizations: '/organizations',
  myOrganization: '/organizations/me',
  organizationQuests: (orgId: string) => `/organizations/${orgId}/quests`,
  quests: '/quests',
  quest: (id: string) => `/quests/${id}`,
  questStatus: (id: string) => `/quests/${id}/status`,
  claims: (questId: string) => `/quests/${questId}/claims`,
  claim: (questId: string, claimId: string) => `/quests/${questId}/claims/${claimId}`,
  completeClaim: (questId: string, claimId: string) => `/quests/${questId}/claims/${claimId}/complete`,
};

/** Area for GET /quests; radius in km (max 100). */
export type QuestArea = { lat: number; lng: number; radius: number };

const PAGE_LIMIT = 100; // backend maximum
const MAX_PAGES = 20;

// ---------- profile (no backend route yet → mock) ----------

/** Complete the profile after the first login. TODO: backend route (organizations: POST /organizations). */
export async function completeProfile(input: CompleteProfileRequest): Promise<Me> {
  return toMe(await mockApi.completeProfile(input));
}

/** Profile, balance and XP. TODO: backend route (GET /profiles/me per contract). */
export async function getMe(): Promise<Me> {
  return toMe(await mockApi.getMe());
}

/** Bought promo codes. TODO: backend route (GET /profiles/me/inventory per contract). */
export async function getInventory(): Promise<InventoryItem[]> {
  return (await mockApi.getInventory()).map(toInventoryItem);
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
  return all.map((dto) => toQuest(withKnownClaim(dto)));
}

/** GET /quests/{id} — full quest card. */
export async function getQuest(id: string): Promise<Quest> {
  const dto = USE_MOCK ? await mockApi.getQuest(Number(id)) : withKnownClaim(await http<QuestDto>(ENDPOINTS.quest(id)));
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
    rememberClaim(await http<ClaimDto>(ENDPOINTS.claims(id), { method: 'POST' }));
  } catch (error) {
    // applied earlier (another tab, before a reload…): the user is signed up, so show it as such
    if (!(error instanceof ApiError && error.status === 409 && /already applied/i.test(error.message))) throw error;
    const now = new Date().toISOString();
    rememberClaim({ id: 0, questId: Number(id), userId: 0, status: 'pending', createdAt: now, updatedAt: now });
  }
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
    if (error instanceof ApiError && error.status === 404) return null;
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

// ---------- rewards (no backend route yet → mock) ----------

/** The shop storefront. TODO: backend route (GET /rewards per contract). */
export async function getRewards(): Promise<Reward[]> {
  return (await mockApi.getRewards()).map(toReward);
}

/** Buy a reward: deducts the balance, returns the promo code. TODO: backend route (POST /rewards/{id}/buy). */
export async function buyReward(id: string): Promise<InventoryItem> {
  return toInventoryItem(await mockApi.buyReward(Number(id)));
}

/** Lucky slot: completed quests and spins left. TODO: backend route (GET /rewards/slot, ASSUMED in dto.ts). */
export async function getRewardSlot(): Promise<RewardSlot> {
  return toRewardSlot(await mockApi.getRewardSlot());
}

// TODO(remove-test-spin): test helpers for the lucky slot, mock only (hidden with a real backend).
export const CAN_GRANT_TEST_SPIN = USE_MOCK;

export async function grantTestSpin(): Promise<RewardSlot> {
  return toRewardSlot(await mockApi.grantTestSpin());
}

/** Spend one spin for a free random reward; 409 when none are left. TODO: backend route (POST /rewards/slot/spin). */
export async function spinRewardSlot(): Promise<SlotWin> {
  return toSlotWin(await mockApi.spinRewardSlot());
}
