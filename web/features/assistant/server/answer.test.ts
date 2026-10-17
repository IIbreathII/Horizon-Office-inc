import { describe, expect, it } from 'vitest';
import { cleanAnswer } from './answer';

describe('cleanAnswer', () => {
  it('drops a leaked tool-call fragment', () => {
    expect(cleanAnswer("Змінити ім'я не можна, подивися його у Профілі.\n\nІм'я,Профіль]}")).toBe(
      "Змінити ім'я не можна, подивися його у Профілі.",
    );
    expect(cleanAnswer('Ось квести!\n{"terms": ["XP"]}')).toBe('Ось квести!');
  });

  it('keeps ordinary text, line breaks and «quotes»', () => {
    const text = 'Відкрий квест на мапі й натисни «Записатися».\n\nА монети міняй у «Нагородах» (за [кожен] квест).';
    expect(cleanAnswer(text)).toBe(text);
  });
});
