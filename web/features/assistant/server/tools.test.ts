import { describe, expect, it } from 'vitest';
import type { Quest } from '@/shared/types';
import { ensureCards, runTool, type ToolContext } from './tools';

const quest = (id: string, startsAt: string, joined = false) =>
  ({
    id,
    title: `Квест ${id}`,
    category: 'animals',
    address: 'вул. Тестова',
    startsAt,
    durationHours: 2,
    slotsTotal: 5,
    slotsTaken: 1,
    xpReward: 10,
    coinsReward: 5,
    status: 'open',
    organization: { id: 'o', name: 'Org' },
    myParticipation: joined ? { claimId: 'c', status: 'joined' } : null,
  }) as unknown as Quest;

const context = (quests: Quest[], joinedIds: string[] = []): ToolContext => ({
  quests,
  joinedIds: new Set(joinedIds),
  cards: [],
  mood: null,
  navSuggestion: null,
  highlights: [],
  found: [],
});

describe('find_quests', () => {
  it('sorts by date and leaves out joined quests when asked (from the API or the browser)', () => {
    const ctx = context(
      [quest('late', '2026-10-20T10:00:00Z'), quest('soon', '2026-10-18T10:00:00Z'), quest('mine', '2026-10-19T10:00:00Z', true), quest('local', '2026-10-19T12:00:00Z')],
      ['local'],
    );
    const result = runTool('find_quests', { exclude_joined: true }, ctx) as { quests: { id: string }[] };
    expect(result.quests.map((q) => q.id)).toEqual(['soon', 'late']);
  });
});

describe('ensureCards', () => {
  it('shows the first found quests when the model forgot the cards', () => {
    const ctx = context(['1', '2', '3', '4'].map((id) => quest(id, `2026-10-1${id}T10:00:00Z`)));
    runTool('find_quests', {}, ctx);
    ensureCards(ctx);
    expect(ctx.cards.map((c) => c.quest.id)).toEqual(['1', '2', '3']);
  });

  it('keeps the cards the model chose', () => {
    const ctx = context([quest('1', '2026-10-18T10:00:00Z'), quest('2', '2026-10-19T10:00:00Z')]);
    runTool('find_quests', {}, ctx);
    runTool('show_quest_cards', { quest_ids: ['2'] }, ctx);
    ensureCards(ctx);
    expect(ctx.cards.map((c) => c.quest.id)).toEqual(['2']);
  });
});
