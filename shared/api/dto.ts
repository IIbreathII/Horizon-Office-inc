// Backend REST API (/api/v1) request/response shapes, taken from the DB schema (column names as is).
// Fields marked ASSUMED are not in the schema — confirm them with the backend team and adjust
// only this file and mappers.ts.

export type Id = number;

/** GET /profiles/me — users + volunteers joined. */
export interface ProfileDto {
  id: Id;
  email: string;
  username: string;
  photo: string | null;
  contact: string | null;
  status: string;
  role: 'volunteer' | 'organization'; // ASSUMED: set by POST /profiles
  // volunteers
  xp: number;
  balance: number;
  cur_level: number;
}

export interface OrganizationDto {
  user_id: Id;
  organization_name: string;
  types: string | null;
  edrpou: string | null;
  contact: string[];
  description: string | null;
  logo: string | null;
  trust_score: number | null;
}

/** quest_claims; the schema shows quest_id as int[] — ASSUMED a single id here. */
export interface QuestClaimDto {
  id: Id;
  quest_id: Id;
  volunteer_id: Id;
  status: string; // ASSUMED values: 'claimed' | 'approved' | 'rejected'
}

/** GET /quests, GET /quests/{id} */
export interface QuestDto {
  id: Id;
  organization_id: Id;
  quest_name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  max_volunteers: number;
  assigned_volunteers: number;
  reward_xp: number;
  reward_coins: number;
  status: string; // ASSUMED values: 'open' | 'full' | 'finished' | 'cancelled'
  organization?: Pick<OrganizationDto, 'user_id' | 'organization_name' | 'logo'>; // ASSUMED: embedded
  claim?: QuestClaimDto | null; // ASSUMED: the current user's claim
  starts_at?: string | null; // ASSUMED: not in the schema
  duration_hours?: number | null; // ASSUMED: not in the schema
}

/** GET /rewards */
export interface RewardDto {
  id: Id;
  rewards_name: string;
  partner_name: string;
  cost: number;
}

/** GET /profiles/me/inventory, POST /rewards/{id}/buy */
export interface UserRewardDto {
  id: Id;
  volunteer_id: Id;
  reward_id: Id;
  promocode: string;
  claimed_time: string;
  reward?: RewardDto; // ASSUMED: embedded, for name/partner
}

/** POST /profiles */
export interface CompleteProfileRequest {
  role: 'volunteer' | 'organization';
  contact: string;
}

/** POST /quests */
export interface CreateQuestRequest {
  quest_name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  max_volunteers: number;
  reward_xp: number;
  reward_coins: number;
}
