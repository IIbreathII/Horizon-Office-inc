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
  lat: number;
  lng: number;
  address: string;
  startsAt: string | null;        // ISO; not in the backend schema yet
  durationHours: number | null;   // not in the backend schema yet
  slotsTotal: number;
  slotsTaken: number;
  xpReward: number;
  coinsReward: number;
  status: 'open' | 'full' | 'finished' | 'cancelled';
  organization: { id: string; name: string; logoUrl?: string };
  myParticipation: { claimId: string; status: ParticipationStatus } | null; // for the current user
}

export interface Organization {
  id: string;
  name: string;
  type: string | null;            // e.g. 'ngo', 'charity'
  description: string | null;
  logoUrl: string | null;
  contacts: string[];
  trustScore: number | null;      // 0–5
}

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
