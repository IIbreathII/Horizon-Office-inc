import type { Request, Response } from 'express';
import { idParams, parse } from '../../common/validate.js';
import { questsService as service } from './quests.service.js';
import { changeStatusSchema, createQuestSchema, feedQuery, orgQuestsQuery, updateQuestSchema } from './quests.schema.js';

export const questsController = {
  async create(req: Request, res: Response) {
    const body = parse(createQuestSchema, req.body);
    res.status(201).json(await service.create(req.org!.userId, body));
  },

  async feed(req: Request, res: Response) {
    const query = parse(feedQuery, req.query);
    res.json(await service.feed(query, req.user?.id));
  },

  async getById(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    res.json(await service.getById(id, req.user?.id));
  },

  /** GET /organizations/:id/quests */
  async listByOrg(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    const query = parse(orgQuestsQuery, req.query);
    res.json(await service.listByOrg(id, query));
  },

  async update(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    const body = parse(updateQuestSchema, req.body);
    res.json(await service.update(req.org!.userId, id, body));
  },

  async changeStatus(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    const body = parse(changeStatusSchema, req.body);
    res.json(await service.changeStatus(req.org!.userId, id, body));
  },

  async remove(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    res.json(await service.remove(req.org!.userId, id));
  },
};
