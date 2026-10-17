import { prisma } from '../../db/prisma.js';
import { questOrgInclude } from '../quests/quests.repository.js';
import { rewardSelect } from '../rewards/rewards.repository.js';

/** Поля users, которые отдаём владельцу профиля (без пароля и google_id). */
const profileSelect = {
  id: true,
  email: true,
  username: true,
  photo: true,
  contact: true,
  status: true,
  xp: true,
  balance: true,
  curLevel: true,
} as const;

export const profilesRepository = {
  findUser(id: number) {
    return prisma.user.findUnique({ where: { id }, select: profileSelect });
  },

  /** Активный (не удалённый) профиль организации пользователя. */
  findOrganization(userId: number) {
    return prisma.organization.findFirst({
      where: { userId, deletedAt: null },
      select: { userId: true, organizationName: true },
    });
  },

  /** Заявки пользователя (кроме отозванных) с квестами и организациями, свежие сверху. */
  myClaims(userId: number) {
    return prisma.questClaim.findMany({
      where: { userId, status: { not: 'withdrawn' } },
      include: { quest: { include: questOrgInclude } },
      orderBy: { updatedAt: 'desc' },
    });
  },

  /** Все промокоды пользователя, новые сверху. */
  inventory(userId: number) {
    return prisma.userReward.findMany({
      where: { userId },
      include: { reward: { select: rewardSelect } },
      orderBy: { claimedTime: 'desc' },
    });
  },
};
