import type { PrismaClient } from "../generated/prisma/client";
import { tenantContext } from "../common/tenant-context";
import { createTenantExtension } from "./tenant.extension";

/**
 * Unit tests for the dark tenant extension.
 *
 * The extension must, for a firm-scoped caller:
 *  - run on a SEPARATE base client (never the extended client),
 *  - wrap the op in base.$transaction,
 *  - set_config('app.tenant_id', firmId, true) inside that transaction,
 *  - dispatch the operation on the transaction client's model delegate.
 *
 * Outside a tenant context (public routes, jobs that forgot to run()) and for
 * SUPER_ADMIN, everything passes through to the original query(args) without
 * opening a transaction.
 */
describe("createTenantExtension", () => {
  function makeTx(modelHandler?: jest.Mock) {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ v: "firm-1" }]),
      firm: {
        findMany: modelHandler ?? jest.fn().mockResolvedValue([{ id: "firm-1" }])
      }
    };
    return tx;
  }

  function makeBase(tx: ReturnType<typeof makeTx>) {
    const $transaction = jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx));
    return {
      $transaction,
      base: { $transaction } as unknown as PrismaClient
    };
  }

  const untouchedQuery = jest.fn(async () => ["passthrough"]);

  beforeEach(() => {
    untouchedQuery.mockClear();
  });

  it("passes through untouched outside any tenant context", async () => {
    const tx = makeTx();
    const { base, $transaction } = makeBase(tx);
    const ext = createTenantExtension(base);

    const result = await ext.query.$allOperations({
      model: "Firm",
      operation: "findMany",
      args: { take: 1 },
      query: untouchedQuery
    });

    expect(result).toEqual(["passthrough"]);
    expect(untouchedQuery).toHaveBeenCalledWith({ take: 1 });
    expect($transaction).not.toHaveBeenCalled();
  });

  it("passes through untouched for a SUPER_ADMIN (no tenant to pin)", async () => {
    const tx = makeTx();
    const { base, $transaction } = makeBase(tx);
    const ext = createTenantExtension(base);

    const result = await tenantContext.run(
      { firmId: null, userId: "u-root", isSuperAdmin: true },
      () =>
        ext.query.$allOperations({
          model: "Firm",
          operation: "findMany",
          args: {},
          query: untouchedQuery
        })
    );

    expect(result).toEqual(["passthrough"]);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("wraps scoped ops in a base transaction and sets app.tenant_id", async () => {
    const modelHandler = jest.fn().mockResolvedValue([{ id: "firm-1" }]);
    const tx = makeTx(modelHandler);
    const { base, $transaction } = makeBase(tx);
    const ext = createTenantExtension(base);

    const result = await tenantContext.run(
      { firmId: "firm-1", userId: "u-1", isSuperAdmin: false },
      () =>
        ext.query.$allOperations({
          model: "Firm",
          operation: "findMany",
          args: { take: 5 },
          query: untouchedQuery
        })
    );

    expect(result).toEqual([{ id: "firm-1" }]);
    expect(untouchedQuery).not.toHaveBeenCalled();
    expect($transaction).toHaveBeenCalledTimes(1);
    // set_config executed on the tx client before the model op
    const execOrder: string[] = [];
    tx.$executeRaw.mock.invocationCallOrder.forEach(() => execOrder.push("setconfig"));
    modelHandler.mock.invocationCallOrder.forEach(() => execOrder.push("model"));
    // simpler: both were called; set_config must come first
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(modelHandler).toHaveBeenCalledWith({ take: 5 });
    expect(Math.min(...tx.$executeRaw.mock.invocationCallOrder)).toBeLessThan(
      modelHandler.mock.invocationCallOrder[0]
    );
  });

  it("fails closed: non-SUPER_ADMIN with null firmId sets app.tenant_id to ''", async () => {
    const modelHandler = jest.fn().mockResolvedValue([]);
    const tx = makeTx(modelHandler);
    const { base } = makeBase(tx);
    const ext = createTenantExtension(base);

    await tenantContext.run(
      { firmId: null, userId: "u-2", isSuperAdmin: false },
      () =>
        ext.query.$allOperations({
          model: "Firm",
          operation: "findMany",
          args: {},
          query: untouchedQuery
        })
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    const setConfigCall = tx.$executeRaw.mock.calls[0];
    // tagged-template call: first arg is strings array, subsequent args are values
    const values = setConfigCall.slice(1);
    expect(values).toContain("");
    expect(modelHandler).toHaveBeenCalled();
  });

  it("re-dispatches $queryRaw on the tx client with positional parameters", async () => {
    const tx = makeTx();
    const { base } = makeBase(tx);
    const ext = createTenantExtension(base);

    const result = await tenantContext.run(
      { firmId: "firm-1", userId: "u-1", isSuperAdmin: false },
      () =>
        ext.query.$allOperations({
          operation: "$queryRaw",
          args: { strings: ["SELECT count(*)::int AS c FROM \"Firm\" WHERE name = ", ""], values: ["Acme"] },
          query: untouchedQuery
        })
    );

    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT count(*)::int AS c FROM "Firm" WHERE name = $1',
      "Acme"
    );
    expect(result).toEqual([{ v: "firm-1" }]);
  });

  it("fails closed instead of running raw SQL unscoped when the arg shape is unexpected", async () => {
    const tx = makeTx();
    const { base } = makeBase(tx);
    const ext = createTenantExtension(base);

    await expect(
      tenantContext.run({ firmId: "firm-1", userId: "u-1", isSuperAdmin: false }, () =>
        ext.query.$allOperations({
          operation: "$queryRaw",
          args: "SELECT 1",
          query: untouchedQuery
        })
      )
    ).rejects.toThrow(/unexpected arg shape/i);
    expect(untouchedQuery).not.toHaveBeenCalled();
    expect(tx.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("fails closed instead of running a model op with no delegate", async () => {
    const tx = makeTx(); // only `firm` delegate exists
    const { base } = makeBase(tx);
    const ext = createTenantExtension(base);

    await expect(
      tenantContext.run({ firmId: "firm-1", userId: "u-1", isSuperAdmin: false }, () =>
        ext.query.$allOperations({
          model: "Matter",
          operation: "findMany",
          args: {},
          query: untouchedQuery
        })
      )
    ).rejects.toThrow(/no handler/i);
    expect(untouchedQuery).not.toHaveBeenCalled();
  });
});
