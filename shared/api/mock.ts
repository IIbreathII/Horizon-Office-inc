// In-memory mock backend in the exact DTO shapes of the REST API (one handler per endpoint).
// Used by api.ts while NEXT_PUBLIC_API_URL is not set. Data lives until a full page reload.
import { levelForXp } from '@/shared/levels';
import type {
  CompleteProfileRequest,
  CreateQuestRequest,
  OrganizationDto,
  ProfileDto,
  QuestClaimDto,
  QuestDto,
  RewardDto,
  UserRewardDto,
} from './dto';
import { ApiError } from './http';

const DELAY_MS = 300;

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
const copy = <T,>(value: T): T => structuredClone(value);

// ---------- tables ----------

const me: ProfileDto = {
  id: 1,
  email: 'olena.koval@example.com',
  username: 'Олена Коваль',
  photo: null,
  contact: '+380 67 123 45 67',
  status: 'active',
  role: 'volunteer',
  xp: 230,
  balance: 180,
  cur_level: levelForXp(230),
};

const organizations: OrganizationDto[] = [
  {
    user_id: 101,
    organization_name: 'ГО «Дніпро Разом»',
    types: 'ngo',
    edrpou: '12345678',
    contact: ['razom@example.com'],
    description: 'Міські волонтерські ініціативи',
    logo: null,
    trust_score: 4.8,
  },
  {
    user_id: 102,
    organization_name: 'БФ «Теплі лапи»',
    types: 'charity',
    edrpou: '87654321',
    contact: ['lapy@example.com'],
    description: 'Допомога безпритульним тваринам',
    logo: null,
    trust_score: 4.9,
  },
];

type QuestRow = Omit<QuestDto, 'organization' | 'claim'>;

const quests: QuestRow[] = [
  {
    id: 1, organization_id: 102, quest_name: 'Вигул собак із притулку', category: 'animals',
    description: 'Собаки з притулку чекають на прогулянку. Видамо повідці та коротко розповімо про характер кожного пса. Підійде навіть без досвіду — головне любов до тварин.',
    address: 'вул. Криворізька, Чечелівський район', lat: 48.4384, lng: 34.9818,
    max_volunteers: 6, assigned_volunteers: 2, reward_xp: 40, reward_coins: 20, status: 'open',
    starts_at: '2026-10-18T10:00:00+03:00', duration_hours: 2,
  },
  {
    id: 2, organization_id: 101, quest_name: 'Прибирання парку Глоби', category: 'ecology',
    description: 'Збираємо сміття вздовж алей і біля ставка, сортуємо пластик і скло. Рукавички та мішки надаємо, візьміть зручне взуття.',
    address: 'парк Лазаря Глоби, вул. Старокозацька', lat: 48.4697, lng: 35.0285,
    max_volunteers: 15, assigned_volunteers: 9, reward_xp: 50, reward_coins: 25, status: 'open',
    starts_at: '2026-10-18T11:00:00+03:00', duration_hours: 3,
  },
  {
    id: 3, organization_id: 101, quest_name: 'Розвантаження гуманітарної допомоги', category: 'logistics',
    description: 'Приходить фура з продуктовими наборами для переселенців. Потрібно розвантажити коробки та скласти їх на складі. Фізично важка робота.',
    address: 'Вокзальна площа, склад №2', lat: 48.477, lng: 35.016,
    max_volunteers: 8, assigned_volunteers: 8, reward_xp: 80, reward_coins: 40, status: 'full',
    starts_at: '2026-10-19T09:00:00+03:00', duration_hours: 4,
  },
  {
    id: 4, organization_id: 101, quest_name: 'Допомога літнім людям із покупками', category: 'elderly',
    description: 'Разом із координатором купуємо продукти й ліки за списками та доставляємо їх самотнім пенсіонерам Тополі.',
    address: 'вул. Панікахи, ж/м Тополя', lat: 48.402, lng: 35.033,
    max_volunteers: 4, assigned_volunteers: 1, reward_xp: 40, reward_coins: 20, status: 'open',
    starts_at: '2026-10-20T12:00:00+03:00', duration_hours: 2,
  },
  {
    id: 5, organization_id: 101, quest_name: 'Донорський день: здай кров', category: 'donation',
    description: 'Обласний центр служби крові потребує донорів усіх груп. Перед донацією — легкий сніданок без жирного, із собою паспорт.',
    address: 'вул. Короленка, центр міста', lat: 48.463, lng: 35.042,
    max_volunteers: 20, assigned_volunteers: 12, reward_xp: 100, reward_coins: 50, status: 'open',
    starts_at: '2026-10-21T08:30:00+03:00', duration_hours: 1.5,
  },
  {
    id: 6, organization_id: 101, quest_name: 'Висадка дерев у Новокодацькому парку', category: 'ecology',
    description: 'Висаджуємо 50 саджанців кленів і лип. Лопати й саджанці будуть на місці, від вас — робочий одяг і гарний настрій.',
    address: 'Новокодацький парк', lat: 48.4857, lng: 34.9455,
    max_volunteers: 12, assigned_volunteers: 5, reward_xp: 60, reward_coins: 30, status: 'open',
    starts_at: '2026-10-22T10:00:00+03:00', duration_hours: 3,
  },
  {
    id: 7, organization_id: 102, quest_name: 'Прибирання вольєрів і годування котів', category: 'animals',
    description: 'Допоможіть доглянути за котами в міні-притулку: прибрати вольєри, насипати корм, змінити воду. Можна прийти з дитиною від 12 років.',
    address: 'пров. Миколи Самійленка, Стара Султанівка', lat: 48.5049, lng: 35.0672,
    max_volunteers: 5, assigned_volunteers: 3, reward_xp: 40, reward_coins: 20, status: 'open',
    starts_at: '2026-10-22T15:00:00+03:00', duration_hours: 2,
  },
  {
    id: 8, organization_id: 101, quest_name: 'Фарбування лавок і зупинки', category: 'city',
    description: 'Оновлюємо лавки у дворі та зупинку громадського транспорту на Перемозі. Фарба, пензлі й рукавички — від організаторів.',
    address: 'вул. Мандриківська, ж/м Перемога-3', lat: 48.4268, lng: 35.0627,
    max_volunteers: 10, assigned_volunteers: 4, reward_xp: 50, reward_coins: 25, status: 'open',
    starts_at: '2026-10-23T10:00:00+03:00', duration_hours: 3,
  },
  {
    id: 9, organization_id: 101, quest_name: 'Відвідування самотніх літніх людей', category: 'elderly',
    description: 'Проводимо час із літніми людьми: розмова, чай, допомога з дрібними хатніми справами. Візити парами, адреси видасть координатор.',
    address: 'вул. Карагандинська, Придніпровськ', lat: 48.411, lng: 35.13,
    max_volunteers: 6, assigned_volunteers: 2, reward_xp: 40, reward_coins: 20, status: 'open',
    starts_at: '2026-10-24T11:00:00+03:00', duration_hours: 2,
  },
  {
    id: 10, organization_id: 102, quest_name: 'Сортування одягу для переселенців', category: 'logistics',
    description: 'Розбираємо пожертвуваний одяг за розмірами та сезоном і пакуємо набори для родин, що переїхали до Дніпра.',
    address: 'вул. Петра Яцика, Нова Султанівка', lat: 48.5246, lng: 35.0636,
    max_volunteers: 10, assigned_volunteers: 6, reward_xp: 50, reward_coins: 25, status: 'open',
    starts_at: '2026-10-24T14:00:00+03:00', duration_hours: 3,
  },
  // finished quests (history of the current volunteer)
  {
    id: 11, organization_id: 101, quest_name: 'Толока на набережній', category: 'ecology',
    description: 'Прибирали прибережну зону Дніпра від пластику.',
    address: 'Січеславська набережна', lat: 48.4655, lng: 35.0606,
    max_volunteers: 20, assigned_volunteers: 18, reward_xp: 60, reward_coins: 30, status: 'finished',
    starts_at: '2026-10-04T10:00:00+03:00', duration_hours: 3,
  },
  {
    id: 12, organization_id: 102, quest_name: 'Збір корму для притулку', category: 'animals',
    description: 'Збирали й сортували корм у супермаркетах для міського притулку.',
    address: 'вул. Робоча, Чечелівський район', lat: 48.4425, lng: 35.0012,
    max_volunteers: 8, assigned_volunteers: 8, reward_xp: 50, reward_coins: 25, status: 'finished',
    starts_at: '2026-10-08T12:00:00+03:00', duration_hours: 2,
  },
  {
    id: 13, organization_id: 101, quest_name: 'Пакування продуктових наборів', category: 'logistics',
    description: 'Пакували набори для родин переселенців на складі.',
    address: 'вул. Батумська, Самарський район', lat: 48.4372, lng: 35.1162,
    max_volunteers: 12, assigned_volunteers: 11, reward_xp: 120, reward_coins: 60, status: 'finished',
    starts_at: '2026-10-11T09:00:00+03:00', duration_hours: 4,
  },
];

const claims: QuestClaimDto[] = [
  { id: 1, quest_id: 2, volunteer_id: me.id, status: 'claimed' },
  { id: 2, quest_id: 11, volunteer_id: me.id, status: 'approved' },
  { id: 3, quest_id: 12, volunteer_id: me.id, status: 'approved' },
  { id: 4, quest_id: 13, volunteer_id: me.id, status: 'approved' },
];

const rewards: (RewardDto & { promocode_temp: string })[] = [
  { id: 1, rewards_name: 'Безкоштовна кава', partner_name: 'Кав’ярня «Зерно»', cost: 60, promocode_temp: 'ZERNO' },
  { id: 2, rewards_name: 'Знижка 20% на книги', partner_name: 'Книгарня «Сторінка»', cost: 120, promocode_temp: 'STORINKA' },
  { id: 3, rewards_name: 'Разове відвідування спортзалу', partner_name: 'Спортклуб «Ритм»', cost: 150, promocode_temp: 'RYTM' },
  { id: 4, rewards_name: 'Квиток у кіно', partner_name: 'Кінотеатр «Промінь»', cost: 220, promocode_temp: 'PROMIN' },
  { id: 5, rewards_name: 'Піца 30 см', partner_name: 'Піцерія «На Набережній»', cost: 300, promocode_temp: 'PIZZA' },
];

const userRewards: UserRewardDto[] = [
  { id: 1, volunteer_id: me.id, reward_id: 1, promocode: 'ZERNO-7K2Q', claimed_time: '2026-10-10T12:30:00+03:00' },
];

// ---------- helpers ----------

function questDto(row: QuestRow): QuestDto {
  const org = organizations.find((o) => o.user_id === row.organization_id);
  return {
    ...row,
    organization: org && { user_id: org.user_id, organization_name: org.organization_name, logo: org.logo },
    claim: claims.find((c) => c.quest_id === row.id && c.volunteer_id === me.id) ?? null,
  };
}

function findQuest(id: number): QuestRow {
  const quest = quests.find((q) => q.id === id);
  if (!quest) throw new ApiError(404, `Quest ${id} not found`);
  return quest;
}

function userRewardDto(row: UserRewardDto): UserRewardDto {
  const reward = rewards.find((r) => r.id === row.reward_id);
  return { ...row, reward: reward && { id: reward.id, rewards_name: reward.rewards_name, partner_name: reward.partner_name, cost: reward.cost } };
}

/** Distance in meters between two lat/lng points (haversine). */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map((r) => r.id)) + 1;

// ---------- endpoints ----------

export const mockApi = {
  /** POST /profiles */
  async completeProfile(req: CompleteProfileRequest): Promise<ProfileDto> {
    await delay();
    me.role = req.role;
    me.contact = req.contact;
    return copy(me);
  },

  /** GET /profiles/me */
  async getMe(): Promise<ProfileDto> {
    await delay();
    return copy(me);
  },

  /** GET /profiles/me/inventory */
  async getInventory(): Promise<UserRewardDto[]> {
    await delay();
    return copy(userRewards.filter((r) => r.volunteer_id === me.id).map(userRewardDto));
  },

  /** GET /quests?lat&lng&radius (radius in meters) */
  async getQuests(lat: number, lng: number, radius: number): Promise<QuestDto[]> {
    await delay();
    return copy(quests.filter((q) => distanceM(lat, lng, q.lat, q.lng) <= radius).map(questDto));
  },

  /** GET /quests/{id} */
  async getQuest(id: number): Promise<QuestDto> {
    await delay();
    return copy(questDto(findQuest(id)));
  },

  /** POST /quests (organization only) */
  async createQuest(req: CreateQuestRequest): Promise<QuestDto> {
    await delay();
    if (me.role !== 'organization') throw new ApiError(403, 'Only organizations can create quests');
    const row: QuestRow = { ...req, id: nextId(quests), organization_id: me.id, assigned_volunteers: 0, status: 'open' };
    quests.push(row);
    return copy(questDto(row));
  },

  /** POST /quests/{id}/claim */
  async claimQuest(id: number): Promise<QuestClaimDto> {
    await delay();
    const quest = findQuest(id);
    if (claims.some((c) => c.quest_id === id && c.volunteer_id === me.id)) throw new ApiError(409, 'Already claimed');
    if (quest.status !== 'open' || quest.assigned_volunteers >= quest.max_volunteers) throw new ApiError(409, 'Quest is full');
    quest.assigned_volunteers += 1;
    if (quest.assigned_volunteers >= quest.max_volunteers) quest.status = 'full';
    const claim: QuestClaimDto = { id: nextId(claims), quest_id: id, volunteer_id: me.id, status: 'claimed' };
    claims.push(claim);
    return copy(claim);
  },

  /** PATCH /claims/{id}/approve (organization): awards XP and coins */
  async approveClaim(id: number): Promise<QuestClaimDto> {
    await delay();
    const claim = claims.find((c) => c.id === id);
    if (!claim) throw new ApiError(404, `Claim ${id} not found`);
    if (claim.status !== 'approved') {
      claim.status = 'approved';
      const quest = findQuest(claim.quest_id);
      if (claim.volunteer_id === me.id) {
        me.xp += quest.reward_xp;
        me.balance += quest.reward_coins;
        me.cur_level = levelForXp(me.xp);
      }
    }
    return copy(claim);
  },

  /** GET /rewards */
  async getRewards(): Promise<RewardDto[]> {
    await delay();
    return rewards.map((r) => ({ id: r.id, rewards_name: r.rewards_name, partner_name: r.partner_name, cost: r.cost }));
  },

  /** POST /rewards/{id}/buy: deducts the balance, issues a promo code */
  async buyReward(id: number): Promise<UserRewardDto> {
    await delay();
    const reward = rewards.find((r) => r.id === id);
    if (!reward) throw new ApiError(404, `Reward ${id} not found`);
    if (me.balance < reward.cost) throw new ApiError(402, 'Not enough coins');
    me.balance -= reward.cost;
    const code = `${reward.promocode_temp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const row: UserRewardDto = { id: nextId(userRewards), volunteer_id: me.id, reward_id: id, promocode: code, claimed_time: new Date().toISOString() };
    userRewards.push(row);
    return copy(userRewardDto(row));
  },
};
