import { z } from 'zod';
import { BBOX } from '@/features/map/lib/projection';
import { CATEGORIES } from '@/shared/categories';
import type { Category, ClaimStatus, Quest } from '@/shared/types';

// Organization forms. Rules follow the backend (express-api: quests.schema.ts, organizations.schema.ts).

const CATEGORY_KEYS = Object.keys(CATEGORIES) as [Category, ...Category[]];
const number = (message: string) => z.number({ error: message });

export const questSchema = z.object({
  questName: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Максимум 200 символів'),
  description: z.string().max(5000, 'Максимум 5000 символів'),
  category: z.enum(CATEGORY_KEYS, { error: 'Оберіть категорію' }),
  address: z.string().max(500, 'Максимум 500 символів'),
  // the map only covers Dnipro, so the point must be inside the city frame
  lat: number('Вкажіть широту')
    .min(BBOX.south, 'Точка має бути в межах Дніпра')
    .max(BBOX.north, 'Точка має бути в межах Дніпра'),
  lng: number('Вкажіть довготу')
    .min(BBOX.west, 'Точка має бути в межах Дніпра')
    .max(BBOX.east, 'Точка має бути в межах Дніпра'),
  maxVolunteers: number('Вкажіть кількість').int('Ціле число').min(1, 'Мінімум 1').max(1000, 'Максимум 1000'),
  rewardXp: number('Вкажіть XP').int('Ціле число').min(0, 'Не менше 0').max(100_000, 'Максимум 100000'),
  rewardCoins: number('Вкажіть монети').int('Ціле число').min(0, 'Не менше 0').max(100_000, 'Максимум 100000'),
});
export type QuestValues = z.infer<typeof questSchema>;

export const organizationProfileSchema = z.object({
  organizationName: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Максимум 200 символів'),
  types: z.string().max(100),
  edrpou: z.string().regex(/^(\d{8})?$/, 'ЄДРПОУ — рівно 8 цифр або порожньо'),
  /** One contact per line (phone, email…), max 10. */
  contact: z
    .string()
    .refine((value) => value.split('\n').filter((line) => line.trim()).length <= 10, 'Максимум 10 контактів'),
  description: z.string().max(5000, 'Максимум 5000 символів'),
  logo: z.union([z.literal(''), z.url('Невірне посилання')]),
});
export type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>;

export const QUEST_STATUS_LABEL: Record<Quest['status'], string> = {
  open: 'Відкритий',
  full: 'Місць немає',
  in_progress: 'Триває',
  finished: 'Завершений',
  cancelled: 'Скасований',
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: 'Очікує рішення',
  approved: 'Схвалено',
  rejected: 'Відхилено',
  completed: 'Виконано',
  withdrawn: 'Відкликано',
};
