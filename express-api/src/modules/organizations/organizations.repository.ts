import { prisma, type Tx } from '../../db/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

// Что отдаём наружу: всё, кроме служебного deletedAt.
export const orgPublicSelect = {
  userId: true,
  organizationName: true,
  types: true,
  edrpou: true,
  contact: true,
  description: true,
  logo: true,
  trustScore: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

export const organizationsRepository = {
  findByUserId(userId: number, db: Tx | typeof prisma = prisma) {
    return db.organization.findUnique({ where: { userId } });
  },

  findActive(userId: number) {
    return prisma.organization.findFirst({
      where: { userId, deletedAt: null },
      select: orgPublicSelect,
    });
  },

  async list(where: Prisma.OrganizationWhereInput, skip: number, take: number) {
    const [items, total] = await prisma.$transaction([
      prisma.organization.findMany({
        where,
        select: orgPublicSelect,
        orderBy: [{ createdAt: 'desc' }, { userId: 'desc' }],
        skip,
        take,
      }),
      prisma.organization.count({ where }),
    ]);
    return { items, total };
  },

  create(data: Prisma.OrganizationUncheckedCreateInput) {
    return prisma.organization.create({ data, select: orgPublicSelect });
  },

  update(userId: number, data: Prisma.OrganizationUncheckedUpdateInput) {
    return prisma.organization.update({ where: { userId }, data, select: orgPublicSelect });
  },
};
