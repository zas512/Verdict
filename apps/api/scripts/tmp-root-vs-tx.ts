import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "root-vs-tx",
  query: {
    $allOperations: async (params: any) => {
      // unconditionally pass through; then we can see where params.query runs
      return params.query(params.args);
    }
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  const out = await tenantContext.run({ firmId: "x", userId: "u", isSuperAdmin: false }, () =>
    extended.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT set_config('app.probe_marker', 'outer-tx', true)`;
      const viaTx = await tx.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
      let viaRoot: any = null;
      try {
        viaRoot = await extended.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
      } catch (e) {
        viaRoot = `ERR: ${e instanceof Error ? e.message : e}`;
      }
      return { viaTx: viaTx[0]?.v ?? null, viaRoot: viaRoot[0]?.v ?? viaRoot };
    })
  );
  console.log(JSON.stringify(out));
  await base.$disconnect();
}
main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
