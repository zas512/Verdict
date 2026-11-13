import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "ambient-probe",
  query: {
    $allOperations: async (params: any) => {
      // If params.query(args) honours the ambient itx, the marker set inside
      // the callback is visible here -> returns 'ambient-ok'.
      const rows = await params.query({
        ...params.args,
        strings: ['SELECT current_setting(\'app.probe_marker\', true) AS v'],
        values: []
      });
      return rows;
    }
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  try {
    const out = await tenantContext.run({ firmId: "amb", userId: "u", isSuperAdmin: false }, () =>
      extended.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT set_config('app.probe_marker', 'ambient-ok', true)`;
        const rows = await tx.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
        return rows[0]?.v ?? null;
      })
    );
    console.log("final marker:", JSON.stringify(out));
  } catch (e) {
    console.log("FAILED:", e instanceof Error ? `${e.name}: ${e.message}` : e);
  }
  await base.$disconnect();
}
main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
