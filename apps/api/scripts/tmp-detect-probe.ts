import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }
const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

let stack = "";
const probe = {
  name: "detect-probe",
  query: {
    $allOperations: async (params: any) => {
      stack = new Error().stack ?? "";
      console.log("=== op", params.operation, "model", params.model ?? "-");
      console.log(stack.split("\n").filter((l: string) => /node_modules\/@prisma|src\//.test(l) && !/node_modules\/@prisma\/client\/runtime\/(client|getPrismaClient)/.test(l)).slice(0, 8).map((l: string) => l.trim().slice(0, 200)).join("\n"));
      return params.query(params.args);
    }
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  await tenantContext.run({ firmId: "d", userId: "u", isSuperAdmin: false }, async () =>
    extended.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT 1`;
    })
  );
  await base.$disconnect();
}
main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
