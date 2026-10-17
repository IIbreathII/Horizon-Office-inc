import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { Forbidden, Unauthorized } from '../errors.js';
import { DEV_USER } from '../devUser.js';

/** Проверяет токен auth-API. Этот сервис токены только проверяет, не выпускает. */
export function verifyToken(token: string): number {
  const keys = [env.JWT_SECRET, env.JWT_SECRET_PREVIOUS].filter((k): k is string => Boolean(k));

  for (const key of keys) {
    try {
      const payload = jwt.verify(token, key, {
        algorithms: ['HS256'], // жёстко: защищает от подмены алгоритма (alg: none и т.п.)
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      }) as JwtPayload;

      const id = Number(payload.sub);
      if (!Number.isInteger(id) || id <= 0) throw new Unauthorized('Invalid token subject');
      return id;
    } catch (e) {
      if (e instanceof Unauthorized) throw e;
      if (e instanceof jwt.TokenExpiredError) throw new Unauthorized('Token expired');
      // неверная подпись этим ключом — пробуем следующий (ротация)
    }
  }
  throw new Unauthorized('Invalid token');
}

// Короткий кеш статуса пользователя, чтобы не ходить в users на каждый запрос.
const statusCache = new Map<number, { status: string | null; expires: number }>();

async function getUserStatus(id: number): Promise<string | null> {
  const ttl = env.USER_STATUS_CACHE_SECONDS * 1000;
  const cached = statusCache.get(id);
  if (ttl > 0 && cached && cached.expires > Date.now()) return cached.status;

  const user = await prisma.user.findUnique({ where: { id }, select: { status: true } });
  const status = user?.status ?? null;
  if (ttl > 0) statusCache.set(id, { status, expires: Date.now() + ttl });
  return status;
}

/** id пользователя по заголовку Authorization; бросает 401/403, как `auth`. */
async function authenticate(header: string | undefined): Promise<number> {
  if (!header?.startsWith('Bearer ')) throw new Unauthorized('No token');
  const token = header.slice(7).trim();

  // Dev-байпас: только если IS_DEVELOPMENT=true и вместо JWT прислан DEV_BYPASS_TOKEN
  if (env.IS_DEVELOPMENT && env.DEV_BYPASS_TOKEN && token === env.DEV_BYPASS_TOKEN) {
    // без JWT и без проверок в БД; работаем от имени dev-пользователя из сида
    return DEV_USER.id;
  }

  const userId = verifyToken(token);

  const status = await getUserStatus(userId);
  if (status === null) throw new Unauthorized('User not found');
  if (status !== 'active') throw new Forbidden(`User is ${status}`);

  return userId;
}

export const auth: RequestHandler = async (req, _res, next) => {
  req.user = { id: await authenticate(req.headers.authorization) };
  next();
};

/**
 * Для публичных эндпоинтов, которые для вошедшего пользователя показывают больше (его заявку на квест).
 * Без токена или с негодным токеном запрос идёт как анонимный — публичный ответ не должен ломаться
 * из-за просроченного токена.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  if (req.headers.authorization) {
    try {
      req.user = { id: await authenticate(req.headers.authorization) };
    } catch (e) {
      if (!(e instanceof Unauthorized || e instanceof Forbidden)) throw e;
    }
  }
  next();
};
