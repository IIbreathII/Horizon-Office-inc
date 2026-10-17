import { Prisma } from '../generated/prisma/client.js';
import { AppError } from './errors.js';

// Что кладёт @prisma/adapter-pg в err.meta.driverAdapterError.cause.
type AdapterCause = {
  kind?: string;
  constraint?: { fields?: string[]; index?: string; foreignKey?: unknown };
  table?: string;
  column?: string;
};

function adapterCause(err: Prisma.PrismaClientKnownRequestError): AdapterCause {
  const meta = err.meta as { driverAdapterError?: { cause?: AdapterCause } } | undefined;
  return meta?.driverAdapterError?.cause ?? {};
}

// organizations_edrpou_key -> edrpou, organizations_user_id_fkey -> user_id
function fieldsFromConstraint(name: string, table?: string): string[] {
  let base = name.replace(/_(key|fkey|pkey|idx)$/, '');
  if (table && base.startsWith(`${table}_`)) base = base.slice(table.length + 1);
  return [base];
}

// QuestClaim -> quest_claims (так названы таблицы через @@map)
function tableFromModel(model: unknown): string | undefined {
  if (typeof model !== 'string') return undefined;
  return `${model.replace(/(?<!^)([A-Z])/g, '_$1').toLowerCase()}s`;
}

function constraintFields(err: Prisma.PrismaClientKnownRequestError): string[] | undefined {
  const cause = adapterCause(err);
  const meta = err.meta as { target?: unknown; modelName?: unknown } | undefined;
  const table = cause.table ?? tableFromModel(meta?.modelName);

  if (cause.constraint?.fields?.length) return cause.constraint.fields;
  if (cause.constraint?.index) return fieldsFromConstraint(cause.constraint.index, table);
  // старый формат Prisma: meta.target
  if (Array.isArray(meta?.target)) return meta.target.map(String);
  if (typeof meta?.target === 'string') return fieldsFromConstraint(meta.target, table);
  // запасной вариант: имя constraint из текста ошибки
  const match = err.message.match(/constraint: `([^`]+)`/);
  return match ? fieldsFromConstraint(match[1], table) : undefined;
}

const dbUnavailable = () => new AppError(503, 'DB_UNAVAILABLE', 'Database is temporarily unavailable, try again later');
const dbError = () => new AppError(500, 'DB_ERROR', 'Database error');

/**
 * Переводит ошибку Prisma/БД в AppError с понятным клиенту статусом и сообщением.
 * Возвращает null, если это не ошибка БД.
 */
export function mapDbError(err: unknown): AppError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const fields = constraintFields(err);
    const on = fields ? ` (${fields.join(', ')})` : '';
    const details = fields ? { fields } : undefined;
    const cause = adapterCause(err);

    switch (err.code) {
      case 'P2002':
        return new AppError(409, 'CONFLICT', `Value already exists${on}`, details);
      case 'P2003':
        return new AppError(400, 'BAD_REQUEST', `Related record does not exist or is still referenced${on}`, details);
      case 'P2025':
        return new AppError(404, 'NOT_FOUND', 'Record not found');
      case 'P2000':
        return new AppError(400, 'VALIDATION_ERROR', `Value is too long${cause.column ? ` (${cause.column})` : ''}`);
      case 'P2011':
        return new AppError(400, 'VALIDATION_ERROR', `Required value is missing${cause.column ? ` (${cause.column})` : ''}`);
      case 'P2007':
      case 'P2020':
        return new AppError(400, 'VALIDATION_ERROR', 'Value is invalid or out of range');
      case 'P2034':
        return new AppError(409, 'CONFLICT', 'Concurrent update conflict, retry the request');
      // нет соединения, таймауты, пул переполнен
      case 'P1001':
      case 'P1002':
      case 'P1008':
      case 'P1017':
      case 'P2024':
      case 'P2037':
      case 'ECONNREFUSED':
      case 'ECONNRESET':
      case 'ETIMEDOUT':
        return dbUnavailable();
      default:
        // проблемы конфигурации/схемы (P1000, P1010, P2021, P2022...) — клиенту без подробностей
        return dbError();
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) return dbUnavailable();
  if (err instanceof Prisma.PrismaClientValidationError) return dbError(); // баг в запросе в коде
  if (err instanceof Prisma.PrismaClientUnknownRequestError || err instanceof Prisma.PrismaClientRustPanicError) {
    return dbError();
  }
  return null;
}
