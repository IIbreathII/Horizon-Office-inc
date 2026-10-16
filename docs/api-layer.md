# API layer — how data reaches the UI

> Frontend: `horizon-frontend/shared/api/`. Backend contract: REST `/api/v1/...` (see the endpoint table below).
> While the backend is not connected, an in-memory mock answers with the same response shapes.

## 1. Request flow

```
Component (e.g. RewardShop)
   │  useRewards() / useBuyReward()
   ▼
shared/api/queries.ts      TanStack Query: cache, loading/error state, refetch after mutations
   │  getRewards() / buyReward(id)
   ▼
shared/api/api.ts          the only public API surface: one function per endpoint
   │  USE_MOCK ? ─────────────────────────────┐
   ▼                                          ▼
shared/api/http.ts                     shared/api/mock.ts
fetch(`${URL}/api/v1/...`)             in-memory fake backend
   │                                          │
   └──────── response in backend shape (DTO, shared/api/dto.ts) ────────┘
   ▼
shared/api/mappers.ts      DTO (snake_case) → frontend model (shared/types.ts)
   ▼
Component receives Quest / Me / Reward / InventoryItem
```

Rule: components never see URLs, DTOs or mocks — they only use the hooks from `queries.ts`
(or, rarely, functions from `api.ts`).

## 2. Files

| File | Responsibility |
|---|---|
| [`api.ts`](../horizon-frontend/shared/api/api.ts) | The switch `const USE_MOCK = !process.env.NEXT_PUBLIC_API_URL`, the `ENDPOINTS` map (all paths in one place) and one function per endpoint: call mock **or** `http()`, then the mapper. |
| [`http.ts`](../horizon-frontend/shared/api/http.ts) | `fetch` wrapper: builds `${NEXT_PUBLIC_API_URL}/api/v1${path}`, adds query params, JSON body, `credentials: 'include'` (sends the auth cookie), throws `ApiError(status)` on non-2xx. |
| [`dto.ts`](../horizon-frontend/shared/api/dto.ts) | Backend request/response shapes using the DB column names (`quest_name`, `cur_level`, `rewards_name`…). Fields that are not in the DB schema are marked `ASSUMED`. |
| [`mappers.ts`](../horizon-frontend/shared/api/mappers.ts) | `toQuest`, `toMe`, `toReward`, `toInventoryItem`: DTO → frontend model (`quest_name` → `title`, `cur_level` → `level`, claim status → `ParticipationStatus`, int ids → string ids, level progress). |
| [`mock.ts`](../horizon-frontend/shared/api/mock.ts) | Fake backend used only while the env var is missing. |
| [`queries.ts`](../horizon-frontend/shared/api/queries.ts) | React hooks: `useMe`, `useQuests`, `useQuest`, `useRewards`, `useInventory`, `useClaimQuest`, `useBuyReward`; `CITY_AREA` (the area the map requests quests for); cache invalidation after mutations. |
| [`shared/types.ts`](../horizon-frontend/shared/types.ts) | Frontend models used by all components. |
| [`shared/levels.ts`](../horizon-frontend/shared/levels.ts) | XP thresholds per level, level titles, frame colors (used by the mapper and the profile). |

## 3. Endpoints → functions

| Endpoint | Function in `api.ts` | Hook in `queries.ts` | Used by |
|---|---|---|---|
| `POST /profiles` | `completeProfile(input)` | — | ready for onboarding |
| `GET /profiles/me` | `getMe()` | `useMe` | nav rail, profile, rewards |
| `GET /profiles/me/inventory` | `getInventory()` | `useInventory` | profile (promo codes) |
| `GET /quests?lat&lng&radius` | `getQuests(area)` | `useQuests` | map, quests page, search |
| `GET /quests/{id}` | `getQuest(id)` | `useQuest` | map panel (full card) |
| `POST /quests` | `createQuest(input)` | — | ready for the org module |
| `POST /quests/{id}/claim` | `claimQuest(id)` | `useClaimQuest` | «Записатися» |
| `PATCH /claims/{id}/approve` | `approveClaim(claimId)` | — | ready for the org module |
| `GET /rewards` | `getRewards()` | `useRewards` | rewards page |
| `POST /rewards/{id}/buy` | `buyReward(id)` | `useBuyReward` | rewards page |

After a mutation the related data is refetched automatically:
`useClaimQuest` → quests, the quest, me; `useBuyReward` → me, inventory.

## 4. How the mocks work

`mock.ts` has two parts:

- **Tables** — module-level arrays in the same DTO shapes the real API returns: `me` (the current
  volunteer), `organizations`, `quests` (10 active + 3 finished), `claims`, `rewards`, `userRewards`.
- **Handlers** — the `mockApi` object, one async function per endpoint. Each waits ~300 ms (fake
  network), reads or changes the tables and returns a copy.

Business rules imitated by the mock:

| Handler | Behaviour |
|---|---|
| `claimQuest` | adds a claim, `assigned_volunteers + 1`; `409` if full or already claimed |
| `buyReward` | checks the balance (`402` if too low), deducts the cost, generates a promo code, adds it to the inventory |
| `approveClaim` | marks the claim approved, adds XP and coins to the volunteer, recalculates the level |
| `getQuests` | returns quests within `radius` (meters) of `lat/lng` |
| `createQuest` | `403` unless the current user's role is `organization` |

The data lives in browser memory: it survives navigation between pages and resets on a full reload.

## 5. Connecting the real backend

1. Create `horizon-frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.example.com
   ```
   Base URL only — no `/api/v1` (the code adds it) and no trailing slash.
2. Restart `npm run dev` (`NEXT_PUBLIC_*` variables are read at start).

That is the only switch: every function in `api.ts` now calls `http()` instead of the mock.
Remove (or comment out) the line and restart to go back to mocks.
The value is visible in the browser — never put secrets into `NEXT_PUBLIC_*` variables.

## 6. What the backend must match

The URL alone is enough only if the backend matches these expectations:

1. **CORS with credentials.** Requests are sent with `credentials: 'include'`, so the backend must allow
   the exact frontend origin (e.g. `http://localhost:3000`) with `credentials: true` — not `*`.
2. **Auth cookie.** There is no login page yet; requests rely on an existing session cookie set by the
   backend. Without it `/profiles/me` returns 401 and pages show «Не вдалося завантажити…».
   If the API runs on another domain, the cookie needs `SameSite=None; Secure`.
3. **Response shapes** — assumptions marked `ASSUMED` in `dto.ts`, to confirm with the backend team:
   - responses are plain JSON (arrays / objects), not wrapped like `{ "data": [...] }`;
   - a quest includes the embedded `organization` (name, logo) and the current user's `claim`;
   - a quest has `starts_at` and `duration_hours` (if missing, the UI shows «—»);
   - claim statuses: `claimed` / `approved` / `rejected`; quest statuses: `open` / `full` / `finished` / `cancelled`;
   - `quest_claims.quest_id` is a single id (the DB diagram shows `int[]`);
   - an inventory item includes the embedded `reward` (name, partner);
   - profile includes `role`;
   - `radius` is in meters;
   - claim returns the claim, buy returns the new inventory row (`user_rewards` row).

   The most important one is the quest's `claim`: without it the Quests page stays empty and the map
   never shows «Ви записані».

If something differs, change only `dto.ts` (shape) and `mappers.ts` (mapping); for wrapped responses
also unwrap in the function in `api.ts`, e.g. `http<{ data: QuestDto[] }>(...)` → `.data`.
Pages, hooks and components stay untouched.

## 7. Adding a new endpoint

1. Request/response shape → `dto.ts`.
2. Mapper → `mappers.ts` (and a new model in `shared/types.ts` if needed).
3. Path → `ENDPOINTS` and a function in `api.ts` (`USE_MOCK ? mockApi.x() : http(...)`, then the mapper).
4. Mock handler → `mockApi` in `mock.ts`.
5. Hook → `queries.ts`: `useQuery` for reads, `useMutation` + `invalidateQueries` for writes.
