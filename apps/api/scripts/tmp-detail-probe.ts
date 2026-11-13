import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "detail-probe",
  query: {
    $allOperations: async (params: any) => {
      const internal = params.__internalParams ?? {};
      const tx = internal.transaction;
      console.log(`op=${params.operation} model=${params.model ?? "-"} hasTx=${!!tx} txId=${tx?.id ?? "none"}`);
      return params.query(params.args);
    }
  },
  client: {
    $transaction(this: any, cb: any, opts?: any) {
      console.log("client.$transaction override invoked");
      return base.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.probe_marker', 'outer-tx', true)`;
        return cb(tx);
      }, opts);
    }
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  const out = await tenantContext.run({ firmId: "detail", userId: "u", isSuperAdmin: false }, () =>
    extended.$transaction(async (tx: any) => {
      console.log("--- inside callback, calling tx.$queryRaw ---");
      const rows = await tx.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
      console.log("marker via tx.$queryRaw:", JSON.stringify(rows[0]?.v));
      console.log("--- inside callback, calling extended.$queryRaw ---");
      const rows2 = await extended.$queryRaw`SELECT current_setting('app.probe_marker', true) AS v`;
      console.log("marker via extended.$queryRaw:", JSON.stringify(rows2[0]?.v));
      return rows[0]?.v ?? null;
    })
  );
  console.log("final:", out);
  await base.$disconnect();
}
main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
