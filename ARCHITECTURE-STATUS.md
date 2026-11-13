# Architecture status — Legal CRM (Verdict)

Single source of truth for blueprint ↔ code progress. Read this first; update it at the end of every architecture session. Mirror for Claude sessions: `memory/architecture-roadmap.md`.

Blueprint: [`ARCHITECTURE.md`](ARCHITECTURE.md) v1.0 (12 Nov 2026). Its §5.9–17 are a reconstruction marked *draft for review*; anything tagged **VERIFY** needs counsel before shipping as a default.

**Last updated:** 2026-11-13 (Phase 0 complete; Phase 1: plumbing + TenantGuard + PermissionGuard landed; finance-domain @Permissions rollout committed 78df959/0592163; tenant extension rewritten for nested-itx semantics and smoke-verified 11/11 against the live DB; open problem #4 resolved; RLS still blocked on #2 app role).

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
| Prisma extension: per-request `$transaction` + `set_config('app.tenant_id')` on a separate base client | **Added — `src/prisma/tenant.extension.ts` (commit 98bee02, rewritten 2026-11-13), DARK, not wired into PrismaService/AppModule.** Smoke-verified against the live DB: `npm run smoke:tenant-extension` → **11/11 pass (read-only)**, including nested-itx semantics. Open problem #4 is **resolved by design** (2026-11-13): Prisma 7 extension callbacks receive `__internalParams.transaction.kind === 'itx'`; the extension now (a) overrides the client-level `$transaction` so the OUTER itx is pinned on a base-client transaction, (b) passes through ops dispatched on `tx` (kind `itx`) to the ambient itx, and (c) keeps opening its own pinned base itx for root-style ops. The array form of `$transaction` is rejected in tenant scope (fail closed); no app call site uses it. All 14 `prisma.$transaction(cb)` call sites dispatch their work exclusively on the `tx` argument (no `this.prisma.*` inside callbacks — verified 2026-11-13), so wiring the extension into PrismaService no longer changes semantics for them. Remaining wiring blockers are #2 (non-owner `verdict_app` role) and #3 (SUPER_ADMIN policy), plus a product decision on the connection-string split.
| Guard order JwtAuth → Tenant → Permission → MatterAccess | Throttler → AccessToken → Tenant → Roles → Permission global (AppModule); PermissionGuard landed (additive/dark: no @Permissions → pass; AND semantics; role bundles in `modules/auth/permissions.ts`). Registered globally, not in blueprint order — after Roles is harmless since both are additive; blueprint order is the target when MatterAccessGuard lands. |
| PermissionGuard @Permissions rollout | **Partial — finance domain only**, committed in 78df959 + 0592163 (working tree carries only this status doc): `permissions.ts` taxonomy + `ROLE_PERMISSIONS` (4 DB roles; ADMIN = finance.read/post/export, ASSOCIATE = matter/hearing/document bundle, OWNER/SUPER_ADMIN = all); `@Permissions("finance.read")` at class + `"finance.read","finance.post"` on write handlers across `expenses`, `fixed-expenses`, `manual-expenses`, `recurring-expenses` controllers. tsc clean; jest 51/51 ✔ |
| Permission taxonomy gaps | Blueprint roles PARTNER/JUNIOR/CLERK/ACCOUNTANT/CLIENT don't exist in the schema — extending UserRole is a schema decision (ask first). `finance.approve`, `finance.export` (export not wired to any handler yet), `document.share`, `matter.manage`, `audit.read`, `settings.manage`, `rules.manage` are declared but unused. |
| Matter-domain annotations | **Not started; ambiguity recorded**: blueprint §4.3/§9.1 treat `matter.manage` as the ADMIN-level capability, but the code comment in `permissions.ts` asserts ADMINs must not reach matters — so mapping matter/hearing/document handlers onto the taxonomy needs a product decision before annotating. Matters/hearings/tasks/case-documents stay dark until then. |
| MatterAccess (READ/WRITE/MANAGE) + RESTRICTED confidentiality | Not started; Matter carries no `confidentiality` yet |
| Refresh-token rotation families + reuse detection + Session table | Not started (schema + `issueAndPersistTokens` rework). Blueprint §5.4 `Session`, §11.2 |
| Money/capture IdempotencyInterceptor | **Not started**, blocked on open problem #8 (needs a new model/migration). Registered order (blueprint §9.1): after auth/permission, before handler.
| Audit partitioning by month | Not started |
| OutboxEvent table | Not started (blueprint §5.4) |

## Open problems (explicit, not hidden)

1. **`tenantId` vs `firmId`.** Blueprint models `tenantId UUID`; code uses `firmId TEXT` everywhere (Firm is the tenant). Renaming is a big, risky migration; keeping the code name for now. RLS migration will use `"firmId"` and `current_setting('app.tenant_id')::text`. Decide before external/multi-tenant SaaS launch.
2. **App role.** Today Prisma connects as the schema owner; FORCE RLS does nothing for an owner with BYPASSRLS. Need a non-owner `verdict_app` role (or `NOBYPASSRLS`) + connection string split. Not yet provisioned; verification pending.
3. **SUPER_ADMIN.** `firmId = NULL` on platform admins. Policy `"firmId" = current_setting(...)` would hide all rows from them. Draft uses `(current_setting('app.is_superadmin', true) = 'true' OR ...)`; superadmin path must also bypass `set_config` requirement or set a sentinel.
4. **Prisma 7 extension recursion / itx semantics.** Resolved 2026-11-13. `$extends` query wrappers still must run on a separate unextended base client. Additionally, extension callbacks expose `__internalParams.transaction.kind === 'itx'`, which identifies ops dispatched on a transaction client. The extension uses that signal plus a client-level `$transaction` override (pins the outer itx; rejects the array form in tenant scope) to make nested/service transactions safe. Live probes (read-only, removed after) confirmed: `tx.*` ops carry `kind=itx` with a shared transaction id; root-style `extended.*` ops from inside a callback carry `kind=none` and still get their own pinned base itx; no setting leaks onto the base pool. Unit suite 62/62 ✔; smoke 11/11 ✔.
5. **Global seed tables** (Forum, CaseType, … in blueprint §6.1) don't exist yet in code schema; RLS draft only covers existing `firmId` tables.
6. **CI drift check** needs a `DATABASE_URL` secret with a migrated DB; without it the step is skipped (exit 0 with warning). It never silently "passes".
7. **`matter.manage` semantics.** Which role(s) hold it, and whether ADMINs may read matters, is undecided in code. Blocks annotating matters/hearings/documents/tasks. Do not annotate until resolved.
8. **Idempotency storage.** Blueprint §9.1 wants `Idempotency-Key` (UUID) on money/capture POSTs with replay returning the stored response and 409 on key reuse with a different body. Confirmed 2026-11-13: `clientRequestId @unique` exists only in the blueprint (line ~738) — not in `prisma/schema.prisma` — and is scoped to the offline hearing-capture outbox, not a general money-endpoint cache. A general idempotency store therefore needs a new model, e.g. `IdempotencyRecord(firmId, key, requestHash, responseStatus, responseBody, createdAt, @@unique([firmId, key]))`. That's a migration — same class of decision as RLS (schema change); confirm before generating. Interim, non-migration option: implement the interceptor + in-memory/dev-only store dark behind a flag, which is not production-safe (replay correctness needs durability).

## Rollout discipline

Additive phases; feature flags per tenant; rollback = flag off. Phase 1 ships plumbing dark, then a migration enabling RLS in **staging → prod**, with the ratchet test green before enabling.
