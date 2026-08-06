# API Overview

Base URL (dev): `http://localhost:4000/api` · Production: `https://<service>.onrender.com/api`

All endpoints are JSON. Authenticated endpoints require:

```
Authorization: Bearer <access-token>
```

---

## Response envelope

```json
{ "success": true, "message": "optional", "data": { ... } }
```

Paginated list endpoints return:

```json
{
  "success": true,
  "data": { "data": [...], "total": 12, "page": 1, "pageSize": 10, "totalPages": 2 }
}
```

---

## Authentication

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | username, fullName, password, email?, phone? | Closes after first account (owner) |
| POST | `/auth/login` | username, password | Returns `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | refreshToken | Rotates tokens |
| POST | `/auth/logout` | — | Invalidates refresh token |
| GET | `/auth/me` | — | Current user |
| PATCH | `/auth/profile` | fullName?, phone?, email?, avatarUrl? | Audited |
| POST | `/auth/change-password` | currentPassword, newPassword | Audited |
| GET | `/auth/login-history` | — | Recent logins |

---

## Modules

| Area | Endpoints |
|---|---|
| Dashboard | `GET /dashboard/stats` · `/dashboard/revenue?period=week\|month` · `/dashboard/activities` · `/dashboard/top-services` · `/dashboard/recent-customers` · `/dashboard/insights` |
| Customers | `GET/POST /customers` · `GET/PATCH/DELETE /customers/:id` |
| Vehicles | `GET/POST /vehicles` · `GET/PATCH/DELETE /vehicles/:id` |
| Wash jobs | `GET/POST /wash-jobs` · `GET /wash-jobs/:id` · `PATCH /wash-jobs/:id/status` · `GET /wash-jobs/:id/receipt` |
| Services | `GET/POST /services` · `GET/PATCH/DELETE /services/:id` · `POST /services/:id/duplicate` · `PATCH /services/:id/toggle` |
| Employees | `GET/POST /employees` · `GET/PATCH/DELETE /employees/:id` · `GET /employees/:id/stats` · `PATCH /employees/:id/suspend` |
| Inventory | `GET/POST /inventory` · `GET/PATCH/DELETE /inventory/:id` · `GET /inventory/stats` · `POST /inventory/:id/adjust` · `GET /inventory/:id/movements` |
| Expenses | `GET/POST /expenses` · `GET/PATCH/DELETE /expenses/:id` · `PATCH /expenses/:id/status` · `GET /expenses/stats` · `GET /expenses/export` |
| Receipts | `GET /receipts` · `GET /receipts/:id` · `POST /receipts/:id/void` · `POST /receipts/:id/duplicate` |
| Reports | `GET /reports?type=REVENUE&period=month&from=&to=` |
| Analytics | `GET /analytics/overview` |
| Notifications | `GET /notifications` · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications/:id` |
| Settings | `GET/PATCH /settings` · `POST /settings/reset` |
| Audit logs | `GET /audit-logs` · `GET /audit-logs/actions` · `GET /audit-logs/entities` |
| Roles & users | `GET/POST /roles` · `GET/PATCH /roles/:id` · `PATCH /roles/:id/status` · `GET /roles/permissions` · `GET /roles/users` · `PATCH /roles/users/:id/role` |
| Media | `POST /upload/image` (Cloudinary, guarded) |

---

## Query params (lists)

Common filters across lists: `page`, `pageSize`, `search`, `sortBy`, `sortDir`.

- **Wash jobs:** `status`, `customerId`, `vehicleId`, `dateFrom`, `dateTo`
- **Receipts:** `status`, `paymentMethod`, `dateFrom`, `dateTo`, `sortBy` (`issuedAt` | `total`)
- **Expenses:** `month` (`YYYY-MM`), `category`, `status`
- **Audit logs:** `action`, `entity`, `userId`, `dateFrom`, `dateTo`

---

## Role-based access control

Every protected route requires a permission key resolved from the caller's role.

| Permission key | Grants |
|---|---|
| `dashboard:view` | Dashboard |
| `customers:view` / `customers:manage` | Customers |
| `vehicles:view` / `vehicles:manage` | Vehicles |
| `wash-jobs:view` / `wash-jobs:manage` | Wash jobs |
| `services:view` / `services:manage` | Services |
| `employees:view` / `employees:manage` | Employees |
| `inventory:view` / `inventory:manage` | Inventory |
| `expenses:view` / `expenses:manage` / `expenses:approve` | Expenses |
| `receipts:view` / `receipts:manage` | Receipts |
| `reports:view` | Reports |
| `analytics:view` | Analytics |
| `notifications:view` | Notifications |
| `settings:view` / `settings:manage` | Settings |
| `audit-logs:view` | Audit logs |
| `users:view` / `users:manage` | Users & roles |
| `support:view` | Help centre |

Denied requests return `403 Forbidden`.

---

## Error format

```json
{ "success": false, "message": "Human readable error", "errors": [ ...validation details... ] }
```

| Status | Meaning |
|---|---|
| 400 | Validation or bad request |
| 401 | Missing/invalid token |
| 403 | Authenticated but insufficient permission |
| 404 | Resource not found |
| 429 | Rate limited (auth endpoints) |
| 500 | Server error (no stack traces leaked) |
