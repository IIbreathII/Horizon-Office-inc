// Тестовые данные для локальной разработки: `npm run db:seed`.
// Ходит под ролью мигратора (DB_MIGRATOR_*): у роли volunteer_api нет права INSERT в users.
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEV_USER } from '../src/common/devUser.js';

dotenv.config({ quiet: true });
const { pgConfig } = await import('../src/config/database.js');

const prisma = new PrismaClient({ adapter: new PrismaPg(pgConfig('migrator')) });

async function main() {
  // dev-пользователь для байпаса guard
  await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: {},
    create: { ...DEV_USER },
  });

  const org = await prisma.user.upsert({
    where: { email: 'org@example.com' },
    update: {},
    create: { email: 'org@example.com', username: 'Фонд Добро' },
  });
  const anna = await prisma.user.upsert({
    where: { email: 'anna@example.com' },
    update: {},
    create: { email: 'anna@example.com', username: 'anna', xp: 250, balance: 40, curLevel: 2 },
  });
  await prisma.user.upsert({
    where: { email: 'ivan@example.com' },
    update: {},
    create: { email: 'ivan@example.com', username: 'ivan', xp: 50, balance: 10 },
  });

  await prisma.organization.upsert({
    where: { userId: org.id },
    update: {},
    create: {
      userId: org.id,
      organizationName: 'Фонд Добро',
      types: 'ecology',
      edrpou: '12345678',
      contact: ['+380000000000', 'org@example.com'],
      description: 'Экологические инициативы в Днепре',
    },
  });

  if ((await prisma.quest.count({ where: { organizationId: org.id } })) === 0) {
    const base = { organizationId: org.id, category: 'ecology', lat: 48.4647, lng: 35.0462 };
    await prisma.quest.createMany({
      data: [
        { ...base, questName: 'Уборка парка Глобы', maxVolunteers: 20, rewardXp: 100, rewardCoins: 50 },
        { ...base, questName: 'Посадка деревьев', maxVolunteers: 10, rewardXp: 150, rewardCoins: 70 },
        { ...base, questName: 'Чистка берега Днепра', maxVolunteers: 15, rewardXp: 120, rewardCoins: 60, status: 'in_progress' },
        { ...base, questName: 'Сортировка вторсырья', maxVolunteers: 5, rewardXp: 80, rewardCoins: 30, status: 'completed' },
        { ...base, category: 'animals', questName: 'Выгул собак из приюта', maxVolunteers: 8, rewardXp: 60, rewardCoins: 20 },
      ],
    });
    const first = await prisma.quest.findFirstOrThrow({ where: { organizationId: org.id }, orderBy: { id: 'asc' } });
    await prisma.questClaim.create({ data: { questId: first.id, userId: anna.id } });
  }

  if ((await prisma.reward.count()) === 0) {
    await prisma.reward.createMany({
      data: [
        { rewardsName: 'Кофе', partnerName: 'Coffee Point', cost: 30, promocodeTemp: 'COFFEE-{code}' },
        { rewardsName: 'Скидка 20% на книги', partnerName: 'Book Store', cost: 80 },
      ],
    });
  }

  console.log('Seed done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
