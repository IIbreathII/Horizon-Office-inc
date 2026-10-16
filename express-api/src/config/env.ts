import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const optionalSecret = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || v.length >= 32, 'must be at least 32 characters');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).default(3000),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_SECRET_PREVIOUS: optionalSecret,
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  USER_STATUS_CACHE_SECONDS: z.coerce.number().int().min(0).default(30),
  // Dev-байпас guard (локальная разработка)
  IS_DEVELOPMENT: z.stringbool().default(false),
  DEV_BYPASS_TOKEN: z.string().optional().transform((v) => (v ? v : undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Печатаем только имена переменных и причину, но не значения.
    const fields = z.flattenError(parsed.error).fieldErrors;
    console.error('Invalid environment variables:', fields);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
