# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js + Turbopack)
npm run build        # Production build
npm run typecheck    # tsc --noEmit (run after every change)
npm run lint         # ESLint
```

> **Important:** Never run `npm install` inside mounted/user folders — `.bin/` symlinks fail in that context.

## Architecture

### Route Groups

```
app/
├── (app)/          # Authenticated app — trips, admin, profile
├── (auth)/         # Login, signup
├── (dev)/dev/      # Component sandbox + dev hub (stable, registered components only)
├── (design)/design/ # HTML static prototypes — new design work goes here, NOT in (dev)
├── (marketing)/    # Public pages
└── api/            # Route handlers
```

### Data, services & API (backend)

Three layers, strict direction: **route handler → service → DAL**. Never invert or skip.

- **DAL** (`lib/dal/entities/*`) — the only code that touches the DB. One class per entity (`Trips`, `Activities`, `Budget`, `Membership`, `Media`, `Journal`, `Users`, `Catalog`, `Feedback`), built via `serverDal()` (RLS), `serviceDal()` (service-role, after authz), or `browserDal()`.
- **Services** (`lib/services/*`) — business logic / orchestration / policy. Built via `serverServices()` / `serviceServices()`.
- **HTTP kit** (`lib/api/*`) — `route()` wrapper, `ok()` + `ApiError`, auth `guards`, single response envelope.

```typescript
// route handler — thin: guard → service → ok()
export const GET = route<{ id: string }>(async ({ params }) => {
  await requireTripMember(params.id);
  const services = await serverServices();
  return ok(await services.trips.getSnapshot(params.id));
});
```

#### Hard rules

1. **No table strings.** Reference tables only through the per-domain enums in `lib/dal/tables.ts` (`TripTable.Days`, …). Never `.from("days")`.
2. **DB access lives only in `lib/dal`.** Handlers, services and components must never call `supabase.from(...)`. Add/extend an entity class instead.
3. **One activity model.** An activity = entity (`activities`) + scheduled instance (`scheduled_activities`). Entity fields go through `ActivityService.updateEntity`; instance/timeline fields (`slot/time/position/type/fuzzy/booking_status/bridge_*`) through the scheduling methods. Do **not** revive the old "blocks" model or add parallel activity endpoints.
4. **Routes are thin.** Wrap every handler in `route()`; resolve user/permission with a guard from `lib/api/guards` (they throw `ApiError`); put logic in a service. No orchestration, no manual `NextResponse` in handlers.
5. **One response envelope.** Success → `ok(data)` → `{ data }`. Errors → throw `ApiError` (or let `DalError` propagate) → `{ error: { code, message } }`. Never hand-build error responses or invent new shapes.
6. **Reuse before inventing.** Before adding a route/service/query, look for an existing guard, service method, or DAL method and extend it. Add new REST surface only for genuinely new resources, matching the canonical naming already in `app/api`.

> **Exception:** external-service proxies under `app/api/{places,ai,go,routes,overpass,catalog}` are adapters — they keep their provider/streaming contracts (no `{ data }` envelope, no service layer required).

### Features vs Components

- `features/` — domain UI (ActivityList, GoChat, AppHeader, TripViewers…). Contains business logic.
- `components/ui/` — pure presentational primitives (Button, Map, RouteMap, StatusBadge…).
- `lib/` — pure utilities, API clients, DAL. No React.

### Icons

All icons come from `@tabler/icons-react` but **must be imported from `@/components/ui/icons`**, not directly from the library. Add new exports to that barrel file as needed.

### Styling — Tailwind v4

Tailwind v4 with design tokens in `@theme` (no legacy `tailwind.config.*`). Single source of truth: `app/globals.css`. The `cn()` helper from `@/lib/cn` (clsx + twMerge) is the only sanctioned way to compose conditional classes.

#### Hard rules

1. **Always use tokens, never hardcoded hex/rgba in classNames.** If a color doesn't exist as a token, add it to `@theme` in `app/globals.css` rather than writing `bg-[#abc123]`. Tokens auto-generate utilities: `--color-foo` → `bg-foo`, `text-foo`, `border-foo`.
2. **Always use `cn()` for `className`, never template literals.** `className={\`base ${cond ? "a" : "b"}\`}` bypasses `twMerge` and creates conflict bugs. Use `cn("base", cond && "a", !cond && "b")`.
3. **Never import `clsx` or `tailwind-merge` directly.** Only `@/lib/cn` is allowed.
4. **Prefer the Tailwind scale over arbitrary values.** `p-4` not `p-[16px]`, `size-6` not `w-[24px] h-[24px]`, `rounded-md` not `rounded-[12px]`. Arbitrary values are a smell — promote recurring ones to tokens.
5. **No `@apply` in `globals.css`.** Keep utilities in JSX. CSS in `globals.css` is for keyframes, scrollbar, and document-level base styles only.
6. **No dark mode variants** (`dark:*`). The project is light-only by design. If dark mode is ever introduced, it will be via duplicated tokens in `@theme @media (prefers-color-scheme: dark)`, not per-component variants.
7. **Hover-only states must have a touch fallback.** Replace `opacity-0 group-hover:opacity-100` with `opacity-30 group-hover:opacity-100 focus-within:opacity-100` (or similar). Pure hover affordances are invisible on touch devices.

#### Available token families (see `app/globals.css`)

| Family | Tokens | Utilities |
|--------|--------|-----------|
| Surfaces | `bg`, `surface`, `surface-soft`, `surface-warm`, `surface-input` | `bg-bg`, `bg-surface-input`, … |
| Ink (text) | `ink`, `ink-hover`, `ink-soft`, `ink-faint` | `text-ink`, `bg-ink-hover`, … |
| Borders | `border`, `border-strong` | `border-border`, `border-border-strong` |
| Brand | `primary`, `primary-soft`, `primary-border`, `primary-deep` (alias: `orange-*`) | `bg-primary`, `text-primary-deep`, … |
| Accent | `lime`, `lime-text` | `bg-lime`, `text-lime-text` |
| Status (legacy) | `status-todo-*`, `status-booked-*`, `status-paid-*` | `bg-status-paid-bg`, `text-status-paid-fg` |
| Status (semantic) | `danger-*`, `warning-*`, `success-*` (`bg`/`fg`/`deep`/`border`) | `bg-danger-bg`, `text-danger-fg`, `border-danger-border` |
| Radius | `sm` (8), `md` (12), `lg` (14), `pill` (999) | `rounded-md`, `rounded-pill` |
| Text size | `micro` (10), `tiny` (11), `mini` (12), `meta` (13) | `text-micro`, `text-tiny`, `text-mini`, `text-meta` |
| Tracking | `meta` (.04), `eyebrow` (.06), `eyebrow-wide` (.12) | `tracking-meta`, `tracking-eyebrow`, `tracking-eyebrow-wide` |
| Z-index | `dropdown` (30), `overlay` (40), `modal` (50), `toast` (60) | `z-modal`, `z-toast` |

> **`status-paid-*` vs `success-*`**: the legacy `status-paid-*` palette is used by `StatusBadge` and has slightly different shades. Use `status-*` for trip/activity state, `success-*` for general feedback (toasts, confirmations).

#### Composing variants

Use [`class-variance-authority`](https://cva.style/docs) for primitives in `components/ui/` with multiple visual variants (see `Button.tsx`, `TabSwitcher.tsx`, `FilterPill.tsx` as references). Compose final classes through `cn()` to keep `twMerge` semantics.

#### Adding a new token

1. Add to `@theme` in `app/globals.css` next to its family.
2. Use it immediately as a utility — no rebuild config needed.
3. **If the utility overloads an ambiguous namespace, register it in `lib/cn.ts`.** `text-*`, `tracking-*`, `z-*`, `rounded-*` etc. are recognised by `tailwind-merge` only for known values. A custom `text-meta` is otherwise mistaken for a text-*color* and silently dropped when merged next to `text-ink-soft`. Add new names to the `extendTailwindMerge` class groups in `lib/cn.ts`, keeping it in sync with `globals.css`. (`bg-*`/`border-*` color tokens are safe and need no registration.)
4. If it replaces hardcoded values elsewhere, sweep the codebase (`grep -rn 'bg-\\[#xxx\\]' features/ components/ app/`).
5. **Skip `app/(design)/design/**`** — those are static HTML prototypes that intentionally don't follow the design system.

#### Common patterns

```tsx
// ✅ Conditional classes via cn()
import { cn } from "@/lib/cn";
<button className={cn(
  "rounded-md px-3 py-1.5 text-mini",
  active ? "bg-primary text-white" : "bg-surface text-ink",
  disabled && "opacity-50 pointer-events-none",
)} />

// ✅ Token-based status badge
<span className="bg-danger-bg text-danger-fg border border-danger-border" />

// ✅ Scale-based spacing
<div className="p-4 gap-3 rounded-md" />

// ❌ Hardcoded hex
<span className="bg-[#fcebeb] text-[#9a3015]" />

// ❌ Template literal in className
<span className={`base ${active ? "on" : "off"}`} />

// ❌ Arbitrary spacing duplicating the scale
<div className="p-[16px] rounded-[12px]" />
```

## i18n

next-intl without URL routing. Locale detection priority: `travelgo-locale` cookie → `Accept-Language` header → `"en"` fallback.

- Message files: `messages/en.json`, `messages/it.json`
- Supported locales: `i18n/locales.ts`
- Server strings: `getTranslations("Namespace")` — async, for RSC and route handlers
- Client strings: `useTranslations("Namespace")` — sync, for Client Components
- Locale in client: `useLocale()` from next-intl
- `LocaleSwitcher` component handles cookie write + `router.refresh()` — do not replicate this logic elsewhere

## Go — AI Assistant

Conversational travel assistant built on `openai@6.37.0` + `gpt-4o-mini`. Entry points:

- `features/go/GoChat.tsx` — full panel
- `features/go/GoChatFloat.tsx` — floating bubble
- `features/go/prompt.ts` — system prompt construction
- `features/go/widget-registry.ts` — structured response widgets

The Go context is hydrated with trip/day data via `features/go/TripGoContext.tsx`.

## Auth & Roles

Supabase Auth. Platform roles stored in `user_platform_roles` table: `admin`, `dev`, `tester`, `user`.

Authorization guards live in `lib/api/guards.ts`. They **throw `ApiError`** (the `route()` wrapper turns it into the failure envelope) and return `{ userId }` on success — call them at the top of a handler, do not branch on a return value:
- `requireUser()` — logged-in only
- `requireTripEditor(tripId)` / `requireTripMember(tripId)` — `trip_members` role
- `requireDayEditor` / `requireActivityEditor` / `requireScheduledEditor` (+ `*Member`) — resolve resource → trip → role
- `requirePlatformAdmin()` / `requirePlatformTester()` — `user_platform_roles`

## Supabase Project

Project ID: `nxyeelvvzserzlxzente`  
Dashboard: https://supabase.com/dashboard/project/nxyeelvvzserzlxzente

## Dev Hub

`/dev` — links to briefs, design prototypes, API docs, Supabase and Vercel dashboards.  
`/dev/briefs` — technical documentation (architecture decisions, setup, integrations).  
`/dev/api-docs` — OpenAPI 3.0 spec for internal API routes.
