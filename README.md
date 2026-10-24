# Flight Price Notifier (機票降價通知)

A SaaS landing page + authenticated app shell for Flight Price Notifier, a product that watches popular flight routes from Taipei and emails the user when the cheapest fare drops to or below their target price.

- Public landing page at `/`
- Email + password sign up (`/signup`), sign in (`/signin`) and sign out
- Authenticated dashboard placeholder at `/app`

## Stack

- **Vite + React** single-page app, client-side routing with **React Router**
- **Tailwind CSS** for styling
- **Supabase** (project `rizrjnjtmqufsigsyvng`) for authentication, using the default `auth.users` table

## Environment variables

The Supabase client (`src/integrations/supabase/client.ts`) reads two variables at build time:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://rizrjnjtmqufsigsyvng.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the project's `sb_publishable_…` key (browser-safe, RLS-gated; replaces the legacy anon key) |

Locally they come from `.env`. On Vercel, set both in **Project Settings → Environment Variables**.

## Development

```sh
npm i
npm run dev
```

## Build & deploy

- `npm run build` → static files in `dist/`
- `vercel.json` rewrites every path to `index.html`, so deep links like `/app` resolve client-side.
