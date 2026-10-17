import { z } from 'zod';
import { BadRequest } from '../errors.js';
import { DEFAULT_LIMIT, MAX_LIMIT } from './page.js';

export const cursorQuery = {
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).default(DEFAULT_LIMIT).transform((v) => Math.min(v, MAX_LIMIT)),
};

export function encodeCursor(id: number): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64url');
}

export function decodeCursor(cursor: string): number {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Number.isInteger(value?.id) && value.id > 0) return value.id;
  } catch {
    // ниже — общий ответ
  }
  throw new BadRequest('Invalid cursor');
}

/** items запрошены как limit + 1: лишний элемент говорит, что есть следующая страница. */
export function cursorResult<T extends { id: number }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return {
    data,
    meta: {
      limit,
      hasMore,
      nextCursor: hasMore ? encodeCursor(data[data.length - 1].id) : null,
    },
  };
}
