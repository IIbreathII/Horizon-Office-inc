import { prisma } from '../../db/prisma.js';
import { Conflict, Forbidden, NotFound } from '../../common/errors.js';
import { cursorResult, decodeCursor } from '../../common/pagination/cursor.js';
import { pageResult, toSkipTake } from '../../common/pagination/page.js';
import type { Prisma, Quest } from '../../generated/prisma/client.js';
import type { QuestStatus } from '../../generated/prisma/enums.js';
import { questsRepository as repo } from './quests.repository.js';
import type {
  ChangeStatusInput,
  CreateQuestInput,
  FeedQuery,
  OrgQuestsQuery,
  UpdateQuestInput,
} from './quests.schema.js';

/** Разрешённые ручные переходы статуса. */
export const QUEST_TRANSITIONS: Record<QuestStatus, QuestStatus[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  archived: [],
};

const EDITABLE: QuestStatus[] = ['open', 'in_progress'];

const KM_PER_DEGREE = 111.32;

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / KM_PER_DEGREE;
  const dLng = radiusKm / (KM_PER_DEGREE * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return {
    lat: { gte: lat - dLat, lte: lat + dLat },
    lng: { gte: lng - dLng, lte: lng + dLng },
  };
}

/**
 * Для вошедшего пользователя добавляет к квестам его заявку (`claim`, null — не подавал).
 * Анонимам поле не добавляется: «не подавал» и «неизвестно» — разные ответы.
 */
async function withMyClaims<T extends { id: number }>(quests: T[], userId: number | undefined) {
  if (userId === undefined) return quests;
  const claims = await prisma.questClaim.findMany({ where: { userId, questId: { in: quests.map((q) => q.id) } } });
  const byQuest = new Map(claims.map((c) => [c.questId, c]));
  return quests.map((q) => ({ ...q, claim: byQuest.get(q.id) ?? null }));
}

async function getOwnedQuest(questId: number, orgId: number): Promise<Quest> {
  const quest = await repo.findById(questId);
  if (!quest) throw new NotFound('Quest not found');
  if (quest.organizationId !== orgId) throw new Forbidden('Not your quest');
  return quest;
}

export const questsService = {
  getOwnedQuest,

  create(orgId: number, input: CreateQuestInput) {
    return repo.create({ ...input, organizationId: orgId });
  },

  async feed(query: FeedQuery, userId?: number) {
    const where: Prisma.QuestWhereInput = {
      status: query.status,
      ...(query.category ? { category: query.category } : {}),
      ...(query.lat !== undefined && query.lng !== undefined && query.radius !== undefined
        ? boundingBox(query.lat, query.lng, query.radius)
        : {}),
    };
    const cursorId = query.cursor ? decodeCursor(query.cursor) : undefined;
    const items = await repo.feed(where, cursorId, query.limit);
    const page = cursorResult(items, query.limit);
    return { ...page, data: await withMyClaims(page.data, userId) };
  },

  async getById(id: number, userId?: number) {
    const quest = await repo.findByIdWithOrg(id);
    if (!quest) throw new NotFound('Quest not found');
    const [withClaim] = await withMyClaims([quest], userId);
    return withClaim;
  },

  async listByOrg(orgId: number, query: OrgQuestsQuery) {
    const org = await prisma.organization.findFirst({ where: { userId: orgId, deletedAt: null }, select: { userId: true } });
    if (!org) throw new NotFound('Organization not found');

    const where: Prisma.QuestWhereInput = { organizationId: orgId, ...(query.status ? { status: query.status } : {}) };
    const { skip, take } = toSkipTake(query);
    const { items, total } = await repo.listByOrg(where, skip, take);
    return pageResult(items, total, query.page, query.limit);
  },

  async update(orgId: number, questId: number, input: UpdateQuestInput) {
    const quest = await getOwnedQuest(questId, orgId);
    if (!EDITABLE.includes(quest.status)) throw new Conflict(`Quest in status "${quest.status}" cannot be edited`);

    // Условие в WHERE защищает от гонки с одобрением заявок и сменой статуса.
    const where: Prisma.QuestWhereInput = { id: questId, status: { in: EDITABLE } };
    if (input.maxVolunteers !== undefined) where.assignedVolunteers = { lte: input.maxVolunteers };

    const { count } = await prisma.quest.updateMany({ where, data: input });
    if (count === 0) {
      throw new Conflict(
        input.maxVolunteers !== undefined
          ? 'maxVolunteers cannot be less than already approved volunteers'
          : 'Quest cannot be edited in its current status',
      );
    }
    return repo.findById(questId);
  },

  async changeStatus(orgId: number, questId: number, { status: next }: ChangeStatusInput) {
    const quest = await getOwnedQuest(questId, orgId);
    if (!QUEST_TRANSITIONS[quest.status].includes(next)) {
      throw new Conflict(`Cannot change status from "${quest.status}" to "${next}"`);
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.quest.updateMany({
        where: { id: questId, status: quest.status },
        data: { status: next },
      });
      if (count === 0) throw new Conflict('Quest status was changed concurrently, retry');

      if (next === 'cancelled') {
        await tx.questClaim.updateMany({
          where: { questId, status: { in: ['pending', 'approved'] } },
          data: { status: 'rejected' },
        });
      }
      if (next === 'completed') {
        // необработанные заявки закрываем; одобренные остаются — их подтверждает организация
        await tx.questClaim.updateMany({ where: { questId, status: 'pending' }, data: { status: 'rejected' } });
      }
    });

    return repo.findById(questId);
  },

  /** Квест с заявками архивируем (история нужна), без заявок — удаляем. */
  async remove(orgId: number, questId: number): Promise<{ id: number; result: 'deleted' | 'archived' }> {
    await getOwnedQuest(questId, orgId);

    return prisma.$transaction(async (tx) => {
      const claims = await tx.questClaim.count({ where: { questId } });
      if (claims === 0) {
        await tx.quest.delete({ where: { id: questId } });
        return { id: questId, result: 'deleted' as const };
      }
      await tx.quest.update({ where: { id: questId }, data: { status: 'archived' } });
      await tx.questClaim.updateMany({
        where: { questId, status: { in: ['pending', 'approved'] } },
        data: { status: 'rejected' },
      });
      return { id: questId, result: 'archived' as const };
    });
  },
};
