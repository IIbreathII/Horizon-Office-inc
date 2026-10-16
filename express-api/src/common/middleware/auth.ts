import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { Forbidden, Unauthorized } from '../errors.js';

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

export const auth: RequestHandler = async (req, _res, next) => {
  // Dev-байпас: только если IS_DEVELOPMENT=true и прислан верный DEV_BYPASS_TOKEN
  const bypass = req.headers['x-dev-bypass'];
  if (env.IS_DEVELOPMENT && env.DEV_BYPASS_TOKEN && bypass === env.DEV_BYPASS_TOKEN) {
    req.user = { id: env.DEV_BYPASS_USER_ID };
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Unauthorized('No token');

  const userId = verifyToken(header.slice(7).trim());

  const status = await getUserStatus(userId);
  if (status === null) throw new Unauthorized('User not found');
  if (status !== 'active') throw new Forbidden(`User is ${status}`);

  req.user = { id: userId };
  next();
};
