// Начальные данные: `npm run db:seed` (сам сервис при запуске ничего не создаёт).
// Только dev-пользователь для байпаса guard и витрина наград. Организации, квесты и волонтёры появляются
// через приложение: регистрация, профиль организации, создание квеста.
// Ходит под ролью мигратора (DB_MIGRATOR_*): у роли volunteer_api нет права INSERT в users.
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEV_USER } from '../src/common/devUser.js';

dotenv.config({ quiet: true });
const { pgConfig } = await import('../src/config/database.js');

const prisma = new PrismaClient({ adapter: new PrismaPg(pgConfig('migrator')) });

// Витрина магазина. Партнёры условные. promocodeTemp: `{code}` заменяется случайной частью
// при покупке (src/modules/rewards/promocode.ts). Редкость на фронте считается по цене: 100+, 200+, 300+.
const REWARDS = [
  // повседневное
  { rewardsName: 'Кава у подарунок', partnerName: 'Coffee Point', cost: 30, promocodeTemp: 'COFFEE-{code}' },
  { rewardsName: 'Безкоштовна доставка техніки', partnerName: 'ТехноДім', cost: 60, promocodeTemp: 'TD-SHIP-{code}' },
  { rewardsName: 'Знижка 20% на книги', partnerName: 'Книгарня «Сторінка»', cost: 80, promocodeTemp: 'BOOK20-{code}' },
  // рідкісні
  { rewardsName: 'Квиток у кіно', partnerName: 'Кіно «Промінь»', cost: 120, promocodeTemp: 'CINEMA-{code}' },
  { rewardsName: 'Сертифікат 200 грн у книгарню', partnerName: 'Книгарня «Сторінка»', cost: 150, promocodeTemp: 'BOOK200-{code}' },
  { rewardsName: 'Знижка 20% на аксесуари для ПК', partnerName: 'КіберЗона', cost: 180, promocodeTemp: 'CZ20-{code}' },
  // епічні
  { rewardsName: 'Тиждень у спортзалі', partnerName: 'FitLife', cost: 200, promocodeTemp: 'FIT7-{code}' },
  { rewardsName: 'Знижка 15% на навушники', partnerName: 'ТехноДім', cost: 250, promocodeTemp: 'TD-AUDIO15-{code}' },
  { rewardsName: 'Знижка 25% на велосипед', partnerName: 'ВелоСвіт', cost: 280, promocodeTemp: 'BIKE25-{code}' },
  // легендарні
  { rewardsName: 'Знижка 10% на смартфон', partnerName: 'Гаджет Хаус', cost: 350, promocodeTemp: 'GH-PHONE10-{code}' },
  { rewardsName: 'Знижка 1000 грн на ноутбук', partnerName: 'ТехноДім', cost: 500, promocodeTemp: 'TD-LAPTOP-{code}' },
  { rewardsName: 'Знижка 15% на ігрову консоль', partnerName: 'КіберЗона', cost: 600, promocodeTemp: 'CZ-CONSOLE15-{code}' },
];

async function main() {
  // dev-пользователь для байпаса guard
  await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: {},
    create: { ...DEV_USER },
  });

  // по одной: повторный запуск не создаёт дублей, новые позиции из списка добавляются
  let added = 0;
  for (const reward of REWARDS) {
    const exists = await prisma.reward.findFirst({
      where: { rewardsName: reward.rewardsName, partnerName: reward.partnerName },
      select: { id: true },
    });
    if (!exists) {
      await prisma.reward.create({ data: reward });
      added += 1;
    }
  }

  console.log(`Seed done: dev user, rewards +${added} (total ${await prisma.reward.count()})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
