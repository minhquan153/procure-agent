# Procure Agent

Internal procurement workflow built with Next.js, NestJS, Prisma, and PostgreSQL. The current app supports internal account login, request drafting, approval, procurement status updates, and audit history. LLM Agent, user administration, and in-app notifications are not implemented.

## Run locally

Configure `backend/.env` from `backend/.env.example`. The seed gives all sample accounts the value of `SEED_DEFAULT_PASSWORD` (local default: `ProcureDemo123!`). Change that value for any shared environment.

```powershell
cd backend
npm install
npm exec prisma migrate deploy
npm run seed
npm run start:dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in with one of the seeded accounts:

| Role | Email |
| --- | --- |
| Admin | `admin@procure-agent.local` |
| Manager | `manager@procure-agent.local` |
| Employee | `employee.it@procure-agent.local` |
| Procurement | `procurement@procure-agent.local` |

The seed also creates a Marketing Employee account. All sample accounts use the configured seed password. There is no public registration flow.

## Authentication

`POST /auth/login` checks the email and scrypt password hash, then creates a server-side session. The raw random session token is sent only in an HttpOnly, SameSite=Lax cookie; PostgreSQL stores only its SHA-256 hash. `GET /auth/me` returns the authenticated account. `POST /auth/logout` revokes the active session and clears the cookie. Sessions expire after seven days.

All API routes require a valid session except `POST /auth/login` and the root health endpoint. Protected handlers derive actor identity from the session; client-supplied `userId` values are ignored or no longer accepted. Role checks remain in business services and admin-only user reads. Configure `FRONTEND_ORIGIN` to the exact frontend origin. Production deployments must use HTTPS so the session cookie is marked Secure.

## Main workflow routes

| Method | Endpoint | Access / purpose |
| --- | --- | --- |
| `POST` | `/auth/login` | Public login; sets session cookie |
| `GET` | `/auth/me` | Current session profile |
| `POST` | `/auth/logout` | Revoke current session |
| `POST` | `/purchase-requests` | Employee creates a draft |
| `GET` | `/purchase-requests` | Employee lists their requests |
| `GET` | `/purchase-requests/:id` | View an authorized request |
| `PATCH` | `/purchase-requests/:id` | Employee edits an owned draft |
| `POST` | `/purchase-requests/:id/cancel` | Employee cancels an owned draft |
| `POST` | `/purchase-requests/:id/submit` | Employee sends a valid draft for approval |
| `GET` | `/purchase-requests/manager-queue` | Assigned Manager queue |
| `POST` | `/approvals/:id/approve` | Assigned Manager approves |
| `POST` | `/approvals/:id/reject` | Assigned Manager rejects with a reason |
| `GET` | `/purchase-requests/procurement/queue` | Procurement/Admin queue |
| `POST` | `/purchase-requests/:id/start-purchasing` | Procurement begins work |
| `POST` | `/purchase-requests/:id/complete` | Procurement completes work |
| `POST` | `/departments/:id/budgets` | Admin configures a yearly budget |
| `GET` | `/audit-logs` | Admin audit history |

## Validation

```powershell
cd frontend
npm run lint
npm run build

cd ..\backend
npm run build
```

Backend workflow unit tests use a mocked Prisma client; they are not PostgreSQL integration tests.
