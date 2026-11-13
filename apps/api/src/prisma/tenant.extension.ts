import type { PrismaClient } from "../generated/prisma/client";
import { tenantContext } from "../common/tenant-context";

/**
 * Prisma client extension (Phase 1 — DARK, not wired into AppModule yet).
 *
 * Purpose: when a request/job runs inside a tenant context, every database
 * operation executes inside a transaction on a SEPARATE, UNEXTENDED base
 * client with `set_config('app.tenant_id', firmId, true)` applied there. The
 * setting is transaction-local, so it never leaks to a pooled connection.
 *
 * Two cooperating pieces:
 *
 *  1. Client-level `$transaction` override. Services call
 *     `prisma.$transaction(cb)` to group writes. That override pins the tenant
 *     on the OUTER interactive transaction and runs the callback against the
 *     base client's itx. Without this, every service transaction would pin
 *     nothing, and the ops inside it would see an empty `app.tenant_id` and
 *     match zero rows once RLS is enforced.
 *
 *  2. Query-level `$allOperations` wrapper. When the operation is dispatched
 *     on the transaction client (`tx.*` inside a callback), Prisma 7 exposes
 *     `__internalParams.transaction.kind === 'itx'`; the wrapper then simply
 *     passes through to the ambient itx (which the client override pinned).
 *     Anything else runs in its OWN short-lived pinned base transaction, as
 *     before.
 *
 * Why a separate base client: calling an extended client from inside its own
 * extension (the "extended this" trap, ARCHITECTURE-STATUS open problem #4)
 * double-wraps every query and can recurse. `query(args)` is bound to the
 * pre-extension chain, so it would run OUTSIDE the transaction — the base
 * client passed here is the only safe execution target.
 *
 * Caveats (all intentional, documented in ARCHITECTURE-STATUS.md):
 *  - Ops dispatched on the transaction client inside a service callback
 *    (`tx.x`, Prisma 7 reports `__internalParams.transaction.kind === 'itx'`)
 *    join the outer itx and rely on the client-level $transaction override
 *    for their pin. This is the supported pattern; every `$transaction`
 *    call site in this repository follows it (verified 2026-11-13).
 *
 *  - Root-style calls from inside a service callback (e.g. `this.prisma.x`
 *    instead of `tx.x` inside `prisma.$transaction(tx => …)`) do NOT join the
 *    outer itx; Prisma dispatches them to a separate implicit transaction.
 *    They still resolve through this wrapper and run in their own pinned
 *    base itx, so tenant isolation holds — only atomicity with the outer
 *    transaction is lost (this has always been Prisma's behaviour). No call
 *    site in this repository does this today (verified 2026-11-13).
 *  - The array form of `$transaction` has no callback in which to pin the
 *    setting, so it is rejected outright in a tenant scope. No call site in
 *    this repository uses it (verified 2026-11-13).
 *  - Nested interactive transactions are not supported by Prisma; if they
 *    appear, ops inside the nested callback carry `kind === 'itx'` and join
 *    whichever transaction the runtime hands out.
 *  - Raw queries ($queryRaw / $executeRaw) on the base path are re-dispatched
 *    as raw SQL with positional `$n` parameters reconstructed from the Sql
 *    object. If the shape isn't what we expect, raw runs on the tx WITHOUT
 *    the tenant setting would be unsafe — so we fail closed (throw) instead.
 *    Raw ops dispatched on `tx` pass through with their original Sql object.
 *  - SUPER_ADMIN (isSuperAdmin) and missing context pass through unchanged:
 *    the RLS migration (apps/api/docs/drafts/tenant-rls.sql) decides what
 *    they may see, this extension only sets the context signal.
 *  - Fail-closed: a non-SUPER_ADMIN context with a null firmId runs with
 *    app.tenant_id = '' which matches ZERO rows under the RLS draft.
 */

interface SqlLike {
  strings: string[];
  values: unknown[];
}

interface InternalParams {
  transaction?: { kind?: string; id?: string } | undefined;
}

interface AllOperationsArgs {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
  /** Undocumented Prisma 7 runtime params; may be absent on future versions. */
  __internalParams?: InternalParams | undefined;
}

interface TransactionOptions {
  isolationLevel?: string;
  maxWait?: number;
  timeout?: number;
}

function isSqlLike(value: unknown): value is SqlLike {
  if (!value || typeof value !== "object") return false;
  const v = value as SqlLike;
  return Array.isArray(v.strings) && Array.isArray(v.values);
}

function delegateKey(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function positionalSql(sql: SqlLike): { text: string; values: unknown[] } {
  let text = "";
  for (let i = 0; i < sql.strings.length; i += 1) {
    text += sql.strings[i];
    if (i < sql.values.length) {
      text += `$${i + 1}`;
    }
  }
  return { text, values: sql.values };
}

/**
 * Runs `fn` inside a base-client itx with the tenant pinned, or unpinned when
 * the caller is a SUPER_ADMIN / outside a tenant context. Shared by the outer
 * `$transaction` override and the per-op base path.
 */
function withTenantPin(
  base: PrismaClient,
  opts: TransactionOptions | undefined,
  fn: (tx: unknown) => Promise<unknown>
): Promise<unknown> {
  const ctx = tenantContext.getStore();
  if (!ctx || ctx.isSuperAdmin) {
    return base.$transaction(fn as never, opts as never);
  }
  const firmId = ctx.firmId ?? "";
  return base.$transaction(async (tx) => {
    const t = tx as unknown as {
      $executeRawUnsafe: (text: string, ...values: unknown[]) => Promise<unknown>;
    };
    await t.$executeRawUnsafe("SELECT set_config('app.tenant_id', $1, true)", firmId);
    await t.$executeRawUnsafe("SELECT set_config('app.is_superadmin', 'false', true)");
    return fn(tx);
  }, opts as never);
}

export interface TenantExtensionShape {
  query: {
    $allOperations: (params: AllOperationsArgs) => Promise<unknown>;
  };
  client: {
    $transaction: (...args: unknown[]) => Promise<unknown>;
  };
}

/**
 * Builds the extension definition. `base` MUST be an unextended PrismaClient.
 */
export function createTenantExtension(base: PrismaClient): TenantExtensionShape {
  return {
    query: {
      $allOperations: async (params: AllOperationsArgs) => {
        const { model, operation, args, query, __internalParams } = params;
        const ctx = tenantContext.getStore();

        // Outside a request/job, or an unauthenticated public request: no
        // tenant to pin. Pass through (RLS, once enabled, still applies at
        // the database level for the connecting role).
        if (!ctx || ctx.isSuperAdmin) {
          return query(args);
        }

        // Dispatched on the transaction client inside a callback that already
        // ran through the client-level $transaction override (or on some other
        // itx). Join the ambient transaction — its pin is already applied and
        // opening a second base itx here would break atomicity and visibility.
        if (__internalParams?.transaction?.kind === "itx") {
          return query(args);
        }

        const isRaw = operation === "$queryRaw" || operation === "$executeRaw";

        return withTenantPin(base, undefined, async (tx) => {
          if (isRaw) {
            if (!isSqlLike(args)) {
              throw new Error(
                "TenantExtension: raw operation received an unexpected arg shape; refusing to run it unscoped."
              );
            }
            const { text, values } = positionalSql(args);
            const t = tx as unknown as Record<
              "$queryRawUnsafe" | "$executeRawUnsafe",
              (text: string, ...values: unknown[]) => Promise<unknown>
            >;
            return operation === "$queryRaw"
              ? t.$queryRawUnsafe(text, ...values)
              : t.$executeRawUnsafe(text, ...values);
          }

          if (!model) {
            throw new Error(
              `TenantExtension: operation "${operation}" has no model; refusing to run it unscoped.`
            );
          }

          const delegate = (tx as unknown as Record<string, Record<string, (a: unknown) => Promise<unknown>>>)[
            delegateKey(model)
          ];
          const handler = delegate?.[operation];
          if (typeof handler !== "function") {
            throw new Error(
              `TenantExtension: no handler for ${delegateKey(model)}.${operation} on the transaction client.`
            );
          }
          return handler.call(delegate, args);
        }) as Promise<unknown>;
      }
    },
    client: {
      // Prisma dispatches `extended.$transaction(...)` to the `client` block.
      // `this` is the extended client, which we intentionally do NOT call.
      $transaction: function tenantExtensionTransaction(this: unknown, ...args: unknown[]) {
        const [first, second] = args;

        if (Array.isArray(first)) {
          const ctx = tenantContext.getStore();
          if (ctx && !ctx.isSuperAdmin) {
            throw new Error(
              "TenantExtension: the array form of prisma.$transaction cannot be tenant-pinned. " +
                "Use the callback form instead."
            );
          }
          return (base.$transaction as unknown as (a: unknown, o?: unknown) => Promise<unknown>)(
            first,
            second
          );
        }

        if (typeof first !== "function") {
          throw new Error(
            "TenantExtension: unsupported $transaction arguments. Expected a callback or an array of operations."
          );
        }

        const callback = first as (tx: unknown) => Promise<unknown>;
        const opts = second as TransactionOptions | undefined;
        return withTenantPin(base, opts, callback);
      }
    }
  };
}
