import { z } from 'zod';

// Form validation for login and registration. Field names follow the DB schema (users, organizations),
// so the values map straight onto the future /auth and /profiles request bodies.

const email = z.email('Введіть коректний email');

const password = z
  .string()
  .min(8, 'Мінімум 8 символів')
  .regex(/[a-zа-яіїєґ]/i, 'Пароль має містити літеру')
  .regex(/\d/, 'Пароль має містити цифру');

/** Ukrainian phone, spaces allowed: +380 67 123 45 67 */
const phone = z
  .string()
  .refine((value) => /^\+380\d{9}$/.test(value.replace(/\s/g, '')), 'Формат: +380XXXXXXXXX');

const passwordsMatch = (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword;
const mismatch = { error: 'Паролі не збігаються', path: ['confirmPassword'] };

export const loginSchema = z.object({
  email,
  password: z.string().min(8, 'Мінімум 8 символів'),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Step 1 of registration (/register): the account itself (users), before the role is chosen. */
export const accountSchema = z
  .object({
    username: z.string().trim().min(2, 'Мінімум 2 символи').max(50, 'Максимум 50 символів'),
    email,
    password,
    confirmPassword: z.string(),
    contact: phone,
  })
  .refine(passwordsMatch, mismatch);
export type AccountValues = z.infer<typeof accountSchema>;

/** organizations.types */
export const ORGANIZATION_TYPES = [
  { value: 'ngo', label: 'Громадська організація' },
  { value: 'charity', label: 'Благодійний фонд' },
  { value: 'initiative', label: 'Волонтерська ініціатива' },
  { value: 'municipal', label: 'Комунальна установа' },
  { value: 'other', label: 'Інше' },
] as const;

/** Last step for organizations (/register/organization): the organization profile for the new account. */
export const organizationSchema = z.object({
  organization_name: z.string().trim().min(2, 'Мінімум 2 символи').max(100, 'Максимум 100 символів'),
  types: z.enum(ORGANIZATION_TYPES.map((t) => t.value) as [string, ...string[]], { error: 'Оберіть тип організації' }),
  edrpou: z.string().regex(/^\d{8}$/, 'ЄДРПОУ — рівно 8 цифр'),
  contact: phone,
  description: z.string().max(500, 'Максимум 500 символів'),
});
export type OrganizationValues = z.infer<typeof organizationSchema>;
