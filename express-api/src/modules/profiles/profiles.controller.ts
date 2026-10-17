import type { Request, Response } from 'express';
import { profilesService as service } from './profiles.service.js';

export const profilesController = {
  async getMe(req: Request, res: Response) {
    res.json(await service.getMe(req.user!.id));
  },

  async inventory(req: Request, res: Response) {
    res.json(await service.inventory(req.user!.id));
  },

  async myQuests(req: Request, res: Response) {
    res.json(await service.myQuests(req.user!.id));
  },
};
