import { prisma } from '../../db/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

export const questOrgInclude = {
  organization: {
    select: { userId: true, organizationName: true, logo: true, trustScore: true },
  },
} satisfies Prisma.QuestInclude;

export const questsRepository = {
  findById(id: number) {
    return prisma.quest.findUnique({ where: { id } });
  },

  findByIdWithOrg(id: number) {
    return prisma.quest.findUnique({ where: { id }, include: questOrgInclude });
  },

  /** Лента: сортировка по id убыванию, берём limit + 1, чтобы понять hasMore. */
  feed(where: Prisma.QuestWhereInput, cursorId: number | undefined, limit: number) {
    return prisma.quest.findMany({
      where: cursorId ? { AND: [where, { id: { lt: cursorId } }] } : where,
      include: questOrgInclude,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
  },

  async listByOrg(where: Prisma.QuestWhereInput, skip: number, take: number) {
    const [items, total] = await prisma.$transaction([
      prisma.quest.findMany({ where, orderBy: { id: 'desc' }, skip, take }),
      prisma.quest.count({ where }),
    ]);
    return { items, total };
  },

  create(data: Prisma.QuestUncheckedCreateInput) {
    return prisma.quest.create({ data });
  },
};
