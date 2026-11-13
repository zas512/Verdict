import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "shadow-probe",
  query: {
    $allOperations: async (params: any) => params.query(params.args)
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  const original = extended.$transaction?.bind(extended);
  console.log("extended.$transaction type:", typeof extended.$transaction);
  let shadowWorked = false;
  try {
    extended.$transaction = function (arg: any, opts?: any) {
      shadowWorked = true;
      if (Array.isArray(arg)) return original(arg, opts);
      return original(async (tx: any) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', 'shadow-firm', true)`;
        await tx.$executeRaw`SELECT set_config('app.is_superadmin', 'false', true)`;
        return arg(tx);
      }, opts);
    };
    const out = await tenantContext.run({ firmId: "shadow-firm", userId: "u", isSuperAdmin: false }, () =>
      extended.$transaction(async (tx: any) => {
        const rows = await tx.$queryRaw`SELECT current_setting('app.tenant_id', true) AS v`;
        return rows[0].v;
      })
    );
    console.log("shadow assignment accepted:", shadowWorked, "| inside itx, tenant sees:", JSON.stringify(out));
  } catch (e) {
    console.log("shadow assignment FAILED:", e instanceof Error ? `${e.name}: ${e.message}` : e);
  }
  await base.$disconnect();
}

main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
