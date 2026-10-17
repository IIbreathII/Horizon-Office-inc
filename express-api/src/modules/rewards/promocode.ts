import { randomInt } from 'node:crypto';

// без похожих символов (0/O, 1/I/L), чтобы код было легко продиктовать на кассе
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * Промокод по шаблону партнёра: `{code}` в шаблоне заменяется случайной частью,
 * шаблон без `{code}` становится префиксом, без шаблона — общий префикс HZ.
 */
export function makePromocode(template: string | null): string {
  const code = Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  if (!template) return `HZ-${code}`;
  return template.includes('{code}') ? template.replaceAll('{code}', code) : `${template}-${code}`;
}
