// In-memory mock backend in the exact shapes and rules of the Express API (one handler per endpoint).
// Used by api.ts while NEXT_PUBLIC_API_URL is not set, and always for endpoints the backend
// does not have yet (profile, rewards, inventory). Data lives until a full page reload.
import { levelForXp } from '@/shared/levels';
import type {
  ClaimDto,
  ClaimWithUserDto,
  CompleteProfileRequest,
  CursorPage,
  OrganizationDto,
  OrganizationInput,
  PageResult,
  ProfileDto,
  QuestDto,
  QuestInput,
  QuestStatusChange,
  QuestStatusDto,
  RewardDto,
  UserRewardDto,
} from './dto';
import { ApiError } from './http';

const DELAY_MS = 300;
const CREATED = '2026-10-15T09:00:00.000Z';

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
const copy = <T,>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

// ---------- tables ----------

const me: ProfileDto = {
  id: 1,
  email: 'olena.koval@example.com',
  username: 'Олена Коваль',
  photo: null,
  contact: '+380 67 123 45 67',
  status: 'active',
  xp: 230,
  balance: 180,
  curLevel: levelForXp(230),
  organization: null,
};

const org = (userId: number, organizationName: string, description: string): OrganizationDto => ({
  userId,
  organizationName,
  types: 'ngo',
  edrpou: null,
  contact: [],
  description,
  logo: null,
  trustScore: 4.8,
  createdAt: CREATED,
  updatedAt: CREATED,
});

const organizations: OrganizationDto[] = [
  org(101, 'ГО «Дніпро Разом»', 'Міські волонтерські ініціативи'),
  org(102, 'БФ «Теплі лапи»', 'Допомога безпритульним тваринам'),
];

type QuestRow = Omit<QuestDto, 'organization' | 'claim'>;

const quest = (row: Omit<QuestRow, 'status' | 'createdAt' | 'updatedAt'> & { status?: QuestStatusDto }): QuestRow => ({
  status: 'open',
  createdAt: CREATED,
  updatedAt: CREATED,
  ...row,
});

const quests: QuestRow[] = [
  quest({
    id: 1, organizationId: 102, questName: 'Вигул собак із притулку', category: 'animals',
    description: 'Собаки з притулку чекають на прогулянку. Видамо повідці та коротко розповімо про характер кожного пса. Підійде навіть без досвіду — головне любов до тварин.',
    address: 'вул. Криворізька, Чечелівський район', lat: 48.4384, lng: 34.9818,
    maxVolunteers: 6, assignedVolunteers: 2, rewardXp: 40, rewardCoins: 20,
    startsAt: '2026-10-18T10:00:00+03:00', durationHours: 2,
  }),
  quest({
    id: 2, organizationId: 101, questName: 'Прибирання парку Глоби', category: 'ecology',
    description: 'Збираємо сміття вздовж алей і біля ставка, сортуємо пластик і скло. Рукавички та мішки надаємо, візьміть зручне взуття.',
    address: 'парк Лазаря Глоби, вул. Старокозацька', lat: 48.4697, lng: 35.0285,
    maxVolunteers: 15, assignedVolunteers: 9, rewardXp: 50, rewardCoins: 25,
    startsAt: '2026-10-18T11:00:00+03:00', durationHours: 3,
  }),
  quest({
    id: 3, organizationId: 101, questName: 'Розвантаження гуманітарної допомоги', category: 'logistics',
    description: 'Приходить фура з продуктовими наборами для переселенців. Потрібно розвантажити коробки та скласти їх на складі. Фізично важка робота.',
    address: 'Вокзальна площа, склад №2', lat: 48.477, lng: 35.016,
    maxVolunteers: 8, assignedVolunteers: 8, rewardXp: 80, rewardCoins: 40,
    startsAt: '2026-10-19T09:00:00+03:00', durationHours: 4,
  }),
  quest({
    id: 4, organizationId: 101, questName: 'Допомога літнім людям із покупками', category: 'elderly',
    description: 'Разом із координатором купуємо продукти й ліки за списками та доставляємо їх самотнім пенсіонерам Тополі.',
    address: 'вул. Панікахи, ж/м Тополя', lat: 48.402, lng: 35.033,
    maxVolunteers: 4, assignedVolunteers: 1, rewardXp: 40, rewardCoins: 20,
    startsAt: '2026-10-20T12:00:00+03:00', durationHours: 2,
  }),
  quest({
    id: 5, organizationId: 101, questName: 'Донорський день: здай кров', category: 'donation',
    description: 'Обласний центр служби крові потребує донорів усіх груп. Перед донацією — легкий сніданок без жирного, із собою паспорт.',
    address: 'вул. Короленка, центр міста', lat: 48.463, lng: 35.042,
    maxVolunteers: 20, assignedVolunteers: 12, rewardXp: 100, rewardCoins: 50,
    startsAt: '2026-10-21T08:30:00+03:00', durationHours: 1.5,
  }),
  quest({
    id: 6, organizationId: 101, questName: 'Висадка дерев у Новокодацькому парку', category: 'ecology',
    description: 'Висаджуємо 50 саджанців кленів і лип. Лопати й саджанці будуть на місці, від вас — робочий одяг і гарний настрій.',
    address: 'Новокодацький парк', lat: 48.4857, lng: 34.9455,
    maxVolunteers: 12, assignedVolunteers: 5, rewardXp: 60, rewardCoins: 30,
    startsAt: '2026-10-22T10:00:00+03:00', durationHours: 3,
  }),
  quest({
    id: 7, organizationId: 102, questName: 'Прибирання вольєрів і годування котів', category: 'animals',
    description: 'Допоможіть доглянути за котами в міні-притулку: прибрати вольєри, насипати корм, змінити воду. Можна прийти з дитиною від 12 років.',
    address: 'пров. Миколи Самійленка, Стара Султанівка', lat: 48.5049, lng: 35.0672,
    maxVolunteers: 5, assignedVolunteers: 3, rewardXp: 40, rewardCoins: 20,
    startsAt: '2026-10-22T15:00:00+03:00', durationHours: 2,
  }),
  quest({
    id: 8, organizationId: 101, questName: 'Фарбування лавок і зупинки', category: 'city',
    description: 'Оновлюємо лавки у дворі та зупинку громадського транспорту на Перемозі. Фарба, пензлі й рукавички — від організаторів.',
    address: 'вул. Мандриківська, ж/м Перемога-3', lat: 48.4268, lng: 35.0627,
    maxVolunteers: 10, assignedVolunteers: 4, rewardXp: 50, rewardCoins: 25,
    startsAt: '2026-10-23T10:00:00+03:00', durationHours: 3,
  }),
  quest({
    id: 9, organizationId: 101, questName: 'Відвідування самотніх літніх людей', category: 'elderly',
    description: 'Проводимо час із літніми людьми: розмова, чай, допомога з дрібними хатніми справами. Візити парами, адреси видасть координатор.',
    address: 'вул. Карагандинська, Придніпровськ', lat: 48.411, lng: 35.13,
    maxVolunteers: 6, assignedVolunteers: 2, rewardXp: 40, rewardCoins: 20,
    startsAt: '2026-10-24T11:00:00+03:00', durationHours: 2,
  }),
  quest({
    id: 10, organizationId: 102, questName: 'Сортування одягу для переселенців', category: 'logistics',
    description: 'Розбираємо пожертвуваний одяг за розмірами та сезоном і пакуємо набори для родин, що переїхали до Дніпра.',
    address: 'вул. Петра Яцика, Нова Султанівка', lat: 48.5246, lng: 35.0636,
    maxVolunteers: 10, assignedVolunteers: 6, rewardXp: 50, rewardCoins: 25,
    startsAt: '2026-10-24T14:00:00+03:00', durationHours: 3,
  }),
];

const claims: ClaimDto[] = [{ id: 1, questId: 2, userId: me.id, status: 'approved', createdAt: CREATED, updatedAt: CREATED }];

/** Other volunteers (for the organization's participants list). */
const volunteers: ClaimWithUserDto['user'][] = [
  { id: 201, username: 'Андрій Мельник', photo: null, curLevel: 2 },
  { id: 202, username: 'Ірина Шевченко', photo: null, curLevel: 4 },
];

const rewards: (RewardDto & { promocodeTemp: string })[] = [
  { id: 1, rewardsName: 'Безкоштовна кава', partnerName: 'Кав’ярня «Зерно»', cost: 60, promocodeTemp: 'ZERNO' },
  { id: 2, rewardsName: 'Знижка 20% на книги', partnerName: 'Книгарня «Сторінка»', cost: 120, promocodeTemp: 'STORINKA' },
  { id: 3, rewardsName: 'Разове відвідування спортзалу', partnerName: 'Спортклуб «Ритм»', cost: 150, promocodeTemp: 'RYTM' },
  { id: 4, rewardsName: 'Квиток у кіно', partnerName: 'Кінотеатр «Промінь»', cost: 220, promocodeTemp: 'PROMIN' },
  { id: 5, rewardsName: 'Піца 30 см', partnerName: 'Піцерія «На Набережній»', cost: 300, promocodeTemp: 'PIZZA' },
];

const userRewards: UserRewardDto[] = [
  { id: 1, userId: me.id, rewardId: 1, promocode: 'ZERNO-7K2Q', claimedTime: '2026-10-10T12:30:00+03:00' },
];

// ---------- helpers ----------

function questDto(row: QuestRow): QuestDto {
  const owner = organizations.find((o) => o.userId === row.organizationId);
  return {
    ...row,
    organization: owner && {
      userId: owner.userId,
      organizationName: owner.organizationName,
      logo: owner.logo,
      trustScore: owner.trustScore,
    },
    // ASSUMED field (see dto.ts): the real backend does not return it yet
    claim: claims.find((c) => c.questId === row.id && c.userId === me.id) ?? null,
  };
}

function findQuest(id: number): QuestRow {
  const row = quests.find((q) => q.id === id);
  if (!row) throw new ApiError(404, 'Quest not found', 'NOT_FOUND');
  return row;
}

function findClaim(questId: number, claimId: number): ClaimDto {
  const claim = claims.find((c) => c.id === claimId && c.questId === questId);
  if (!claim) throw new ApiError(404, 'Claim not found', 'NOT_FOUND');
  return claim;
}

function myOrganization(): OrganizationDto {
  const org = organizations.find((o) => o.userId === me.id);
  if (!org) throw new ApiError(403, 'Organization profile required', 'FORBIDDEN');
  return org;
}

/** A quest of the current user's organization (backend: requireOrg + ownership check). */
function findOwnQuest(id: number): QuestRow {
  const org = myOrganization();
  const row = findQuest(id);
  if (row.organizationId !== org.userId) throw new ApiError(403, 'Not your quest', 'FORBIDDEN');
  return row;
}

function claimWithUser(claim: ClaimDto): ClaimWithUserDto {
  const user = claim.userId === me.id ? { id: me.id, username: me.username, photo: me.photo, curLevel: me.curLevel } : volunteers.find((v) => v.id === claim.userId);
  return { ...claim, user: user ?? { id: claim.userId, username: null, photo: null, curLevel: 1 } };
}

/** Free a slot after an approved claim is rejected or withdrawn. */
function releaseSlot(row: QuestRow) {
  if (row.assignedVolunteers > 0) row.assignedVolunteers -= 1;
}

const QUEST_TRANSITIONS: Record<QuestStatusDto, QuestStatusDto[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  archived: [],
};

function rewardDto(row: (typeof rewards)[number]): RewardDto {
  return { id: row.id, rewardsName: row.rewardsName, partnerName: row.partnerName, cost: row.cost };
}

function userRewardDto(row: UserRewardDto): UserRewardDto {
  const reward = rewards.find((r) => r.id === row.rewardId);
  return { ...row, reward: reward && rewardDto(reward) };
}

/** Distance in km between two lat/lng points (haversine). */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map((r) => r.id)) + 1;

// ---------- endpoints ----------

export const mockApi = {
  /** ASSUMED POST /profiles */
  async completeProfile(req: CompleteProfileRequest): Promise<ProfileDto> {
    await delay();
    me.contact = req.contact;
    return copy(me);
  },

  /** ASSUMED GET /profiles/me */
  async getMe(): Promise<ProfileDto> {
    await delay();
    return copy(me);
  },

  /** ASSUMED GET /profiles/me/inventory */
  async getInventory(): Promise<UserRewardDto[]> {
    await delay();
    return copy(userRewards.filter((r) => r.userId === me.id).map(userRewardDto));
  },

  /** GET /organizations — one page is enough for the mock */
  async getOrganizations(): Promise<PageResult<OrganizationDto>> {
    await delay();
    return copy({ data: organizations, meta: { page: 1, limit: 100, total: organizations.length, totalPages: 1 } });
  },

  /** GET /quests?lat&lng&radius(km)&status — one page is enough for the mock */
  async getQuests(lat: number, lng: number, radiusKm: number, status: QuestStatusDto = 'open'): Promise<CursorPage<QuestDto>> {
    await delay();
    const data = quests
      .filter((q) => q.status === status && q.lat !== null && q.lng !== null && distanceKm(lat, lng, q.lat, q.lng) <= radiusKm)
      .sort((a, b) => b.id - a.id)
      .map(questDto);
    return copy({ data, meta: { limit: 100, hasMore: false, nextCursor: null } });
  },

  /** GET /quests/{id} */
  async getQuest(id: number): Promise<QuestDto> {
    await delay();
    return copy(questDto(findQuest(id)));
  },

  /** GET /organizations/me */
  async getMyOrganization(): Promise<OrganizationDto> {
    await delay();
    const org = organizations.find((o) => o.userId === me.id);
    if (!org) throw new ApiError(404, 'Organization not found', 'NOT_FOUND');
    return copy(org);
  },

  /** POST /organizations */
  async createOrganization(input: OrganizationInput): Promise<OrganizationDto> {
    await delay();
    if (organizations.some((o) => o.userId === me.id)) throw new ApiError(409, 'Organization profile already exists', 'CONFLICT');
    const created: OrganizationDto = {
      userId: me.id,
      organizationName: input.organizationName,
      types: input.types ?? null,
      edrpou: input.edrpou ?? null,
      contact: input.contact ?? [],
      description: input.description ?? null,
      logo: input.logo ?? null,
      trustScore: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    organizations.push(created);
    me.organization = { userId: me.id, organizationName: created.organizationName };
    return copy(created);
  },

  /** PATCH /organizations/me */
  async updateOrganization(input: Partial<OrganizationInput>): Promise<OrganizationDto> {
    await delay();
    const org = myOrganization();
    Object.assign(org, input, { updatedAt: now() });
    return copy(org);
  },

  /** GET /organizations/{id}/quests — all statuses, newest first (one page is enough for the mock) */
  async getOrganizationQuests(orgId: number): Promise<PageResult<QuestDto>> {
    await delay();
    if (!organizations.some((o) => o.userId === orgId)) throw new ApiError(404, 'Organization not found', 'NOT_FOUND');
    const data = quests.filter((q) => q.organizationId === orgId).sort((a, b) => b.id - a.id).map(questDto);
    return copy({ data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } });
  },

  /** POST /quests (organization only) */
  async createQuest(req: QuestInput): Promise<QuestDto> {
    await delay();
    const org = myOrganization();
    const row = quest({
      id: nextId(quests),
      organizationId: org.userId,
      questName: req.questName,
      description: req.description ?? null,
      category: req.category,
      address: req.address ?? null,
      lat: req.lat ?? null,
      lng: req.lng ?? null,
      maxVolunteers: req.maxVolunteers,
      assignedVolunteers: 0,
      rewardXp: req.rewardXp ?? 0,
      rewardCoins: req.rewardCoins ?? 0,
    });
    quests.push(row);
    // mock only: two volunteers apply right away, so the participants list can be tried without a backend
    for (const v of volunteers) {
      claims.push({ id: nextId(claims), questId: row.id, userId: v.id, status: 'pending', createdAt: now(), updatedAt: now() });
    }
    return copy(questDto(row));
  },

  /** PATCH /quests/{id} — only while open / in_progress */
  async updateQuest(id: number, input: Partial<QuestInput>): Promise<QuestDto> {
    await delay();
    const row = findOwnQuest(id);
    if (row.status !== 'open' && row.status !== 'in_progress') {
      throw new ApiError(409, `Quest in status "${row.status}" cannot be edited`, 'CONFLICT');
    }
    if (input.maxVolunteers !== undefined && input.maxVolunteers < row.assignedVolunteers) {
      throw new ApiError(409, 'maxVolunteers cannot be less than already approved volunteers', 'CONFLICT');
    }
    Object.assign(row, input, { updatedAt: now() });
    return copy(questDto(row));
  },

  /** DELETE /quests/{id} — deleted if nobody applied, otherwise archived */
  async deleteQuest(id: number): Promise<{ id: number; result: 'deleted' | 'archived' }> {
    await delay();
    const row = findOwnQuest(id);
    const questClaims = claims.filter((c) => c.questId === id);
    if (questClaims.length === 0) {
      quests.splice(quests.indexOf(row), 1);
      return { id, result: 'deleted' };
    }
    row.status = 'archived';
    for (const c of questClaims) if (c.status === 'pending' || c.status === 'approved') c.status = 'rejected';
    return { id, result: 'archived' };
  },

  /** PATCH /quests/{id}/status */
  async changeQuestStatus(id: number, status: QuestStatusChange): Promise<QuestDto> {
    await delay();
    const row = findOwnQuest(id);
    if (!QUEST_TRANSITIONS[row.status].includes(status)) {
      throw new ApiError(409, `Cannot change status from "${row.status}" to "${status}"`, 'CONFLICT');
    }
    row.status = status;
    row.updatedAt = now();
    for (const c of claims.filter((x) => x.questId === id)) {
      if (status === 'cancelled' && (c.status === 'pending' || c.status === 'approved')) c.status = 'rejected';
      if (status === 'completed' && c.status === 'pending') c.status = 'rejected';
    }
    return copy(questDto(row));
  },

  /** GET /quests/{id}/claims (organization) */
  async getQuestClaims(questId: number): Promise<PageResult<ClaimWithUserDto>> {
    await delay();
    findOwnQuest(questId);
    const data = claims.filter((c) => c.questId === questId).map(claimWithUser);
    return copy({ data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } });
  },

  /** POST /quests/{id}/claims — the volunteer applies (a slot is taken only on approval) */
  async claimQuest(questId: number): Promise<ClaimDto> {
    await delay();
    const row = findQuest(questId);
    if (row.status !== 'open') throw new ApiError(409, 'Quest is not open for applications', 'CONFLICT');
    const existing = claims.find((c) => c.questId === questId && c.userId === me.id);
    if (existing && existing.status !== 'withdrawn') throw new ApiError(409, 'You have already applied to this quest', 'CONFLICT');
    if (existing) {
      existing.status = 'pending';
      existing.updatedAt = now();
      return copy(existing);
    }
    const claim: ClaimDto = { id: nextId(claims), questId, userId: me.id, status: 'pending', createdAt: now(), updatedAt: now() };
    claims.push(claim);
    return copy(claim);
  },

  /** PATCH /quests/{id}/claims/{claimId} { status } (organization): approve takes a slot, reject frees it */
  async decideClaim(questId: number, claimId: number, status: 'approved' | 'rejected'): Promise<ClaimDto> {
    await delay();
    const row = findOwnQuest(questId);
    if (row.status !== 'open' && row.status !== 'in_progress') {
      throw new ApiError(409, `Claims cannot be changed while quest is "${row.status}"`, 'CONFLICT');
    }
    const claim = findClaim(questId, claimId);
    if (status === 'approved') {
      if (claim.status !== 'pending') throw new ApiError(409, `Only pending claims can be approved (current: "${claim.status}")`, 'CONFLICT');
      if (row.assignedVolunteers >= row.maxVolunteers) throw new ApiError(409, 'No free slots on this quest', 'CONFLICT');
      row.assignedVolunteers += 1;
    } else {
      if (claim.status !== 'pending' && claim.status !== 'approved') {
        throw new ApiError(409, `Claim in status "${claim.status}" cannot be rejected`, 'CONFLICT');
      }
      if (claim.status === 'approved') releaseSlot(row);
    }
    claim.status = status;
    claim.updatedAt = now();
    return copy(claim);
  },

  /** POST /quests/{id}/claims/{claimId}/complete (organization) — awards XP and coins */
  async completeClaim(questId: number, claimId: number): Promise<ClaimDto> {
    await delay();
    const row = findOwnQuest(questId);
    const claim = findClaim(questId, claimId);
    if (claim.status !== 'approved') throw new ApiError(409, `Only approved claims can be completed (current: "${claim.status}")`, 'CONFLICT');
    claim.status = 'completed';
    claim.updatedAt = now();
    if (claim.userId === me.id) {
      me.xp += row.rewardXp;
      me.balance += row.rewardCoins;
      me.curLevel = levelForXp(me.xp);
    }
    return copy(claim);
  },

  /** ASSUMED GET /rewards */
  async getRewards(): Promise<RewardDto[]> {
    await delay();
    return rewards.map(rewardDto);
  },

  /** ASSUMED POST /rewards/{id}/buy: deducts the balance, issues a promo code */
  async buyReward(id: number): Promise<UserRewardDto> {
    await delay();
    const reward = rewards.find((r) => r.id === id);
    if (!reward) throw new ApiError(404, 'Reward not found', 'NOT_FOUND');
    if (me.balance < reward.cost) throw new ApiError(402, 'Not enough coins', 'PAYMENT_REQUIRED');
    me.balance -= reward.cost;
    const code = `${reward.promocodeTemp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const row: UserRewardDto = { id: nextId(userRewards), userId: me.id, rewardId: id, promocode: code, claimedTime: now() };
    userRewards.push(row);
    return copy(userRewardDto(row));
  },
};
