import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";
import { createTenantExtension } from "../src/prisma/tenant.extension";

/**
 * READ-ONLY smoke test for the tenant extension (open problem #4).
 *
 * Run from apps/api/:  npx tsx scripts/smoke-tenant-extension.ts
 *
 * Verifies, against the REAL database:
 *   1. set_config('app.tenant_id', …, true) inside a transaction propagates
 *      within that transaction.
 *   2. The setting does NOT leak outside the transaction (pooled connections
 *      stay clean).
 *   3. An operation through the tenant extension sees app.tenant_id inside its
 *      own transaction (the firmId we ran with).
 *   4. Outside tenantContext, the extension passes through (no set_config).
 *   5. A raw op through the extension returns the pinned tenant id.
 *   6. SUPER_ADMIN passes through without pinning.
 *   7. The outer interactive transaction from `extended.$transaction(cb)` runs
 *      with the tenant pinned (ops via `tx` join it).
 *   8. A model op inside `extended.$transaction(cb)` works — no re-dispatch /
 *      double-wrap breakage.
 *   9. A root-style `extended.*` op from INSIDE a callback is still pinned
 *      (it opens its own short-lived base itx — atomicity with the outer
 *      transaction is not guaranteed, but RLS isolation still holds).
 *  10. The array form of `$transaction` is rejected in tenant scope (it has
 *      no callback in which the pin can be applied).
 *
 * Makes NO writes, NO schema changes. set_config with is_local = true is
 * transaction-scoped and vanishes on commit.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DIRECT_URL/DATABASE_URL not set");
  process.exit(2);
}

function newClient() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function main() {
  let failures = 0;
  const check = (label: string, ok: boolean, detail?: unknown) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail !== undefined ? `  [${JSON.stringify(detail)}]` : ""}`);
    if (!ok) failures += 1;
  };

  const plain = newClient();

  // 1. set_config inside a tx is visible inside it
  await plain.$transaction(async (tx) => {
    const raw = await tx.$executeRaw`SELECT set_config('app.tenant_id', 'smoke-firm-1', true)`;
    const rows = await tx.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`;
    check("set_config propagates inside the transaction", rows[0]?.v === "smoke-firm-1", { returned: raw, v: rows[0]?.v });
  });

  // 2. no leak outside the transaction
  const after = await plain.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`;
  check("setting does NOT leak outside the transaction", (after[0]?.v ?? "") === "", { v: after[0]?.v });

  // 3/4/5. the extension path
  const base = newClient();
  const extended = base.$extends(createTenantExtension(base));

  // NOTE: PrismaPromise is lazy and executes at await time, so the await
  // must happen INSIDE the tenantContext.run scope, otherwise the extension
  // callback runs after the ALS store is gone and passes through unpinned.
  const scoped = await tenantContext.run(
    { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
    async () => extended.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`
  );
  check("raw op through the extension sees the pinned tenant id", scoped[0]?.v === "smoke-firm-1", { v: scoped[0]?.v });

  const unscoped = await tenantContext.run(
    { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
    async () => undefined
  ).then(() => extended.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`);
  check("raw op outside tenant context runs WITHOUT set_config", (unscoped[0]?.v ?? "") === "", { v: unscoped[0]?.v });

  const scopedModel = await tenantContext.run(
    { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
    async () => extended.firm.findMany({ take: 1, select: { id: true } })
  );
  check("model op through the extension returns without recursion/hang", Array.isArray(scopedModel));

  // 6. superadmin passthrough leaves the setting untouched
  const sa = await tenantContext.run(
    { firmId: null, userId: "smoke-root", isSuperAdmin: true },
    async () => extended.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`
  );
  check("SUPER_ADMIN passes through without pinning", (sa[0]?.v ?? "") === "", { v: sa[0]?.v });

  // 7. the outer itx from `extended.$transaction(cb)` is itself pinned
  const outerPinned = await tenantContext.run(
    { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
    async () =>
      extended.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`;
        return rows[0]?.v;
      })
  );
  check("outer $transaction callback runs with the tenant pinned", outerPinned === "smoke-firm-1", { v: outerPinned });

  // 8. model op inside `extended.$transaction(cb)` (tx client) works and is read through the itx
  const inItx = await tenantContext.run(
    { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
    async () =>
      extended.$transaction(async (tx) => tx.firm.findMany({ take: 1, select: { id: true } }))
  );
  check("model op inside extended.$transaction returns", Array.isArray(inItx));

  // 9. root-style op from inside a callback is still pinned (own short-lived base itx)
  const rootInCb = await tenantContext.run(
    { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
    async () =>
      extended.$transaction(async () => {
        const rows = await extended.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`;
        return rows[0]?.v;
      })
  );
  check("root-style extended.* op inside a callback is still tenant-pinned", rootInCb === "smoke-firm-1", { v: rootInCb });

  // 10. array-form $transaction rejected in tenant scope (fail closed)
  let arrayErr: string | null = null;
  try {
    await tenantContext.run(
      { firmId: "smoke-firm-1", userId: "smoke-user", isSuperAdmin: false },
      () => extended.$transaction([extended.firm.findMany({ take: 1 })])
    );
  } catch (e) {
    arrayErr = e instanceof Error ? e.message : String(e);
  }
  check("array-form $transaction rejected in tenant scope", !!arrayErr && arrayErr.includes("array form"), { err: arrayErr });

  // no tenant pin leaked on the base pool after all of the above
  const leak = await base.$queryRaw<[{ v: string | null }]>`SELECT current_setting('app.tenant_id', true) AS v`;
  check("setting does NOT leak onto the base pool", (leak[0]?.v ?? "") === "", { v: leak[0]?.v });

  await plain.$disconnect();
  await base.$disconnect();

  console.log(failures === 0 ? "\nAll smoke checks passed (read-only)." : `\n${failures} smoke check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test errored:", err);
  process.exit(2);
});
