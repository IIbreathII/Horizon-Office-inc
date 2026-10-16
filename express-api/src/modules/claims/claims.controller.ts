import type { Request, Response } from 'express';
import { parse } from '../../common/validate.js';
import { claimsService as service } from './claims.service.js';
import { claimParams, decideClaimSchema, listClaimsQuery, questParams } from './claims.schema.js';

export const claimsController = {
  async apply(req: Request, res: Response) {
    const { id } = parse(questParams, req.params);
    res.status(201).json(await service.apply(req.user!.id, id));
  },

  async withdraw(req: Request, res: Response) {
    const { id } = parse(questParams, req.params);
    await service.withdraw(req.user!.id, id);
    res.status(204).end();
  },

  async list(req: Request, res: Response) {
    const { id } = parse(questParams, req.params);
    const query = parse(listClaimsQuery, req.query);
    res.json(await service.list(req.org!.userId, id, query));
  },

  async decide(req: Request, res: Response) {
    const { id, claimId } = parse(claimParams, req.params);
    const body = parse(decideClaimSchema, req.body);
    res.json(await service.decide(req.org!.userId, id, claimId, body));
  },

  async complete(req: Request, res: Response) {
    const { id, claimId } = parse(claimParams, req.params);
    res.json(await service.complete(req.org!.userId, id, claimId));
  },
};
