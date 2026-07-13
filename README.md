# Async Velocity

High-velocity async standups, team compliance tracking, and automated workflow integrations with a minimalist design language.

This is a monorepo with two apps:

- **`frontend/`** — Next.js 16 (React 19, Tailwind CSS v4) UI. Runs on port **3000**.
- **`backend/`** — Express + TypeScript API backed by MongoDB (Mongoose). Runs on port **5001**.

The frontend proxies `/api/*` to the backend via a rewrite in `frontend/next.config.ts`, so the browser only ever talks to the frontend origin.

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongodb://127.0.0.1:27017` works out of the box)

## Setup

1. **Install dependencies** for the root, frontend, and backend in one step:

   ```bash
   npm run install:all
   ```

2. **Configure the backend environment.** Copy the example file and adjust as needed:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set a strong `JWT_SECRET` before deploying. Defaults assume local MongoDB and a frontend on `http://localhost:3000`.

3. **Seed the database** with demo teams, users, and standups:

   ```bash
   npm run seed --prefix backend
   ```

## Run locally

Start both apps together from the repo root:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## Demo accounts

The seed script creates demo users (all with password **`Password123!`**):

| Role  | Email                          |
| ----- | ------------------------------ |
| Lead  | `sarah@asyncvelocity.internal` |
| Admin | `cto@asyncvelocity.internal`   |

Member accounts follow the pattern `<firstname>@asyncvelocity.internal`.

## Project layout

```
.
├── frontend/   # Next.js app (App Router)
└── backend/    # Express + Mongoose API
    ├── src/    # controllers, routes, models, middleware, services
    └── seed.ts # demo data seeding
```
