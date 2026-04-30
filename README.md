# RentRoost

RentRoost is a production-minded landlord operations portal built with Next.js, TypeScript, Tailwind, Prisma, and PostgreSQL. It covers tenancy admin, reminders, cashflow, reconciliation, reporting, documents, templates, backup/import, and user-scoped data management with admin impersonation support.

## What’s included

- Authentication: registration, login, logout, password reset
- Roles: `user` and `admin`
- Tenant-safe data access across the full app
- Landlords, properties, tenants, tenancy agreements, and rent changes
- Reminders with recurring/compliance support and notification-ready job hooks
- Cashflow with income, expenses, categories, VAT support, and UK financial-year summaries
- Reconcile with bank accounts, imported transactions, rules, and provider abstraction
- Dashboard, reports, branded PDF exports, documents, templates, and backup/import
- Theme settings, currency designator, and organisation branding for reports/templates

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Server Actions and route handlers

## Quick start with Docker

Docker is the fastest way to run RentRoost locally because it brings up both the app and PostgreSQL together.

### Requirements

- Docker Desktop or Docker Engine with Compose support

### Start the stack

```bash
docker compose up --build
```

Then open:

- `http://localhost:3002`

### What Docker does

- starts PostgreSQL in a container
- builds the Next.js app image
- runs `prisma generate`
- applies committed migrations with `prisma migrate deploy`
- seeds demo data
- starts the app on port `3002`

### Docker files included

- `docker-compose.yml`
- `Dockerfile`
- `.dockerignore`
- `.env.example`

### Useful Docker commands

```bash
docker compose logs -f app
docker compose logs -f db
docker compose down
docker compose down -v
```

### Docker notes

- the web app is available on host port `3002`
- PostgreSQL is exposed on host port `5434` to avoid clashing with any local service on `5432`
- Docker uses the internal Compose database connection automatically
- bind mounts are used for the database, `node_modules`, and Next.js cache under `./docker-data`

## Demo login

Seeded users:

- `admin@rentroost.local` / `ChangeMe123!`
- `user@rentroost.local` / `ChangeMe123!`

## Local non-Docker setup

If you want to run the app directly on your machine instead:

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

## Environment variables

Required:

- `DATABASE_URL`
- `DIRECT_URL`
- `APP_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_SECRET`

Optional:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`
- `BANK_PROVIDER_CLIENT_ID`
- `BANK_PROVIDER_CLIENT_SECRET`
- `BANK_PROVIDER_REDIRECT_URI`
- `BANK_PROVIDER_ENV`
- `BANK_PROVIDER_BASE_URL`
- `BANK_PROVIDER_AUTH_BASE_URL`
- `BANK_PROVIDER_ENCRYPTION_KEY`
- `BANK_PROVIDER_JOB_SECRET`
- `BANK_PROVIDER_WEBHOOK_SECRET`

## Validation

```bash
npm run lint
npm run test
npx tsc --noEmit
```

## Production build

```bash
npm run build
npm run start
```

## Deployment outline

1. Provision PostgreSQL.
2. Set the required environment variables.
3. Install dependencies with `npm install`.
4. Apply migrations with `npm run prisma:deploy`.
5. Generate Prisma client with `npm run prisma:generate`.
6. Optionally seed starter/demo data with `npm run prisma:seed`.
7. Start the app with `npm run start`.

## Backup and restore

- Export user-scoped data from `/backup` or `/api/backup/export`
- Import structured JSON backups from `/backup`
- Admins can intentionally run managed backup/import actions for another user

## Test coverage

Current automated tests cover:

- UK financial-year calculations
- backup permission boundaries
