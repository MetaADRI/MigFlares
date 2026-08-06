# Troubleshooting

---

## Frontend

### "The app shows login but demo mode should skip it"
The demo session is stored in `localStorage` under `mf_access_token`. Clear site data, or run in the console:
```js
localStorage.clear(); location.reload();
```

### Pages load but data is empty
You're in API mode (`VITE_DEMO_MODE=false`) without a running backend. Either start the backend or flip demo mode on. Check `frontend/.env.local`.

### "Cannot connect to backend" / CORS errors
- Confirm `VITE_API_URL` points at the API (e.g. `http://localhost:4000/api`).
- Confirm the backend `CORS_ORIGIN` includes your frontend origin.
- Check the API is running: `curl http://localhost:4000/api/health`.

### 401 → redirected to "Session expired"
Your access token expired (15 min default). The refresh flow is enabled but if the refresh token was cleared, sign in again. This is expected behaviour for security.

---

## Backend

### `prisma migrate` fails to connect
- Check `DATABASE_URL` in `backend/.env`.
- For Neon, use the pooled URL with `?sslmode=require`.
- Ensure your IP is allowed in Neon's connection settings.

### Prisma client errors after schema changes
```bash
cd backend
npx prisma generate
```

### Port already in use
```bash
PORT=4001 npm run dev   # or change PORT in .env
```

### Seeding fails with "Role OWNER has not been seeded"
Run the seed: `npm run seed`. It must run once so roles & permissions exist before login.

### 401 on every request after login
The access token is short-lived (15m). Either refresh (automatic via `POST /auth/refresh`) or log in again. If you get stuck in a loop, clear `localStorage` on the frontend.

### 403 on routes that should be allowed
The user's role lacks the required permission. Either assign the user a different role in **Users & Roles**, or adjust the role's permission matrix.

---

## Database

### Duplicate receipts / receipt numbering
Receipt numbers are generated sequentially (`RCP-xxxx`). If the sequence resets after a fresh seed, older records in your production DB may clash — keep one seed per environment.

### Missing relations after restore
Run `npx prisma migrate deploy` against the restored database before starting the API.

---

## Common demo gotchas

| Symptom | Cause / fix |
|---|---|
| Dashboard shows 0 revenue | Demo seed generates data on first load — reload once |
| Low-stock alert never clears | Restock the item via the Inventory adjust dialog |
| Receipt print opens blank | Pop-up blocker — allow popups for the app |
| Print preview shows unstyled HTML | Use the browser's print dialog, not "Save page" |

---

## Still stuck?

Open a support ticket via the in-app **Help → Send us a message** form, or contact support@migflares.co.zm with:
1. Browser console errors
2. The request URL and response body from the failing API call
3. Steps to reproduce
