# ClipCraft — Next.js

This folder is the Next.js App Router conversion of the supplied ClipCraft project.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

## Backend API

Create `.env.local` from `.env.example` and set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

The existing ClipCraft API client, authentication flow, React Query data fetching, editor/media UI, styles and public assets have been retained.

## Main routes

- `/` — landing page
- `/login` — login
- `/signup` — signup
- `/forgot-password` — password reset UI
- `/workspace` — dashboard
- `/projects` — projects
- `/entry` — video upload entry
- `/editor` — editor
- `/media` — media library
- `/templates` — templates
- `/team` — team
- `/analytics` — analytics history
- `/account` — account/settings placeholder
- `/help` — help/support

The old TanStack Router/Vite/TanStack Start runtime files were removed and replaced with the Next.js App Router.
