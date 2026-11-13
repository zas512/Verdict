# Architecture status — Legal CRM (Verdict)

Single source of truth for blueprint ↔ code progress. Read this first; update it at the end of every architecture session. Mirror for Claude sessions: `memory/architecture-roadmap.md`.

Blueprint: [`ARCHITECTURE.md`](ARCHITECTURE.md) v1.0 (12 Nov 2026). Its §5.9–17 are a reconstruction marked *draft for review*; anything tagged **VERIFY** needs counsel before shipping as a default.

**Last updated:** 2026-11-13 (Phase 0 complete; Phase 1 plumbing + TenantGuard landed dark; open problems + migration blockers re-verified against current HEAD).

## Phase 0 — Repair & alignment

| Item | State |
| --- | --- |
| Schema drift (Lead) | Done — commit 46a507e (Lead/LeadStatus/LeadSource added; `check:drift` script present) |
| Blueprint doc | Done — commit 47b6f2e (reconstruction notice in file) |
| `check:drift` | Present; **green 2026-11-12** (`migrate diff --from-config-datasource --to-schema` → "No difference detected") against the Supabase DB |
| CI (`.github/workflows/ci.yml`) | **Added** — `api` job: install, prisma generate, build, test, drift check (skips with warning if `secrets.DATABASE_URL` unset), RLS ratchet. `web` job: install, `next build` |
| RLS policy-test skeleton | **Added** — `apps/api/scripts/check-tenant-rls.mjs` + shrink-only `scripts/rls-baseline.json` (13 unprotected tables recorded). Verified pass/fail/stale-baseline paths. `--strict` is the Phase 1 end gate |

Phase 0 complete ✔. One pre-existing wrong test expectation fixed (`app.security.spec.ts` SUPER_ADMIN registration now expects 400 — `forbidNonWhitelisted` rejects the body before any 403 can arise). It was failing before this session's changes (verified on stashed HEAD).

## Phase 1 — Tenancy & access hardening (in progress)

| Item | State |
| --- | --- |
| AsyncLocalStorage tenant context + interceptor (additive plumbing, no enforcement) | **Added dark** — `common/tenant-context.ts` + global `TenantContextInterceptor`, registered in AppModule ahead of LoggingInterceptor; unit tests in `src/tenant-context.spec.ts` (4 tests, green). Full suite 31/31 ✔ |
| TenantGuard (JwtAuth → Tenant → Permission) | **Added** — global guard after RolesGuard (`modules/auth/guards/tenant.guard.ts`); skips `@Public()`; SUPER_ADMIN (firmId null) passes, non-SUPER_ADMIN with null firmId → 403; registered globally in AppModule; unit tests `src/modules/auth/guards/tenant.guard.spec.ts` (8 tests, green); e2e wiring stays 39/39 ✔ |
| RLS design draft | **Added** — `apps/api/docs/drafts/tenant-rls.sql` (NOT applied, NOT in `migrations/`) |
| Migration: ENABLE/FORCE RLS + `tenant_isolation` policy on every `firmId` table | **Blocked** by "Open problems" #1/#2 — needs app role + id-type decision |
| Prisma extension: per-request `$transaction` + `set_config('app.tenant_id')` on a separate base client | Design only; must be verified against a real DB before any RLS migration lands. Recursion trap: extended client must delegate to an unextended base |
| Guard order JwtAuth → Tenant → Permission → MatterAccess | Throttler → AccessToken → Roles → Tenant already global (AppModule); Permission guard still absent (next step); still additive |
| MatterAccess (READ/WRITE/MANAGE) + RESTRICTED confidentiality | Not started; Matter carries no `confidentiality` yet |
| Refresh-token rotation families + reuse detection + Session table | Not started (schema + `issueAndPersistTokens` rework). Blueprint §5.4 `Session`, §11.2 |
| Idempotency-Interceptor on money/capture endpoints | Not started |
| Audit partitioning by month | Not started |
| OutboxEvent table | Not started (blueprint §5.4) |

## Open problems (explicit, not hidden)

1. **`tenantId` vs `firmId`.** Blueprint models `tenantId UUID`; code uses `firmId TEXT` everywhere (Firm is the tenant). Renaming is a big, risky migration; keeping the code name for now. RLS migration will use `"firmId"` and `current_setting('app.tenant_id')::text`. Decide before external/multi-tenant SaaS launch.
2. **App role.** Today Prisma connects as the schema owner; FORCE RLS does nothing for an owner with BYPASSRLS. Need a non-owner `verdict_app` role (or `NOBYPASSRLS`) + connection string split. Not yet provisioned; verification pending.
3. **SUPER_ADMIN.** `firmId = NULL` on platform admins. Policy `"firmId" = current_setting(...)` would hide all rows from them. Draft uses `(current_setting('app.is_superadmin', true) = 'true' OR ...)`; superadmin path must also bypass `set_config` requirement or set a sentinel.
4. **Prisma 7 extension recursion.** `$extends` query wrappers must run on a separate `new PrismaClient`, never on the extended `this`. Must be smoke-tested against a real DB before the RLS migration is generated; otherwise fail-closed at role level, not app level.
5. **Global seed tables** (Forum, CaseType, … in blueprint §6.1) don't exist yet in code schema; RLS draft only covers existing `firmId` tables.
6. **CI drift check** needs a `DATABASE_URL` secret with a migrated DB; without it the step is skipped (exit 0 with warning). It never silently "passes".

## Rollout discipline

Additive phases; feature flags per tenant; rollback = flag off. Phase 1 ships plumbing dark, then a migration enabling RLS in **staging → prod**, with the ratchet test green before enabling.
