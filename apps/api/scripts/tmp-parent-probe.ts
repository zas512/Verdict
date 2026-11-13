import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "parent-probe",
  query: {
    $allOperations: async (params: any & { getExtensionContext?: any }) => {
      // try to reach the outer context via the module-level export
      const ctx = (Prisma as any).getExtensionContext?.(params ?? {});
      const keys = ctx ? Object.keys(ctx) : [];
      const model = params.model ?? "(raw)";
      console.log(`op=${model}.${params.operation} extensionContextKeys=${JSON.stringify(keys)} hasTx=${!!ctx?.$transaction}`);
      if (ctx?.$transaction) {
        try {
          const rows = await ctx.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
          console.log("   ctx.$queryRaw marker =", JSON.stringify(rows));
        } catch (e) {
          console.log("   ctx.$queryRaw failed:", e instanceof Error ? e.message : e);
        }
      }
      return params.query(params.args);
    }
  }
};
const extended = base.$extends(probe as never);

async function main() {
  // set marker inside outer itx, then read it back from a nested op
  const result = await tenantContext.run({ firmId: "p", userId: "p", isSuperAdmin: false }, async () =>
    extended.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT set_config('app.probe_marker', 'outer', true)`;
      const rows = await tx.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
      return rows;
    })
  );
  console.log("outer marker readback:", JSON.stringify(result));
  await base.$disconnect();
}

main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}\n${e.stack}` : e); process.exit(2); });
