import { z } from 'zod';
import { QuestStatus } from '../../generated/prisma/enums.js';
import { pageQuery } from '../../common/pagination/page.js';
import { cursorQuery } from '../../common/pagination/cursor.js';

// assignedVolunteers, status, organizationId клиент не задаёт.
const fields = {
  questName: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullish(),
  category: z.string().trim().min(1).max(100),
  address: z.string().max(500).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  maxVolunteers: z.number().int().min(1).max(1000),
  rewardXp: z.number().int().min(0).max(100_000),
  rewardCoins: z.number().int().min(0).max(100_000),
};

const coordsTogether = (v: { lat?: number | null; lng?: number | null }) =>
  (v.lat === undefined) === (v.lng === undefined) && (v.lat === null) === (v.lng === null);
const coordsMessage = { message: 'lat and lng must be provided together', path: ['lat'] };

export const createQuestSchema = z
  .strictObject({
    ...fields,
    rewardXp: fields.rewardXp.default(0),
    rewardCoins: fields.rewardCoins.default(0),
  })
  .refine(coordsTogether, coordsMessage);

export const updateQuestSchema = z
  .strictObject(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required')
  .refine(coordsTogether, coordsMessage);

// open и archived вручную не ставятся: open — начальный, archived — только при удалении.
export const changeStatusSchema = z.strictObject({
  status: z.enum(['in_progress', 'completed', 'cancelled']),
});

export const feedQuery = z
  .object({
    ...cursorQuery,
    category: z.string().trim().min(1).max(100).optional(),
    status: z.enum(QuestStatus).default('open'),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().positive().max(100).optional(), // км
  })
  .refine(
    (v) => [v.lat, v.lng, v.radius].every((x) => x === undefined) || [v.lat, v.lng, v.radius].every((x) => x !== undefined),
    { message: 'lat, lng and radius must be provided together', path: ['radius'] },
  );

export const orgQuestsQuery = z.object({
  ...pageQuery,
  status: z.enum(QuestStatus).optional(),
});

export type CreateQuestInput = z.infer<typeof createQuestSchema>;
export type UpdateQuestInput = z.infer<typeof updateQuestSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type FeedQuery = z.infer<typeof feedQuery>;
export type OrgQuestsQuery = z.infer<typeof orgQuestsQuery>;
