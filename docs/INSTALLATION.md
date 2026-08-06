# Installation Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime for frontend & backend |
| npm | 9+ | Package manager |
| PostgreSQL | 15+ (or a Neon account) | Database |
| Git | any | Source control |

---

## 1. Clone & install

```bash
git clone <your-repo-url> mig-flares
cd mig-flares
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

---

## 2. Database setup

### Option A — Local PostgreSQL

```bash
createdb mig_flares
# in backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mig_flares?schema=public
```

### Option B — Neon (cloud, recommended)

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the connection string into `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/mig_flares?sslmode=require
   ```

### Apply schema & seed

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run seed        # creates roles, permissions, owner account + demo data
```

The seed creates:
- The four roles (Super Admin, Manager, Cashier, Attendant) with default permissions
- The `admin` owner account (username: `admin`, password: `admin123` — **change after first login**)

---

## 3. Run the backend

```bash
cd backend
npm run dev        # http://localhost:4000 (API), /api route prefix
```

Verify: `curl http://localhost:4000/api/health` → `{ "success": true }`

---

## 4. Run the frontend

```bash
cd frontend
npm run dev        # http://localhost:5173
```

By default the frontend runs in **demo mode** (no backend needed). To use the real API:

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:4000/api
VITE_DEMO_MODE=false
```

---

## 5. Environment variables

See `frontend/.env.example` and `backend/.env.example` in the repo for the full annotated templates. The critical ones:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ backend | Neon/Postgres connection string |
| `JWT_ACCESS_SECRET` | ✅ backend | Long random string |
| `JWT_REFRESH_SECRET` | ✅ backend | Different long random string |
| `VITE_API_URL` | ✅ frontend (API mode) | e.g. `http://localhost:4000/api` |
| `VITE_DEMO_MODE` | frontend | `true` (default) or `false` |
| `CLOUDINARY_*` | media uploads | See Cloudinary section |

> **Never commit real secrets.** Use `.env.local` / `.env` (both gitignored).
