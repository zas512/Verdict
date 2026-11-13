import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }
const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "detect3",
  query: { $allOperations: async (params: any) => params.query(params.args) },
  client: {
    $transaction(this: any, cb: any, opts?: any) {
      console.log(">>> client.$transaction override fired; nesting detection via ALS");
      return base.$transaction(async (tx) => {
        return tenantContext.run({ firmId: "d", userId: "u", isSuperAdmin: false, inItxDepth: 1 } as any, () => cb(tx));
      }, opts);
    }
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  await tenantContext.run({ firmId: "d", userId: "u", isSuperAdmin: false }, async () =>
    extended.$transaction(async (tx: any) => tx.$queryRaw`SELECT 1`)
  );
  await base.$disconnect();
}
main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
