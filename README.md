# procure-agent

Fullstack TypeScript project for an **LLM Agent-based Internal Procurement Management System**.

The current phase only provides the application foundations. It does not yet include LLM, Ollama, database integration, or procurement business logic.

## Project structure

```text
procure-agent/
├── frontend/  # Next.js, TypeScript, Tailwind CSS, App Router
├── backend/   # NestJS, TypeScript
└── docs/      # Design and architecture documentation
```

Planned backend modules are `auth`, `users`, `departments`, `purchase-requests`, `approvals`, and `agent`. They will be added in later phases.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

Install dependencies if needed:

```bash
cd frontend
npm install

cd ../backend
npm install
```

Start the frontend from one terminal:

```bash
cd frontend
npm run dev
```

The frontend is available at <http://localhost:3000>.

Start the backend from another terminal:

```bash
cd backend
npm run start:dev
```

The backend is available at <http://localhost:3001>.

## Build

Run `npm run build` separately in both `frontend` and `backend`.
