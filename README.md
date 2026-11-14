# Procure Agent

Full stack TypeScript starter for an internal procurement management system. The current implementation covers the core purchase request workflow, approval decisions, department budgets, procurement status updates, and audit history. Authentication and the LLM Agent are not implemented yet.

## Project structure

```text
frontend/  Next.js web app
backend/   NestJS API and Prisma data layer
docs/      Design and architecture notes
```

## Requirements

- Node.js 20.9 or newer
- npm
- PostgreSQL

## Run locally

Create a PostgreSQL database and configure `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/procure_agent?schema=public"
PORT=3001
```

Install dependencies in both apps if needed. Then prepare the database and sample users:

```bash
cd backend
npm install
npm exec prisma migrate deploy
npm run seed
npm run start:dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The web app runs at <http://localhost:3000> and the API at <http://localhost:3001>.

The seed creates IT, Finance, and Marketing departments; sample Employee, Manager, Procurement, and Admin accounts; and a sample budget for the current fiscal year. Sample accounts are for local development only.

## Implemented API

Requests are created as drafts with at least one item. Only the owning Employee can edit or cancel a draft or submit it. Submission requires every item's quantity and estimated unit cost, a configured current-year department budget with sufficient capacity, and a Manager assigned in the requester's department. Approvals are assigned to that Manager. Procurement can move an approved request to purchasing and then complete it. Important changes are recorded in the audit log.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/purchase-requests` | Create a draft request with items |
| `GET` | `/purchase-requests?userId=...` | List requests (filtered to requester when supplied) |
| `GET` | `/purchase-requests/:id` | Get request details and history |
| `PATCH` | `/purchase-requests/:id?userId=...` | Edit an owned draft |
| `POST` | `/purchase-requests/:id/cancel` | Cancel an owned draft (`userId`) |
| `POST` | `/purchase-requests/:id/submit` | Validate budget and send for approval (`userId`) |
| `GET` | `/purchase-requests/approvals/pending?userId=...` | Manager's assigned approval queue |
| `POST` | `/approvals/:requestId/approve` | Approve an assigned request (`userId`, optional `comment`) |
| `POST` | `/approvals/:requestId/reject` | Reject an assigned request (requires `userId` and `comment`) |
| `GET` | `/purchase-requests/procurement/queue?userId=...` | Procurement queue |
| `POST` | `/purchase-requests/:id/start-purchasing` | Begin procurement (`userId`) |
| `POST` | `/purchase-requests/:id/complete` | Complete procurement (`userId`) |
| `POST` | `/departments/:id/budgets` | Set a fiscal-year budget (Admin `userId`) |
| `GET` | `/audit-logs?userId=...` | Admin audit history |

The API currently accepts `userId` in request bodies or query parameters as a development stand-in. It does not authenticate callers; this is not suitable for deployment with real users or data until a trusted authentication layer supplies the actor identity.

## Validation

```bash
cd backend
npm run build
npm test
npm run lint
```

The workflow tests use an in-memory Prisma mock. Applying the migration and seed against PostgreSQL is a separate local setup step.
