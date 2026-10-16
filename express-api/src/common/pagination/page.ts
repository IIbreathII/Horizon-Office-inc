import { z } from 'zod';

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

export const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  // limit больше MAX_LIMIT не ошибка — просто обрезаем
  limit: z.coerce.number().int().min(1).default(DEFAULT_LIMIT).transform((v) => Math.min(v, MAX_LIMIT)),
};

export function toSkipTake({ page, limit }: { page: number; limit: number }) {
  return { skip: (page - 1) * limit, take: limit };
}

export function pageResult<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
