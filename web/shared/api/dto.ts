// Backend REST API request/response shapes (Express + Prisma, camelCase JSON; spec: <backend>/docs).
// Marked ASSUMED: endpoints/fields the backend does not have yet — modelled on its Prisma models
// so they should fit when the routes appear. Adjust only this file and mappers.ts.

export type Id = number;

export type QuestStatusDto = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'archived';
export type ClaimStatusDto = 'pending' | 'approved' | 'rejected' | 'completed' | 'withdrawn';

/** Cursor-paginated list: GET /quests */
export interface CursorPage<T> {
  data: T[];
  meta: { limit: number; hasMore: boolean; nextCursor: string | null };
}

/** Page-paginated list: GET /organizations/{id}/quests, GET /quests/{id}/claims */
export interface PageResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Error body of every non-2xx response. */
export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** GET /organizations */
export interface OrganizationDto {
  userId: Id;
  organizationName: string;
  types: string | null;
  edrpou: string | null;
  contact: string[];
  description: string | null;
  logo: string | null;
  trustScore: number;
  createdAt: string;
  updatedAt: string;
}

/** POST /organizations, PATCH /organizations/me (partial) */
export interface OrganizationInput {
  organizationName: string;
  types?: string | null;
  edrpou?: string | null;
  contact?: string[];
  description?: string | null;
  logo?: string | null;
}

/** POST /quests/{id}/claims → Claim */
export interface ClaimDto {
  id: Id;
  questId: Id;
  userId: Id;
  status: ClaimStatusDto;
  createdAt: string;
  updatedAt: string;
}

/** GET /quests/{id}/claims items (organization): the claim with its volunteer. */
export interface ClaimWithUserDto extends ClaimDto {
  user: { id: Id; username: string | null; photo: string | null; curLevel: number };
}

/** PATCH /quests/{id}/status (organization) */
export type QuestStatusChange = 'in_progress' | 'completed' | 'cancelled';

/** GET /quests (items), GET /quests/{id} */
export interface QuestDto {
  id: Id;
  organizationId: Id;
  questName: string;
  description: string | null;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  maxVolunteers: number;
  assignedVolunteers: number;
  rewardXp: number;
  rewardCoins: number;
  status: QuestStatusDto;
  createdAt: string;
  updatedAt: string;
  organization?: Pick<OrganizationDto, 'userId' | 'organizationName' | 'logo' | 'trustScore'>;
  /** The current user's claim (null: not applied); only sent with a token. Drives «Ви записані» / my quests. */
  claim?: ClaimDto | null;
  /** ASSUMED: not in the backend schema. */
  startsAt?: string | null;
  /** ASSUMED: not in the backend schema. */
  durationHours?: number | null;
}

/** POST /quests, PATCH /quests/{id} (organization) — QuestInput in the spec */
export interface QuestInput {
  questName: string;
  description?: string | null;
  category: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  maxVolunteers: number;
  rewardXp?: number;
  rewardCoins?: number;
}

/** GET /profiles/me — the User model (+ organization if the user owns one). */
export interface ProfileDto {
  id: Id;
  email: string;
  username: string | null;
  photo: string | null;
  contact: string | null;
  status: string;
  xp: number;
  balance: number;
  /** Level by xp — the backend owns the formula. */
  curLevel: number;
  /** XP inside the current level: current of required to reach the next one. */
  levelProgress: { current: number; required: number };
  organization?: Pick<OrganizationDto, 'userId' | 'organizationName'> | null;
}

/** GET /rewards — the Reward model. */
export interface RewardDto {
  id: Id;
  rewardsName: string;
  partnerName: string;
  cost: number;
}

/** GET /profiles/me/inventory, POST /rewards/{id}/buy — the UserReward model. */
export interface UserRewardDto {
  id: Id;
  userId: Id;
  rewardId: Id;
  promocode: string;
  claimedTime: string;
  reward?: RewardDto;
}

/**
 * GET /rewards/slot — the lucky-slot status.
 * One spin is earned for every `questsPerSpin` completed quests (claims with status `completed`).
 */
export interface RewardSlotDto {
  completedQuests: number;
  questsPerSpin: number;
  spinsUsed: number;
}

/** POST /rewards/slot/spin — a free random reward with its promo code (409 when no spins are left). */
export interface RewardSlotSpinDto {
  reward: RewardDto;
  userReward: UserRewardDto;
}
