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

  await plain.$disconnect();
  await base.$disconnect();

  console.log(failures === 0 ? "\nAll smoke checks passed (read-only)." : `\n${failures} smoke check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test errored:", err);
  process.exit(2);
});
