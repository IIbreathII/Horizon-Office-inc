import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
import { mapDbError } from '../dbErrors.js';
import { env } from '../../config/env.js';

function send(res: Parameters<ErrorRequestHandler>[2], status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  send(res, 404, 'NOT_FOUND', 'Route not found');
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return send(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, 400, 'VALIDATION_ERROR', 'Invalid request', details);
  }

  // Все ошибки БД из любого эндпоинта (Express 5 сам прокидывает async-ошибки сюда).
  const dbErr = mapDbError(err);
  if (dbErr) {
    if (dbErr.status >= 500 && env.NODE_ENV !== 'test') console.error(err);
    return send(res, dbErr.status, dbErr.code, dbErr.message, dbErr.details);
  }

  // Невалидный JSON в теле запроса (body-parser).
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    return send(res, 400, 'BAD_REQUEST', 'Malformed JSON body');
  }

  if (env.NODE_ENV !== 'test') console.error(err);
  return send(res, 500, 'INTERNAL', 'Internal server error');
};
