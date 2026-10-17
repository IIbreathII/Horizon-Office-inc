import { prisma, type Tx } from '../../db/prisma.js';

/** Поля награды для клиента; шаблон промокода остаётся на сервере. */
export const rewardSelect = { id: true, rewardsName: true, partnerName: true, cost: true } as const;

export const rewardsRepository = {
  list() {
    return prisma.reward.findMany({ select: rewardSelect, orderBy: [{ cost: 'asc' }, { id: 'asc' }] });
  },

  findById(id: number) {
    return prisma.reward.findUnique({ where: { id } });
  },

  count() {
    return prisma.reward.count();
  },

  /** Награда по порядковому номеру — для случайного выбора в рулетке. */
  findByOffset(tx: Tx, offset: number) {
    return tx.reward.findFirstOrThrow({ orderBy: { id: 'asc' }, skip: offset });
  },

  createUserReward(tx: Tx, userId: number, rewardId: number, promocode: string) {
    return tx.userReward.create({
      data: { userId, rewardId, promocode },
      include: { reward: { select: rewardSelect } },
    });
  },

  /** Выполненные квесты пользователя — за них даются прокрутки рулетки. */
  completedQuests(userId: number) {
    return prisma.questClaim.count({ where: { userId, status: 'completed' } });
  },

  findUserWallet(userId: number) {
    return prisma.user.findUnique({ where: { id: userId }, select: { balance: true, slotSpinsUsed: true } });
  },
};
