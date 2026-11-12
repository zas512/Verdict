-- DRAFT — NOT FOR APPLICATION YET. Not in prisma/migrations/.
-- Phase 1 design for tenant row-level security. See ARCHITECTURE-STATUS.md,
-- "Open problems" #1–#4. Apply only after:
--   (a) the Prisma client extension wraps every request in a transaction and
--       runs set_config('app.tenant_id', ...) on a SEPARATE base client,
--   (b) a non-owner role `verdict_app` exists (NOBYPASSRLS, no table ownership)
--       and DATABASE_URL for runtime uses it,
--   (c) staging verification matrix passes (cross-tenant read/write rejected,
--       SUPER_ADMIN path verified, unauthenticated app role sees nothing).
--
-- Code key today is "firmId" (TEXT), not the blueprint's tenantId (UUID).
-- The policy compares text to text; if a rename happens later, only the
-- column cast in the policy changes.

-- 0. NOLOGIN roles so the migration is idempotent and the app can SET ROLE.
--    (In practice: create role verdict_app NOBYPASSRLS LOGIN via infra, not SQL here.)

-- 1. Helper: tenant predicate. NULLIF guards against missing/empty setting,
--    which must match ZERO rows (fail closed).
CREATE OR REPLACE FUNCTION app_current_firm() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_is_superadmin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.is_superadmin', true) = 'true', false)
$$;

-- 2. Direct firmId tables (from prisma/schema.prisma, 12 Nov 2026).
--    Child tables without firmId inherit protection via their parent's policy
--    ONLY after we add matching policies or foreign-key-based checks; they are
--    listed as a follow-up in ARCHITECTURE-STATUS.md, not silently trusted.
DO $$
DECLARE
  t text;
  firm_tables text[] := ARRAY[
    'User', 'FirmInvite', 'Associate', 'LeaveType', 'Expense',
    'RecurringExpenseTemplate', 'CourtStage', 'Matter', 'Party',
    'Task', 'AuditLog', 'Client', 'Lead'
  ];
BEGIN
  FOREACH t IN ARRAY firm_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
        USING (app_is_superadmin() OR "firmId" = app_current_firm())
        WITH CHECK (app_is_superadmin() OR "firmId" = app_current_firm())
    $p$, t);
  END LOOP;
END $$;

-- 3. Tables with NULLABLE firmId (CourtStage, User, FirmInvite):
--    "firmId IS NULL" rows are system/global rows (CourtStage system defaults,
--    SUPER_ADMIN users). Decide before applying:
--      Option A (recommended): separate policies — global rows readable by all,
--                              writable only via app_is_superadmin().
--      Option B: move global rows to dedicated tables (blueprint §6.1).
--    Draft below implements Option A; adjust after counsel/product sign-off.

-- CourtStage: system defaults (firmId null) are world-readable, firm-specific copies tenant-scoped.
DROP POLICY IF EXISTS court_stage_global_read ON "CourtStage";
CREATE POLICY court_stage_global_read ON "CourtStage"
  FOR SELECT USING ("firmId" IS NULL OR app_is_superadmin() OR "firmId" = app_current_firm());
-- (tenant_isolation from the loop above must be replaced by the split policies for CourtStage; kept here for review.)

-- 4. FORCE semantics reminder:
--    Table OWNER bypasses RLS unless FORCE ROW LEVEL SECURITY is set on every
--    table. The app connection MUST NOT use the migrating/owner role.

-- 5. Verification (run as verdict_app, never as owner):
--    BEGIN;
--    SELECT set_config('app.tenant_id', '<firm-a-id>', true);
--    SELECT count(*) FROM "Matter";               -- must not see firm-b rows
--    INSERT INTO "Matter"(firm_id, ...) VALUES ('<firm-b-id>', ...);  -- must ERROR
--    ROLLBACK;
--    SELECT set_config('app.tenant_id', '', true); -- empty => 0 rows, no error

-- 6. Out of scope / follow-up:
--    - Attendance, LeaveRequest, LeaveBalance, MatterParty, MatterAssociate,
--      Hearing, HearingAttendee, TaskAssignee, TaskNote, TaskAttachment,
--      CaseDocument, CaseDocumentVersion, MatterParty: no firmId column today.
--      Either add a denormalized firmId (preferred, indexed) in the Phase 2
--      schema work, or write policies joining the parent. Do NOT ship RLS on
--      direct-firmId tables and call tenant isolation "done" while children leak.
