import { z } from 'zod';

/**
 * Парсит вход по zod-схеме. ZodError ловит errorHandler и отдаёт 400.
 * Используется в контроллерах: `const body = parse(createOrgSchema, req.body)`.
 */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  return schema.parse(data);
}

export const idSchema = z.coerce.number().int().positive();

export const idParams = z.object({ id: idSchema });
