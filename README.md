# Verdict — Architecture Overview

## What This Project Is

**Verdict** is a law-firm management platform with three apps in a single Nx-less monorepo (`apps/*`):

| App | Stack | Role |
|-----|-------|------|
| `api` | NestJS 11 + Prisma + PostgreSQL | Auth, firms, matters, clients, associates, HR, expenses, tasks, case-documents, **AI gateway** |
| `web` | Next.js 16 + React 19 + Redux + Tailwind CSS | Dashboard, CRM, AI chat interface |
| `ai` | Python 3.11 + FastAPI + LlamaIndex + ChromaDB + Ollama | RAG ingestion/query pipeline for legal documents |

The `api` app is the primary backend — it proxies AI requests to the Python `ai` service and exposes everything under `/api`. The `web` app calls `api` (and, for AI, the `/api/ai/*` routes).

## Directory Layout

```
Verdict/
├── apps/
│   ├── api/          NestJS backend (main.ts, modules, prisma)
│   ├── web/          Next.js frontend (app/, components/, redux/)
│   └── ai/           Python RAG service (FastAPI + ChromaDB + Ollama)
├── packages/          (empty — reserved for shared libs)
└── ARCHITECTURE.md   ← this file
```

## Data Flow

1. **Web → API**: Next.js uses TanStack Query + Axios; auth via JWT (passport-jwt).
2. **API → AI**: `AiModule` (`ai.controller.ts`) receives chat/upload/query, delegates to `ai.service.ts`.
3. **AI Service**: Ingests documents (loader → chunker → embedder → ChromaDB), answers queries via hybrid retrieval + LLM generation with guardrails.
4. **Prisma → PostgreSQL**: All business entities (Firm, User, Matter, Client, Associate, Expense, Task, CaseDocument, AuditLog…).

## Key Design Decisions

- **Monorepo, not microservices yet** — `ai` is a separate process today; planned move to containerized deployment.
- **NestJS modules per domain** — `auth`, `matters`, `clients`, `case-documents`, `ai`, `expenses`, `hr`, `tasks`, `firms`, `mail`, `cloudinary`.
- **Role-based access** — `OWNER | ADMIN | ASSOCIATE` via `RolesGuard`.
- **RAG is matter-scoped** — queries/filters tied to `matterId`.
- **Prisma migrations** already initialized; seed via `npm run seed --workspace=api`.

## Running Locally

```bash
npm run dev                # concurrently api + web
npm run dev:api            # NestJS on PORT (default 4000)
npm run dev:web            # Next.js on 3000
# ai service: cd apps/ai && uv run python run.py api
```
