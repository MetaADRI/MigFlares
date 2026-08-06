# Mig Flares Car Wash — Management System

A modern, production-ready **Car Wash Management System** built for **Mig Flares Car Wash** (Nkoloma Stadium, Lusaka, Zambia).

Designed like a commercial SaaS product (Stripe Dashboard / Shopify Admin caliber) with a clean, scalable, modular architecture that supports future **multi-branch and franchise expansion** without a database rewrite.

> **Status:** MVP complete (Phases 1–4) — authentication, operations, finance, reporting, administration and role-based access all implemented.

---

## ✨ Feature Overview

### Operations
- **Dashboard** — today/week/month revenue, wash KPIs, revenue chart, inventory alerts, expense summary, latest receipts, service distribution, most active employees, recent activity & customers, quick actions
- **Wash Jobs** — record washes (customer → vehicle → service → extras → discount → payment → attendant → photos → status), live totals, automatic receipt generation
- **Customers** — full CRM: search, filter, sort, pagination, create/edit modal, profile drawer, delete confirmation
- **Vehicles** — fleet management with wash history and vehicle type filters
- **Services** — service catalogue with pricing, durations, icons, colours and **inventory consumption requirements**
- **Employees** — roster with performance dashboard (washes, revenue, attendance), suspend/reactivate

### Finance & Stock
- **Inventory** — stock levels, low-stock alerts, restock/adjust ledger, movement history
- **Expenses** — ledger with categories, approval workflow, month/category/status filters, CSV export
- **Receipts** — POS receipt viewer with **thermal 80mm & A4 print**, PDF export, duplicate, void-with-reason, refund/share placeholders

### Management & Reporting
- **Reports** — 9 report types × 6 periods (incl. custom range), charts, tables, CSV & PDF/print export
- **Analytics** — executive KPIs, revenue/profit trends, peak hours, retention, employee productivity, expense trends
- **Notifications** — centre with categories, mark read/all, unread badge in the topbar
- **Settings** — business info, receipt settings, preferences, security
- **Audit Logs** — full action trail with filters and export
- **Profile** — avatar, profile form, change password, recent logins
- **Help Centre** — FAQs, quick-start guide, shortcuts, feedback forms
- **Users & Roles** — enterprise RBAC: role matrix, permission matrix, user assignment

### Security
- JWT authentication (access + refresh, rotation)
- bcrypt password hashing with timing-safe login
- **Role-based access control** — backend `requirePermission` middleware + frontend route guards + permission-filtered navigation
- Zod input validation, rate-limited auth endpoints, Helmet, CORS allowlist

---

## 🏗 Tech Stack

| Layer | Frontend | Backend |
|---|---|---|
| Core | React 19 + Vite | Node.js + Express |
| Routing | React Router v7 | — |
| Styling | Tailwind CSS v4 + shadcn-style UI | — |
| Forms / Validation | React Hook Form + Zod | Zod |
| Data | Axios + demo mock layer | Prisma ORM |
| Database | — | PostgreSQL (Neon) |
| Auth | JWT tokens | JWT + bcrypt |
| Charts | Recharts | — |
| Motion | Framer Motion | — |
| Icons | Lucide | — |
| Media | Cloudinary (placeholders) | Multer + Cloudinary |
| Deploy | Cloudflare Pages | Render |

---

## 🚀 Quick Start

### Demo mode (no backend required)
The frontend ships with **demo mode enabled by default** — realistic seeded data (100 customers, 120 vehicles, 700+ wash records, 100 expenses, 20 employees) makes every page fully interactive without a server.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev          # http://localhost:5173
```

> Demo login: any username/password works (e.g. `admin` / `admin123`).

### Full stack
```bash
# Backend
cd backend
npm install
cp .env.example .env        # set DATABASE_URL to your Neon Postgres
npx prisma migrate dev --name init
npm run seed                # roles, permissions, owner account
npm run dev                 # http://localhost:4000

# Frontend → point at the API
cd frontend
echo "VITE_API_URL=http://localhost:4000/api" > .env.local
echo "VITE_DEMO_MODE=false" >> .env.local
npm run dev
```

---

## 📁 Project Structure

```
mig-flares/
├── frontend/                  # React 19 + Vite + Tailwind v4
│   └── src/
│       ├── components/        # ui/ primitives · common/ · layout/ · <domain>/
│       ├── layouts/           # AuthLayout, DashboardLayout
│       ├── pages/             # 18 feature pages + error pages
│       ├── hooks/             # use-auth, use-debounce, use-media-query…
│       ├── context/           # auth + permission providers
│       ├── services/          # api client + domain services + mock layer
│       ├── routes/            # route definitions with permission guards
│       ├── types/             # domain + API TypeScript types
│       ├── constants/         # brand, navigation, permission catalog, meta
│       └── utils/             # formatting, CSV export, receipt/report printing
└── backend/                   # Node + Express + Prisma
    ├── prisma/                # schema.prisma + seed.ts
    └── src/
        ├── config/            # env, prisma client
        ├── controllers/
        ├── middleware/        # auth, permission, validation, error, upload
        ├── routes/
        ├── services/          # business logic
        ├── validation/        # Zod schemas
        └── utils/
```

**Architecture:** `routes → controllers → services → Prisma` (backend) and `pages → domain components → services → mock/API` (frontend).

---

## 🗄 Database

Schema is **multi-branch ready**: branch-scoped entities carry an optional `branchId`, so adding branches requires zero schema changes.

Core models: `User`, `Role`, `Permission`, `RolePermission`, `Branch`, `Customer`, `Vehicle`, `Service`, `ServiceInventoryRequirement`, `WashRecord`, `Receipt`, `Employee`, `InventoryItem`, `InventoryMovement`, `Expense`, `Notification`, `AuditLog`, `Settings`.

- UUID primary keys, `createdAt`/`updatedAt` timestamps, enums for statuses & categories
- Referential integrity with correct cascade rules
- Receipts support duplication/void via a one-to-many WashRecord→Receipt relation

---

## 📚 Documentation

| Doc | Contents |
|---|---|
| [Installation Guide](docs/INSTALLATION.md) | Environment setup, database, seed |
| [Deployment Guide](docs/DEPLOYMENT.md) | Neon, Render, Cloudflare Pages, Cloudinary |
| [API Overview](docs/API.md) | Auth, modules, RBAC, error format |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues & fixes |

---

## 🔐 Roles

| Role | Access |
|---|---|
| Super Admin (OWNER) | Everything |
| Manager | Operations, finance, reports, approvals |
| Cashier | Wash jobs, customers, receipts, payments |
| Attendant | Wash jobs & customer lookup only |

The permission catalog lives in `frontend/src/constants` (mirrored by the backend seed). Adjust defaults in `ROLE_DEFAULT_PERMISSIONS` or at runtime in **Users & Roles**.

---

## 📄 License

Commercial prototype for demonstration. © Mig Flares Car Wash.
