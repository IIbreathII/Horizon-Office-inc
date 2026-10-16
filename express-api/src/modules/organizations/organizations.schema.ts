import { z } from 'zod';
import { pageQuery } from '../../common/pagination/page.js';

// trustScore, userId, deletedAt клиент не задаёт: в strictObject лишние поля дают 400.
const fields = {
  organizationName: z.string().trim().min(1).max(200),
  types: z.string().trim().max(100).nullish(),
  edrpou: z.string().regex(/^\d{8}$/, 'EDRPOU must be 8 digits').nullish(),
  contact: z.array(z.string().trim().min(1).max(200)).max(10),
  description: z.string().max(5000).nullish(),
  logo: z.url().max(2000).nullish(),
};

export const createOrgSchema = z.strictObject({
  ...fields,
  contact: fields.contact.default([]),
});

export const updateOrgSchema = z
  .strictObject(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const listOrgsQuery = z.object({
  ...pageQuery,
  type: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type ListOrgsQuery = z.infer<typeof listOrgsQuery>;
