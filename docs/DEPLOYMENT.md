# Deployment Guide

Production targets: **Neon** (Postgres) — **Render** (backend) — **Cloudflare Pages** (frontend) — **Cloudinary** (media).

---

## 0. Push to GitHub

The repo is a monorepo (`backend/` + `frontend/`).

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/MetaADRI/MigFlares.git
git push -u origin main
```

> Secrets are git-ignored (`.env`, `.env.local`, `*.log`). Never commit them.

---

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string (`?sslmode=require`).
3. Apply migrations from your machine:
   ```bash
   cd backend
   npx prisma migrate deploy
   npm run db:seed   # once, against production DB
   ```

---

## 2. Backend — Render

Two options (do one):

**A. Blueprint (recommended).** A `render.yaml` is included at the repo root.
In Render → New → Blueprint, connect the repo. Render reads `render.yaml`
(service `mig-flares-api`, root dir `backend`) and deploys. Then fill the
`sync: false` env vars in the service dashboard:
```
DATABASE_URL=<neon pooled url>
JWT_ACCESS_SECRET=<long random>
JWT_REFRESH_SECRET=<long random>
CORS_ORIGIN=https://<your-project>.pages.dev
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**B. Manual.** Create a Web Service from the repo:
- Root directory: `backend`
- Build command: `npm ci && npx prisma generate && npm run build`
- Start command: `npx prisma migrate deploy && npm start`
- Health check path: `/api/health`

Deploy. Your API is at `https://<service>.onrender.com/api`.

> **Note:** Render free instances sleep after inactivity. Use a paid instance or a
> UptimeRobot/cron health-check ping for 24/7 availability.

---

## 3. Frontend — Cloudflare Pages

1. In Cloudflare Pages → Create a project → connect the repo.
2. Settings:
   - Root directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Output directory: `dist`
   - Environment variable (Production): `VITE_API_URL=https://<service>.onrender.com/api`
   - `NODE_VERSION=22` if the build needs it
3. SPA routing is handled by `frontend/public/_redirects` (already committed):
   ```
   /*  /index.html  200
   ```
4. Deploy. Your app is live at `https://<project>.pages.dev`.

---

## 4. Media — Cloudinary

1. Create an account at [cloudinary.com](https://cloudinary.com).
2. Copy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   into the **backend** env (Render). The `CLOUDINARY_FOLDER` defaults to `car-wash`.
3. Uploads are **server-signed**: the frontend calls `POST /api/upload` with an
   image and the backend stores it in Cloudinary, returning a secure URL.
   No unsigned upload preset or frontend Cloudinary keys are required.
4. Once configured, wash-job before/after photos and employee avatars upload
   through this endpoint.

---

## 5. Post-deploy checklist

- [ ] Login works against the production API
- [ ] Roles & permissions seeded (run `npm run db:seed` once)
- [ ] `CORS_ORIGIN` matches your Pages domain
- [ ] Secrets are **not** committed; rotate the default admin password
- [ ] Health check: `curl https://<api>/api/health`
- [ ] Cloudinary: upload a wash-job photo and confirm the image appears in Cloudinary
