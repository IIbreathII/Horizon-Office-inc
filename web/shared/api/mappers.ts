// Backend DTO → frontend domain model. When the API changes, fix the mapping here.
import { CATEGORIES } from '@/shared/categories';
import { levelProgress } from '@/shared/levels';
import type { Category, InventoryItem, Me, Organization, ParticipationStatus, Quest, QuestClaim, Reward } from '@/shared/types';
import type {
  ClaimDto,
  ClaimStatusDto,
  ClaimWithUserDto,
  OrganizationDto,
  ProfileDto,
  QuestDto,
  QuestStatusDto,
  RewardDto,
  UserRewardDto,
} from './dto';

const CLAIM_STATUS: Record<ClaimStatusDto, ParticipationStatus | null> = {
  pending: 'joined', // applied, waiting for the organization
  approved: 'in_progress', // accepted by the organization
  completed: 'completed', // done, XP and coins awarded
  rejected: 'rejected',
  withdrawn: null, // the volunteer took the application back
};

const QUEST_STATUS: Record<QuestStatusDto, Quest['status']> = {
  open: 'open',
  in_progress: 'in_progress',
  completed: 'finished',
  archived: 'finished',
  cancelled: 'cancelled',
};

function toCategory(value: string): Category {
  return value in CATEGORIES ? (value as Category) : 'city';
}

export function toParticipation(claim: ClaimDto | null | undefined): Quest['myParticipation'] {
  const status = claim ? CLAIM_STATUS[claim.status] : null;
  return claim && status ? { claimId: String(claim.id), status } : null;
}

export function toQuest(dto: QuestDto): Quest {
  const status = QUEST_STATUS[dto.status] ?? 'open';
  return {
    id: String(dto.id),
    title: dto.questName,
    description: dto.description ?? '',
    category: toCategory(dto.category),
    lat: dto.lat,
    lng: dto.lng,
    address: dto.address ?? 'Адресу не вказано',
    startsAt: dto.startsAt ?? null,
    durationHours: dto.durationHours ?? null,
    slotsTotal: dto.maxVolunteers,
    slotsTaken: dto.assignedVolunteers,
    xpReward: dto.rewardXp,
    coinsReward: dto.rewardCoins,
    status: status === 'open' && dto.assignedVolunteers >= dto.maxVolunteers ? 'full' : status,
    organization: {
      id: String(dto.organizationId),
      name: dto.organization?.organizationName ?? `Організація #${dto.organizationId}`,
      logoUrl: dto.organization?.logo ?? undefined,
    },
    myParticipation: toParticipation(dto.claim),
  };
}

export function toOrganization(dto: OrganizationDto): Organization {
  return {
    id: String(dto.userId),
    name: dto.organizationName,
    types: dto.types,
    edrpou: dto.edrpou,
    contact: dto.contact,
    description: dto.description,
    logoUrl: dto.logo,
    trustScore: dto.trustScore,
  };
}

export function toQuestClaim(dto: ClaimWithUserDto): QuestClaim {
  return {
    id: String(dto.id),
    questId: String(dto.questId),
    status: dto.status,
    volunteer: {
      id: String(dto.user.id),
      name: dto.user.username ?? `Волонтер #${dto.user.id}`,
      level: dto.user.curLevel,
      photoUrl: dto.user.photo,
    },
  };
}

export function toMe(dto: ProfileDto): Me {
  return {
    id: String(dto.id),
    role: dto.organization ? 'organization' : 'volunteer',
    username: dto.username ?? dto.email.split('@')[0],
    email: dto.email,
    avatarUrl: dto.photo,
    xp: dto.xp,
    balance: dto.balance,
    level: dto.curLevel,
    levelProgress: levelProgress(dto.xp, dto.curLevel),
  };
}

export function toReward(dto: RewardDto): Reward {
  return { id: String(dto.id), title: dto.rewardsName, partnerName: dto.partnerName, cost: dto.cost };
}

export function toInventoryItem(dto: UserRewardDto): InventoryItem {
  return {
    id: String(dto.id),
    rewardId: String(dto.rewardId),
    title: dto.reward?.rewardsName ?? `Нагорода #${dto.rewardId}`,
    partnerName: dto.reward?.partnerName ?? '',
    promoCode: dto.promocode,
    claimedAt: dto.claimedTime,
  };
}
