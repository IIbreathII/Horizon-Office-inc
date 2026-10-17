import { prisma, type Tx } from '../../db/prisma.js';
import { Conflict, Forbidden, NotFound } from '../../common/errors.js';
import { pageResult, toSkipTake } from '../../common/pagination/page.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { QuestStatus } from '../../generated/prisma/enums.js';
import { questsService } from '../quests/quests.service.js';
import { claimsRepository as repo } from './claims.repository.js';
import type { DecideClaimInput, ListClaimsQuery } from './claims.schema.js';
import { calcLevel } from './level.js';

/** В каких статусах квеста организация может одобрять/отклонять заявки. */
const DECIDABLE_QUEST: QuestStatus[] = ['open', 'in_progress'];
/** В каких статусах квеста можно подтверждать выполнение. */
const COMPLETABLE_QUEST: QuestStatus[] = ['open', 'in_progress', 'completed'];

/** Освободить место на квесте (после отзыва/отклонения одобренной заявки). */
function releaseSlot(tx: Tx, questId: number) {
  return tx.quest.updateMany({
    where: { id: questId, assignedVolunteers: { gt: 0 } },
    data: { assignedVolunteers: { decrement: 1 } },
  });
}

async function getClaimOfQuest(questId: number, claimId: number) {
  const claim = await repo.findById(claimId);
  if (!claim || claim.questId !== questId) throw new NotFound('Claim not found');
  return claim;
}

export const claimsService = {
  /** Волонтёр подаёт заявку. */
  async apply(userId: number, questId: number) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFound('Quest not found');
    if (quest.status !== 'open') throw new Conflict('Quest is not open for applications');
    if (quest.organizationId === userId) throw new Forbidden('Cannot apply to your own quest');

    const existing = await repo.findByQuestAndUser(questId, userId);
    if (existing) {
      // после отзыва можно подать заново; во всех остальных статусах — повтор
      if (existing.status !== 'withdrawn') throw new Conflict('You have already applied to this quest');
      const { count } = await prisma.questClaim.updateMany({
        where: { id: existing.id, status: 'withdrawn' },
        data: { status: 'pending' },
      });
      if (count === 0) throw new Conflict('Claim was changed concurrently, retry');
      return repo.findById(existing.id);
    }

    try {
      return await prisma.questClaim.create({ data: { questId, userId } });
    } catch (e) {
      // гонка двух одновременных заявок одного юзера
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new Conflict('You have already applied to this quest');
      }
      throw e;
    }
  },

  /** Волонтёр отзывает свою заявку. */
  async withdraw(userId: number, questId: number) {
    const claim = await repo.findByQuestAndUser(questId, userId);
    if (!claim) throw new NotFound('Claim not found');

    await prisma.$transaction(async (tx) => {
      const approved = await tx.questClaim.updateMany({
        where: { id: claim.id, status: 'approved' },
        data: { status: 'withdrawn' },
      });
      if (approved.count === 1) {
        await releaseSlot(tx, questId);
        return;
      }
      const pending = await tx.questClaim.updateMany({
        where: { id: claim.id, status: 'pending' },
        data: { status: 'withdrawn' },
      });
      if (pending.count === 0) throw new Conflict(`Claim in status "${claim.status}" cannot be withdrawn`);
    });
  },

  /** Организация смотрит заявки на свой квест. */
  async list(orgId: number, questId: number, query: ListClaimsQuery) {
    await questsService.getOwnedQuest(questId, orgId);
    const where: Prisma.QuestClaimWhereInput = { questId, ...(query.status ? { status: query.status } : {}) };
    const { skip, take } = toSkipTake(query);
    const { items, total } = await repo.list(where, skip, take);
    return pageResult(items, total, query.page, query.limit);
  },

  /** Организация одобряет или отклоняет заявку. */
  async decide(orgId: number, questId: number, claimId: number, { status }: DecideClaimInput) {
    const quest = await questsService.getOwnedQuest(questId, orgId);
    if (!DECIDABLE_QUEST.includes(quest.status)) {
      throw new Conflict(`Claims cannot be changed while quest is "${quest.status}"`);
    }
    const claim = await getClaimOfQuest(questId, claimId);

    await prisma.$transaction(async (tx) => {
      if (status === 'approved') {
        const moved = await tx.questClaim.updateMany({
          where: { id: claim.id, status: 'pending' },
          data: { status: 'approved' },
        });
        if (moved.count === 0) throw new Conflict(`Only pending claims can be approved (current: "${claim.status}")`);

        // Атомарно занимаем место: два одновременных approve не превысят maxVolunteers.
        const slot = await tx.quest.updateMany({
          where: {
            id: questId,
            status: { in: DECIDABLE_QUEST },
            assignedVolunteers: { lt: tx.quest.fields.maxVolunteers },
          },
          data: { assignedVolunteers: { increment: 1 } },
        });
        if (slot.count === 0) throw new Conflict('No free slots on this quest'); // откатит и статус заявки
        return;
      }

      // rejected: из approved — с освобождением места, из pending — просто
      const fromApproved = await tx.questClaim.updateMany({
        where: { id: claim.id, status: 'approved' },
        data: { status: 'rejected' },
      });
      if (fromApproved.count === 1) {
        await releaseSlot(tx, questId);
        return;
      }
      const fromPending = await tx.questClaim.updateMany({
        where: { id: claim.id, status: 'pending' },
        data: { status: 'rejected' },
      });
      if (fromPending.count === 0) throw new Conflict(`Claim in status "${claim.status}" cannot be rejected`);
    });

    return repo.findById(claim.id);
  },

  /** Организация подтверждает выполнение: начисляем xp и монеты ровно один раз. */
  async complete(orgId: number, questId: number, claimId: number) {
    const quest = await questsService.getOwnedQuest(questId, orgId);
    if (!COMPLETABLE_QUEST.includes(quest.status)) {
      throw new Conflict(`Cannot complete claims while quest is "${quest.status}"`);
    }
    const claim = await getClaimOfQuest(questId, claimId);

    return prisma.$transaction(async (tx) => {
      // Условие по статусу — защита от двойного начисления при параллельных запросах.
      const moved = await tx.questClaim.updateMany({
        where: { id: claim.id, status: 'approved' },
        data: { status: 'completed' },
      });
      if (moved.count === 0) throw new Conflict(`Only approved claims can be completed (current: "${claim.status}")`);

      const user = await tx.user.update({
        where: { id: claim.userId },
        data: { xp: { increment: quest.rewardXp }, balance: { increment: quest.rewardCoins } },
        select: { id: true, xp: true, balance: true, curLevel: true },
      });

      const level = calcLevel(user.xp);
      if (level !== user.curLevel) {
        await tx.user.update({ where: { id: user.id }, data: { curLevel: level } });
      }

      return {
        claim: await tx.questClaim.findUniqueOrThrow({ where: { id: claim.id } }),
        reward: { xp: quest.rewardXp, coins: quest.rewardCoins },
        user: { id: user.id, xp: user.xp, balance: user.balance, curLevel: level },
      };
    });
  },
};
