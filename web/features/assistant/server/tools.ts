// Tools the model can call (function calling). The server runs them on real quest data,
// so the model never invents quests. No user location: we don't track users.
import type { FunctionDeclaration } from '@google/genai';
import { CATEGORIES } from '@/shared/categories';
import type { Category, Quest } from '@/shared/types';
import { MASCOT_MOODS, isMascotMood, type MascotMood } from '../persona';
import type { AssistantQuestCard, NavSuggestion } from '../types';

const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
const MAX_RESULTS = 8;
const MAX_CARDS = 3;

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'find_quests',
    description:
      'Шукає відкриті волонтерські квести в Дніпрі. Викликай завжди, коли користувач питає про квести, ' +
      'завдання, що робити, на вихідних тощо. Шукає по всьому Дніпру, повертає квести, відсортовані за датою.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORY_KEYS, description: 'Категорія квесту.' },
        date_from: { type: 'string', description: 'Не раніше цієї дати, формат YYYY-MM-DD (київський час).' },
        date_to: { type: 'string', description: 'Не пізніше цієї дати включно, формат YYYY-MM-DD.' },
        only_free_slots: { type: 'boolean', description: 'Лише квести з вільними місцями. За замовчуванням true.' },
        exclude_joined: { type: 'boolean', description: 'Лише квести, на які користувач ще НЕ записаний (де myParticipation порожній).' },
      },
    },
  },
  {
    name: 'get_quest_details',
    description: 'Повний опис одного квесту за його id (опис, організація, адреса, час, місця, нагорода).',
    parametersJsonSchema: {
      type: 'object',
      properties: { quest_id: { type: 'string' } },
      required: ['quest_id'],
    },
  },
  {
    name: 'show_quest_cards',
    description:
      'Показує користувачу картки квестів під відповіддю (з кнопкою «На мапі») і задає настрій маскота. ' +
      `Викликай, коли радиш конкретні квести (до ${MAX_CARDS}). Використовуй лише id з find_quests.`,
    parametersJsonSchema: {
      type: 'object',
      properties: {
        quest_ids: { type: 'array', items: { type: 'string' }, description: `До ${MAX_CARDS} id квестів.` },
        mood: { type: 'string', enum: [...MASCOT_MOODS], description: 'Настрій маскота для цієї відповіді.' },
      },
      required: ['quest_ids'],
    },
  },
  {
    name: 'suggest_navigation',
    description:
      'Показує користувачу облачко-підказку від маскота з кнопкою переходу до іншої вкладки. ' +
      'Викликай, коли відповідь на запит краще розкрита в іншому розділі платформи. ' +
      'Наприклад, якщо питання про нагороди — запропонуй перейти до «Нагороди»; про профіль — до «Профіль»; про квести — до «Квести».',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Текст на кнопці, наприклад «Перейти до Нагород» або «Відкрити Профіль».' },
        href: { type: 'string', enum: ['/map', '/quests', '/rewards', '/profile'], description: 'Маршрут сторінки.' },
      },
      required: ['label', 'href'],
    },
  },
  {
    name: 'set_highlights',
    description:
      'Позначає ключові слова або фрази у відповіді, які варто виділити жирним/кольором в UI. ' +
      'Передай масив важливих термінів: назви розділів, XP, монети, числа, ключові поняття. До 6 фраз.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        terms: { type: 'array', items: { type: 'string' }, description: 'Ключові слова/фрази з тексту відповіді (до 6).' },
      },
      required: ['terms'],
    },
  },
];

/** Per-request context the tools work with; `cards`, `mood`, `navSuggestion` and `highlights` collect what the UI shows. */
export type ToolContext = {
  quests: Quest[];
  /** Quests the user has joined (sent by the browser). */
  joinedIds: Set<string>;
  cards: AssistantQuestCard[];
  mood: MascotMood | null;
  navSuggestion: NavSuggestion | null;
  highlights: string[];
};

const kyivDate = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Kyiv' }).format(new Date(iso)); // YYYY-MM-DD

const kyivDateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' }).format(new Date(iso))
    : 'дата не вказана';

/** What the model sees about a quest: short, no raw coordinates. */
function summary(quest: Quest, ctx: ToolContext) {
  return {
    id: quest.id,
    title: quest.title,
    category: CATEGORIES[quest.category].label,
    address: quest.address,
    when: kyivDateTime(quest.startsAt),
    durationHours: quest.durationHours,
    freeSlots: Math.max(0, quest.slotsTotal - quest.slotsTaken),
    reward: { xp: quest.xpReward, coins: quest.coinsReward },
    organization: quest.organization.name,
    alreadyJoined: isJoined(quest, ctx),
  };
}

/** The server has no user session: the browser tells which quests the user joined (`joinedIds`). */
function isJoined(quest: Quest, ctx: ToolContext): boolean {
  return ctx.joinedIds.has(quest.id) || (quest.myParticipation !== null && quest.myParticipation.status !== 'rejected');
}

const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

function findQuests(args: Record<string, unknown>, ctx: ToolContext) {
  const category = CATEGORY_KEYS.find((c) => c === args.category);
  const from = str(args.date_from);
  const to = str(args.date_to);
  const onlyFree = args.only_free_slots !== false;
  const excludeJoined = Boolean(args.exclude_joined);

  let list = ctx.quests.filter((q) => q.status === 'open' || q.status === 'full');
  if (category) list = list.filter((q) => q.category === category);
  if (onlyFree) list = list.filter((q) => q.slotsTaken < q.slotsTotal);
  if (excludeJoined) list = list.filter((q) => !isJoined(q, ctx));
  if (from || to) {
    list = list.filter((q) => {
      if (!q.startsAt) return true; // квести з гнучким часом не викидаємо
      const day = kyivDate(q.startsAt);
      return (!from || day >= from) && (!to || day <= to);
    });
  }
  // soonest first; quests with a flexible time last
  list.sort((a, b) => (a.startsAt ?? '9999').localeCompare(b.startsAt ?? '9999'));

  const result = {
    total: list.length,
    quests: list.slice(0, MAX_RESULTS).map((q) => summary(q, ctx)),
  };
  console.debug('[find_quests] args=%o → total=%d titles=%o', args, result.total, result.quests.map((q) => q.title));
  return result;
}

function questDetails(args: Record<string, unknown>, ctx: ToolContext) {
  const quest = ctx.quests.find((q) => q.id === str(args.quest_id));
  if (!quest) return { error: 'Квест не знайдено або він уже закритий' };
  return { ...summary(quest, ctx), description: quest.description || 'опису немає' };
}

function showQuestCards(args: Record<string, unknown>, ctx: ToolContext) {
  const ids = Array.isArray(args.quest_ids) ? args.quest_ids.filter((id): id is string => typeof id === 'string') : [];
  // only real quests, no duplicates, at most MAX_CARDS
  const quests = [...new Set(ids)].map((id) => ctx.quests.find((q) => q.id === id)).filter((q): q is Quest => Boolean(q));
  ctx.cards = quests.slice(0, MAX_CARDS).map((quest) => ({ quest }));
  if (isMascotMood(args.mood)) ctx.mood = args.mood;
  return { shown: ctx.cards.length };
}

function suggestNavigation(args: Record<string, unknown>, ctx: ToolContext) {
  const label = str(args.label);
  const href = str(args.href);
  const validHrefs = ['/map', '/quests', '/rewards', '/profile'];
  if (!label || !href || !validHrefs.includes(href)) return { error: 'Невалідні параметри' };
  ctx.navSuggestion = { label, href };
  return { ok: true };
}

function setHighlights(args: Record<string, unknown>, ctx: ToolContext) {
  const terms = Array.isArray(args.terms)
    ? args.terms.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 6)
    : [];
  ctx.highlights = terms;
  return { ok: true, count: terms.length };
}

/** Runs one tool call; unknown tools return an error the model can read. */
export function runTool(name: string | undefined, args: Record<string, unknown> | undefined, ctx: ToolContext): Record<string, unknown> {
  const a = args ?? {};
  switch (name) {
    case 'find_quests':
      return findQuests(a, ctx);
    case 'get_quest_details':
      return questDetails(a, ctx);
    case 'show_quest_cards':
      return showQuestCards(a, ctx);
    case 'suggest_navigation':
      return suggestNavigation(a, ctx);
    case 'set_highlights':
      return setHighlights(a, ctx);
    default:
      return { error: `Невідомий інструмент ${name}` };
  }
}
