# TravelGo

Plan, organize, and live your trips.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (reuses project `nxyeelvvzserzlxzente`)
- Deployed on Vercel

## Structure

```
app/
  (marketing)/   → public pages (home, pricing, about, …)
  (app)/         → product behind auth
  (dev)/dev/     → component sandbox (dev-only)
  layout.tsx     → root layout, fonts, metadata
  globals.css
components/      → shared UI
lib/             → Supabase client, helpers, types
design/          → HTML/CSS prototypes (design-first workflow)
public/          → static assets
```

## Dev

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

Open http://localhost:3000. Component sandbox: http://localhost:3000/dev.

## Workflow

Design-first: HTML/CSS prototypes go in `design/`, then we port them to React/Tailwind.
