import type { Request, Response } from 'express';
import { idParams, parse } from '../../common/validate.js';
import { organizationsService as service } from './organizations.service.js';
import { createOrgSchema, listOrgsQuery, updateOrgSchema } from './organizations.schema.js';

export const organizationsController = {
  async create(req: Request, res: Response) {
    const body = parse(createOrgSchema, req.body);
    const org = await service.create(req.user!.id, body);
    res.status(201).json(org);
  },

  async list(req: Request, res: Response) {
    const query = parse(listOrgsQuery, req.query);
    res.json(await service.list(query));
  },

  async getById(req: Request, res: Response) {
    const { id } = parse(idParams, req.params);
    res.json(await service.getById(id));
  },

  async getMe(req: Request, res: Response) {
    res.json(await service.getById(req.org!.userId));
  },

  async updateMe(req: Request, res: Response) {
    const body = parse(updateOrgSchema, req.body);
    res.json(await service.update(req.org!.userId, body));
  },

  async removeMe(req: Request, res: Response) {
    await service.remove(req.org!.userId);
    res.status(204).end();
  },
};
