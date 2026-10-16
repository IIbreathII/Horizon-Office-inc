// Backend DTO → frontend domain model. When the API changes, fix the mapping here.
import { CATEGORIES } from '@/shared/categories';
import { levelProgress } from '@/shared/levels';
import type { Category, InventoryItem, Me, ParticipationStatus, Quest, Reward } from '@/shared/types';
import type { ProfileDto, QuestClaimDto, QuestDto, RewardDto, UserRewardDto } from './dto';

const CLAIM_STATUS: Record<string, ParticipationStatus> = {
  claimed: 'joined',
  joined: 'joined',
  in_progress: 'in_progress',
  pending_review: 'pending_review',
  approved: 'completed',
  completed: 'completed',
  rejected: 'rejected',
};

const QUEST_STATUS = ['open', 'full', 'finished', 'cancelled'] as const;

function toCategory(value: string): Category {
  return value in CATEGORIES ? (value as Category) : 'city';
}

export function toParticipation(claim: QuestClaimDto | null | undefined): Quest['myParticipation'] {
  if (!claim) return null;
  return { claimId: String(claim.id), status: CLAIM_STATUS[claim.status] ?? 'joined' };
}

export function toQuest(dto: QuestDto): Quest {
  const status = QUEST_STATUS.find((s) => s === dto.status) ?? 'open';
  return {
    id: String(dto.id),
    title: dto.quest_name,
    description: dto.description,
    category: toCategory(dto.category),
    lat: dto.lat,
    lng: dto.lng,
    address: dto.address,
    startsAt: dto.starts_at ?? null,
    durationHours: dto.duration_hours ?? null,
    slotsTotal: dto.max_volunteers,
    slotsTaken: dto.assigned_volunteers,
    xpReward: dto.reward_xp,
    coinsReward: dto.reward_coins,
    status: status === 'open' && dto.assigned_volunteers >= dto.max_volunteers ? 'full' : status,
    organization: {
      id: String(dto.organization_id),
      name: dto.organization?.organization_name ?? `Організація #${dto.organization_id}`,
      logoUrl: dto.organization?.logo ?? undefined,
    },
    myParticipation: toParticipation(dto.claim),
  };
}

export function toMe(dto: ProfileDto): Me {
  return {
    id: String(dto.id),
    role: dto.role,
    username: dto.username,
    email: dto.email,
    avatarUrl: dto.photo,
    xp: dto.xp,
    balance: dto.balance,
    level: dto.cur_level,
    levelProgress: levelProgress(dto.xp, dto.cur_level),
  };
}

export function toReward(dto: RewardDto): Reward {
  return { id: String(dto.id), title: dto.rewards_name, partnerName: dto.partner_name, cost: dto.cost };
}

export function toInventoryItem(dto: UserRewardDto): InventoryItem {
  return {
    id: String(dto.id),
    rewardId: String(dto.reward_id),
    title: dto.reward?.rewards_name ?? `Нагорода #${dto.reward_id}`,
    partnerName: dto.reward?.partner_name ?? '',
    promoCode: dto.promocode,
    claimedAt: dto.claimed_time,
  };
}
