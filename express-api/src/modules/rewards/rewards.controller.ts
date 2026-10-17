import type { Request, Response } from 'express';
import { idParams, parse } from '../../common/validate.js';
import { rewardsService as service } from './rewards.service.js';

export const rewardsController = {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  },

  async buy(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    res.status(201).json(await service.buy(req.user!.id, id));
  },

  async slot(req: Request, res: Response) {
    res.json(await service.slot(req.user!.id));
  },

  async spin(req: Request, res: Response) {
    res.status(201).json(await service.spin(req.user!.id));
  },
};
