// Server-side quest access for the assistant: the Express API when it is configured, the mock otherwise.
// (shared/api/api.ts is browser code: it calls the same-origin /api proxy, which does not exist on the server.)
import type { CursorPage, QuestDto } from '@/shared/api/dto';
import { toQuest } from '@/shared/api/mappers';
import { mockApi } from '@/shared/api/mock';
import type { Quest } from '@/shared/types';

/** The whole city of Dnipro (same area the map requests); radius in km. */
const CITY_AREA = { lat: 48.462, lng: 34.996, radius: 25 };

const USE_BACKEND = Boolean(process.env.NEXT_PUBLIC_API_URL);
// same backend address as the /api rewrite in next.config.ts
const BACKEND_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const DEV_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

async function backend<T>(path: string, token: string | undefined): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Backend ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Open quests across the city (the assistant filters them further). With the user's session token the
 * backend includes their own claim on each quest, so «already joined» is exact.
 */
export async function getCityQuests(sessionToken?: string): Promise<Quest[]> {
  const { lat, lng, radius } = CITY_AREA;
  const page = USE_BACKEND
    ? await backend<CursorPage<QuestDto>>(`/quests?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`, sessionToken ?? DEV_TOKEN)
    : await mockApi.getQuests(lat, lng, radius);
  return page.data.map(toQuest);
}
