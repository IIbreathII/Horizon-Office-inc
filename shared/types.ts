// Frontend domain models. Components use only these; backend shapes live in shared/api/dto.ts
// and are converted in shared/api/mappers.ts.

export type Role = 'volunteer' | 'organization';

export type Category =
  | 'animals' | 'ecology' | 'elderly' | 'logistics' | 'donation' | 'city';

export type ParticipationStatus =
  | 'joined' | 'in_progress' | 'pending_review' | 'completed' | 'rejected';

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: Category;
  lat: number | null; // quests without coordinates are not shown on the map
  lng: number | null;
  address: string;
  startsAt: string | null;        // ISO; not in the backend schema yet
  durationHours: number | null;   // not in the backend schema yet
  slotsTotal: number;
  slotsTaken: number;
  xpReward: number;
  coinsReward: number;
  status: 'open' | 'full' | 'in_progress' | 'finished' | 'cancelled';
  organization: { id: string; name: string; logoUrl?: string };
  myParticipation: { claimId: string; status: ParticipationStatus } | null; // for the current user
}

export interface Organization {
  id: string; // = owner's user id
  name: string;
  types: string | null; // e.g. 'ngo', 'charity'
  edrpou: string | null;
  contact: string[];
  description: string | null;
  logoUrl: string | null;
  trustScore: number | null; // 0–5
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'withdrawn';

/** A volunteer's application to a quest, as the organization sees it. */
export interface QuestClaim {
  id: string;
  questId: string;
  status: ClaimStatus;
  volunteer: { id: string; name: string; level: number; photoUrl: string | null };
}

/** A quest that can be placed on the map. */
export type MapQuest = Quest & { lat: number; lng: number };

export const hasCoords = (quest: Quest): quest is MapQuest => quest.lat !== null && quest.lng !== null;

export interface Me {
  id: string;
  role: Role;
  username: string;
  email: string;
  avatarUrl: string | null;
  xp: number;
  balance: number; // coins
  level: number;
  /** XP gathered inside the current level and XP needed for the next one (0 = max level). */
  levelProgress: { current: number; required: number };
}

export interface Reward {
  id: string;
  title: string;
  partnerName: string;
  cost: number; // coins
}

/** A bought reward with its promo code (the user's inventory). */
export interface InventoryItem {
  id: string;
  rewardId: string;
  title: string;
  partnerName: string;
  promoCode: string;
  claimedAt: string; // ISO
}

/** Lucky slot on the rewards page: one free spin for every `questsPerSpin` completed quests. */
export interface RewardSlot {
  completedQuests: number;
  questsPerSpin: number;
  spinsAvailable: number;
  /** Completed quests counted toward the next spin (0 … questsPerSpin - 1). */
  progress: number;
}

/** What a spin won: the reward and the promo code added to the inventory. */
export interface SlotWin {
  reward: Reward;
  item: InventoryItem;
}
