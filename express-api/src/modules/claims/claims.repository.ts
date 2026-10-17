import { prisma } from '../../db/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

export const claimUserInclude = {
  user: { select: { id: true, username: true, photo: true, curLevel: true } },
} satisfies Prisma.QuestClaimInclude;

export const claimsRepository = {
  findById(id: number) {
    return prisma.questClaim.findUnique({ where: { id } });
  },

  findByQuestAndUser(questId: number, userId: number) {
    return prisma.questClaim.findUnique({ where: { questId_userId: { questId, userId } } });
  },

  async list(where: Prisma.QuestClaimWhereInput, skip: number, take: number) {
    const [items, total] = await prisma.$transaction([
      prisma.questClaim.findMany({ where, include: claimUserInclude, orderBy: { id: 'asc' }, skip, take }),
      prisma.questClaim.count({ where }),
    ]);
    return { items, total };
  },
};
