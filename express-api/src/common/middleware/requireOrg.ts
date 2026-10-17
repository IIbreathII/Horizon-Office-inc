import type { RequestHandler } from 'express';
import { prisma } from '../../db/prisma.js';
import { Forbidden, Unauthorized } from '../errors.js';

/** Пускает только пользователей с активным профилем организации. Ставит req.org. */
export const requireOrg: RequestHandler = async (req, _res, next) => {
  if (!req.user) throw new Unauthorized();

  const org = await prisma.organization.findFirst({
    where: { userId: req.user.id, deletedAt: null },
  });
  if (!org) throw new Forbidden('Organization profile required');

  req.org = org;
  next();
};
