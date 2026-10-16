import type { Quest } from '@/shared/types';

// All backend calls live here (§9). Until the backend is ready, functions work on
// in-memory mocks; switching to the real API means replacing function bodies only.

const MOCK_DELAY_MS = 300;

const DNIPRO_RAZOM = { id: 'org_1', name: 'ГО «Дніпро Разом»' };
const WARM_PAWS = { id: 'org_2', name: 'БФ «Теплі лапи»' };

const MOCK_QUESTS: Quest[] = [
  {
    id: 'q_1',
    title: 'Вигул собак із притулку',
    description:
      'Собаки з притулку чекають на прогулянку. Видамо повідці та коротко розповімо про характер кожного пса. Підійде навіть без досвіду — головне любов до тварин.',
    category: 'animals',
    lat: 48.4384,
    lng: 34.9818,
    address: 'вул. Криворізька, Чечелівський район',
    startsAt: '2026-10-18T10:00:00+03:00',
    durationHours: 2,
    slotsTotal: 6,
    slotsTaken: 2,
    xpReward: 40,
    status: 'open',
    organization: WARM_PAWS,
    myParticipation: null,
  },
  {
    id: 'q_2',
    title: 'Прибирання парку Глоби',
    description:
      'Збираємо сміття вздовж алей і біля ставка, сортуємо пластик і скло. Рукавички та мішки надаємо, візьміть зручне взуття.',
    category: 'ecology',
    lat: 48.4697,
    lng: 35.0285,
    address: 'парк Лазаря Глоби, вул. Старокозацька',
    startsAt: '2026-10-18T11:00:00+03:00',
    durationHours: 3,
    slotsTotal: 15,
    slotsTaken: 9,
    xpReward: 50,
    status: 'open',
    organization: DNIPRO_RAZOM,
    myParticipation: { status: 'joined' },
  },
  {
    id: 'q_3',
    title: 'Розвантаження гуманітарної допомоги',
    description:
      'Приходить фура з продуктовими наборами для переселенців. Потрібно розвантажити коробки та скласти їх на складі. Фізично важка робота.',
    category: 'logistics',
    lat: 48.477,
    lng: 35.016,
    address: 'Вокзальна площа, склад №2',
    startsAt: '2026-10-19T09:00:00+03:00',
    durationHours: 4,
    slotsTotal: 8,
    slotsTaken: 8,
    xpReward: 80,
    status: 'full',
    organization: DNIPRO_RAZOM,
    myParticipation: null,
  },
  {
    id: 'q_4',
    title: 'Допомога літнім людям із покупками',
    description:
      'Разом із координатором купуємо продукти й ліки за списками та доставляємо їх самотнім пенсіонерам Тополі.',
    category: 'elderly',
    lat: 48.402,
    lng: 35.033,
    address: 'вул. Панікахи, ж/м Тополя',
    startsAt: '2026-10-20T12:00:00+03:00',
    durationHours: 2,
    slotsTotal: 4,
    slotsTaken: 1,
    xpReward: 40,
    status: 'open',
    organization: DNIPRO_RAZOM,
    myParticipation: null,
  },
  {
    id: 'q_5',
    title: 'Донорський день: здай кров',
    description:
      'Обласний центр служби крові потребує донорів усіх груп. Перед донацією — легкий сніданок без жирного, із собою паспорт.',
    category: 'donation',
    lat: 48.463,
    lng: 35.042,
    address: 'вул. Короленка, центр міста',
    startsAt: '2026-10-21T08:30:00+03:00',
    durationHours: 1.5,
    slotsTotal: 20,
    slotsTaken: 12,
    xpReward: 100,
    status: 'open',
    organization: DNIPRO_RAZOM,
    myParticipation: null,
  },
  {
    id: 'q_6',
    title: 'Висадка дерев у Новокодацькому парку',
    description:
      'Висаджуємо 50 саджанців кленів і лип. Лопати й саджанці будуть на місці, від вас — робочий одяг і гарний настрій.',
    category: 'ecology',
    lat: 48.4857,
    lng: 34.9455,
    address: 'Новокодацький парк',
    startsAt: '2026-10-22T10:00:00+03:00',
    durationHours: 3,
    slotsTotal: 12,
    slotsTaken: 5,
    xpReward: 60,
    status: 'open',
    organization: DNIPRO_RAZOM,
    myParticipation: null,
  },
  {
    id: 'q_7',
    title: 'Прибирання вольєрів і годування котів',
    description:
      'Допоможіть доглянути за котами в міні-притулку: прибрати вольєри, насипати корм, змінити воду. Можна прийти з дитиною від 12 років.',
    category: 'animals',
    lat: 48.5049,
    lng: 35.0672,
    address: 'пров. Миколи Самійленка, Стара Султанівка',
    startsAt: '2026-10-22T15:00:00+03:00',
    durationHours: 2,
    slotsTotal: 5,
    slotsTaken: 3,
    xpReward: 40,
    status: 'open',
    organization: WARM_PAWS,
    myParticipation: null,
  },
  {
    id: 'q_8',
    title: 'Фарбування лавок і зупинки',
    description:
      'Оновлюємо лавки у дворі та зупинку громадського транспорту на Перемозі. Фарба, пензлі й рукавички — від організаторів.',
    category: 'city',
    lat: 48.4268,
    lng: 35.0627,
    address: 'вул. Мандриківська, ж/м Перемога-3',
    startsAt: '2026-10-23T10:00:00+03:00',
    durationHours: 3,
    slotsTotal: 10,
    slotsTaken: 4,
    xpReward: 50,
    status: 'open',
    organization: DNIPRO_RAZOM,
    myParticipation: null,
  },
  {
    id: 'q_9',
    title: 'Відвідування самотніх літніх людей',
    description:
      'Проводимо час із літніми людьми: розмова, чай, допомога з дрібними хатніми справами. Візити парами, адреси видасть координатор.',
    category: 'elderly',
    lat: 48.411,
    lng: 35.13,
    address: 'вул. Карагандинська, Придніпровськ',
    startsAt: '2026-10-24T11:00:00+03:00',
    durationHours: 2,
    slotsTotal: 6,
    slotsTaken: 2,
    xpReward: 40,
    status: 'open',
    organization: DNIPRO_RAZOM,
    myParticipation: null,
  },
  {
    id: 'q_10',
    title: 'Сортування одягу для переселенців',
    description:
      'Розбираємо пожертвуваний одяг за розмірами та сезоном і пакуємо набори для родин, що переїхали до Дніпра.',
    category: 'logistics',
    lat: 48.5246,
    lng: 35.0636,
    address: 'вул. Петра Яцика, Нова Султанівка',
    startsAt: '2026-10-24T14:00:00+03:00',
    durationHours: 3,
    slotsTotal: 10,
    slotsTaken: 6,
    xpReward: 50,
    status: 'open',
    organization: WARM_PAWS,
    myParticipation: null,
  },
];

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function findMockQuest(id: string): Quest {
  const quest = MOCK_QUESTS.find((q) => q.id === id);
  if (!quest) throw new Error(`Quest ${id} not found`);
  return quest;
}

// TODO: GET /quests — replace the mock with a real request.
export async function getQuests(): Promise<Quest[]> {
  await delay();
  // Copy so callers never hold references to the mutable mocks.
  return structuredClone(MOCK_QUESTS);
}

// TODO: POST /quests/:id/join — replace the mock with a real request.
export async function joinQuest(id: string): Promise<void> {
  await delay();
  const quest = findMockQuest(id);
  if (quest.myParticipation) throw new Error(`Already joined quest ${id}`);
  if (quest.slotsTaken >= quest.slotsTotal) throw new Error(`Quest ${id} is full`);
  quest.slotsTaken += 1;
  quest.myParticipation = { status: 'joined' };
  if (quest.slotsTaken >= quest.slotsTotal) quest.status = 'full';
}

// TODO: DELETE /quests/:id/join — replace the mock with a real request.
export async function leaveQuest(id: string): Promise<void> {
  await delay();
  const quest = findMockQuest(id);
  if (!quest.myParticipation) throw new Error(`Not joined quest ${id}`);
  quest.slotsTaken -= 1;
  quest.myParticipation = null;
  if (quest.status === 'full') quest.status = 'open';
}
