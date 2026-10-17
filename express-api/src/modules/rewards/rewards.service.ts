import { randomInt } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { Conflict, NotFound, PaymentRequired } from '../../common/errors.js';
import { makePromocode } from './promocode.js';
import { rewardsRepository as repo } from './rewards.repository.js';

/** Одна бесплатная прокрутка рулетки за каждые столько выполненных квестов. */
export const QUESTS_PER_SPIN = 5;

async function getWallet(userId: number) {
  const wallet = await repo.findUserWallet(userId);
  if (!wallet) throw new NotFound('User not found');
  return wallet;
}

export const rewardsService = {
  list() {
    return repo.list();
  },

  /** Покупка: списываем монеты и выдаём промокод в одной транзакции. */
  async buy(userId: number, rewardId: number) {
    const reward = await repo.findById(rewardId);
    if (!reward) throw new NotFound('Reward not found');
    await getWallet(userId);

    return prisma.$transaction(async (tx) => {
      // условие по балансу в WHERE — две параллельные покупки не уведут баланс в минус
      const paid = await tx.user.updateMany({
        where: { id: userId, balance: { gte: reward.cost } },
        data: { balance: { decrement: reward.cost } },
      });
      if (paid.count === 0) throw new PaymentRequired('Not enough coins');
      return repo.createUserReward(tx, userId, reward.id, makePromocode(reward.promocodeTemp));
    });
  },

  /** Состояние рулетки; доступно прокруток: floor(completedQuests / questsPerSpin) - spinsUsed. */
  async slot(userId: number) {
    const [wallet, completedQuests] = await Promise.all([getWallet(userId), repo.completedQuests(userId)]);
    return { completedQuests, questsPerSpin: QUESTS_PER_SPIN, spinsUsed: wallet.slotSpinsUsed };
  },

  /** Прокрутка: бесплатная случайная награда, монеты не списываются. */
  async spin(userId: number) {
    await getWallet(userId);
    const [completedQuests, rewardsCount] = await Promise.all([repo.completedQuests(userId), repo.count()]);
    if (rewardsCount === 0) throw new Conflict('No rewards to win yet');
    const earned = Math.floor(completedQuests / QUESTS_PER_SPIN);

    return prisma.$transaction(async (tx) => {
      // условие в WHERE — параллельные прокрутки не потратят больше, чем заработано
      const spent = await tx.user.updateMany({
        where: { id: userId, slotSpinsUsed: { lt: earned } },
        data: { slotSpinsUsed: { increment: 1 } },
      });
      if (spent.count === 0) throw new Conflict('No spins available');

      const reward = await repo.findByOffset(tx, randomInt(rewardsCount));
      const userReward = await repo.createUserReward(tx, userId, reward.id, makePromocode(reward.promocodeTemp));
      return { reward: userReward.reward, userReward };
    });
  },
};
