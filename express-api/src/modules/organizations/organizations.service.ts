import { prisma } from '../../db/prisma.js';
import { Conflict, NotFound } from '../../common/errors.js';
import { pageResult, toSkipTake } from '../../common/pagination/page.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { organizationsRepository as repo } from './organizations.repository.js';
import type { CreateOrgInput, ListOrgsQuery, UpdateOrgInput } from './organizations.schema.js';

export const organizationsService = {
  async create(userId: number, input: CreateOrgInput) {
    const existing = await repo.findByUserId(userId);

    if (existing && !existing.deletedAt) {
      throw new Conflict('Organization profile already exists');
    }

    // PK = user_id, поэтому удалённый профиль не пересоздаём, а восстанавливаем с новыми данными.
    if (existing) {
      return repo.update(userId, { ...input, deletedAt: null });
    }

    return repo.create({ userId, ...input });
  },

  async list(query: ListOrgsQuery) {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(query.type ? { types: query.type } : {}),
      ...(query.search ? { organizationName: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const { skip, take } = toSkipTake(query);
    const { items, total } = await repo.list(where, skip, take);
    return pageResult(items, total, query.page, query.limit);
  },

  async getById(userId: number) {
    const org = await repo.findActive(userId);
    if (!org) throw new NotFound('Organization not found');
    return org;
  },

  update(userId: number, input: UpdateOrgInput) {
    return repo.update(userId, input);
  },

  /**
   * Soft delete: помечаем организацию удалённой, активные квесты архивируем,
   * незакрытые заявки по ним отклоняем. Всё в одной транзакции.
   */
  async remove(userId: number) {
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { userId }, data: { deletedAt: new Date() } });

      const quests = await tx.quest.findMany({
        where: { organizationId: userId, status: { in: ['open', 'in_progress'] } },
        select: { id: true },
      });
      const questIds = quests.map((q) => q.id);
      if (questIds.length === 0) return;

      await tx.quest.updateMany({ where: { id: { in: questIds } }, data: { status: 'archived' } });
      await tx.questClaim.updateMany({
        where: { questId: { in: questIds }, status: { in: ['pending', 'approved'] } },
        data: { status: 'rejected' },
      });
    });
  },
};
