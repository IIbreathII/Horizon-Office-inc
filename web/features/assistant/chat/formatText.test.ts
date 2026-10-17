import { describe, expect, it } from 'vitest';
import { formatSegments } from './formatText';

const strong = (text: string) => ({ text, strong: true });
const plain = (text: string) => ({ text, strong: false });

describe('formatSegments', () => {
  it('turns Markdown bold into strong parts without the asterisks', () => {
    expect(formatSegments('Зазирни у розділ **«Нагороди»**, там **монети**.')).toEqual([
      plain('Зазирни у розділ '),
      strong('«Нагороди»'),
      plain(', там '),
      strong('монети'),
      plain('.'),
    ]);
  });

  it('drops an unclosed ** (an answer still typing out)', () => {
    expect(formatSegments('обирай свої **промо')).toEqual([plain('обирай свої промо')]);
  });

  it('highlights every occurrence, not every other one', () => {
    const segments = formatSegments('XP, XP і ще раз XP', ['XP']);
    expect(segments.filter((s) => s.strong)).toHaveLength(3);
  });

  it('extends a term to the whole word and ignores it inside another word', () => {
    expect(formatSegments('180 монет: монети, перемонетизація', ['монет'])).toEqual([
      plain('180 '),
      strong('монет'),
      plain(': '),
      strong('монети'),
      plain(', перемонетизація'),
    ]);
  });

  it('is case-insensitive and merges a highlight next to bold', () => {
    expect(formatSegments('**свої** Промокоди', ['промокод'])).toEqual([strong('свої'), plain(' '), strong('Промокоди')]);
  });

  it('leaves text without markup as one plain part', () => {
    expect(formatSegments('Привіт!')).toEqual([plain('Привіт!')]);
    expect(formatSegments('')).toEqual([]);
  });
});
