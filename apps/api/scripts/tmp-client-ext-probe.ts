import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantContext } from "../src/common/tenant-context";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) { console.error("No DB url"); process.exit(2); }

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const probe = {
  name: "client-ext-probe",
  query: {
    $allOperations: async (params: any) => {
      const internal = params.__internalParams ?? {};
      console.log(`   op=${params.operation} model=${params.model ?? "-"} internal.transaction=${internal.transaction ? JSON.stringify({ id: internal.transaction.id, kind: internal.transaction.kind ?? internal.transaction.constructor?.name }) : "none"}`);
      return params.query(params.args);
    }
  },
  client: {
    $transaction(this: any, ...args: any[]) {
      console.log("client.$transaction override invoked, args.length =", args.length, "types:", args.map((a) => typeof a));
      const [first, ...rest] = args;
      // try returning the real implementation: call base.$transaction? can't reach it here yet — inspect `this`
      console.log("   this keys:", this ? Object.getOwnPropertyNames(this).slice(0, 12) : "none");
      return base.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', 'via-client-ext', true)`;
        if (typeof first === "function") return first(tx);
        return first;
      }, ...rest);
    }
  }
};

async function main() {
  const extended: any = base.$extends(probe as never);
  try {
    const out = await tenantContext.run({ firmId: "client-ext", userId: "u", isSuperAdmin: false }, () =>
      extended.$transaction(async (tx: any) => {
        const rows = await tx.$queryRaw`SELECT current_setting('app.tenant_id', true) AS v`;
        return rows[0].v;
      })
    );
    console.log("OK tenant sees:", JSON.stringify(out));
  } catch (e) {
    console.log("FAILED:", e instanceof Error ? `${e.name}: ${e.message}` : e);
  }
  await base.$disconnect();
}

main().catch((e) => { console.error(e instanceof Error ? `${e.name}: ${e.message}` : e); process.exit(2); });
