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

## Git Workflow

After every meaningful change: `git add -A && git commit -m "..." && git push`. The working branch is `debug`; push there unless told otherwise.

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

### Data Access Layer

All DB access goes through `lib/dal/`. Two entry points:

```typescript
// Server Components, Route Handlers, Server Actions
const dal = await serverDal();
const trip = await dal.trips.findById(id);

// Client Components
const dal = browserDal();
```

`lib/dal/trips.ts` has simpler typed queries used in older RSC pages — prefer the Repository pattern for new work.

### Features vs Components

- `features/` — domain UI (ActivityList, GoChat, AppHeader, TripViewers…). Contains business logic.
- `components/ui/` — pure presentational primitives (Button, Map, RouteMap, StatusBadge…).
- `lib/` — pure utilities, API clients, DAL. No React.

### Icons

All icons come from `@tabler/icons-react` but **must be imported from `@/components/ui/icons`**, not directly from the library. Add new exports to that barrel file as needed.

### Styling

Tailwind v4. Use `cn()` from `@/lib/cn` for conditional classes. Design tokens (colors, radii, spacing) are CSS variables defined in `app/globals.css`.

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

## Catalog Import Pipeline

Admin-only. Imports tourist places from OSM → enriches with Wikipedia → generates OpenAI embeddings → stores in Supabase with pgvector.

Key files: `lib/overpass.ts`, `lib/wikipedia.ts`, `lib/region-presets.ts`, `lib/data-quality.ts`  
API: `app/api/catalog/jobs/`, `app/api/catalog/import/`  
UI: `app/(app)/admin/catalog/page.tsx`

Both import endpoints stream progress via SSE.

## Auth & Roles

Supabase Auth. Platform roles stored in `user_platform_roles` table: `admin`, `dev`, `tester`, `user`.

Role checks in route handlers via `lib/dal/auth.ts`:
- `requireTripEditor(tripId)` — checks `trip_members` for owner/editor role
- Admin checks query `user_platform_roles` directly

## Supabase Project

Project ID: `nxyeelvvzserzlxzente`  
Dashboard: https://supabase.com/dashboard/project/nxyeelvvzserzlxzente

## Dev Hub

`/dev` — links to briefs, design prototypes, API docs, Supabase and Vercel dashboards.  
`/dev/briefs` — technical documentation (architecture decisions, setup, integrations).  
`/dev/api-docs` — OpenAPI 3.0 spec for internal API routes.
