import type { PrismaClient } from "../generated/prisma/client";
import { tenantContext } from "../common/tenant-context";

/**
 * Prisma client extension (Phase 1 — DARK, not wired into AppModule yet).
 *
 * Purpose: when a request/job runs inside a tenant context, wrap every
 * model operation in its own interactive transaction on a SEPARATE,
 * UNEXTENDED base client and run `set_config('app.tenant_id', firmId, true)`
 * there before the operation. The setting is transaction-local, so it never
 * leaks to a pooled connection afterwards.
 *
 * Why a separate base client: calling an extended client from inside its own
 * extension (the "extended this" trap, ARCHITECTURE-STATUS open problem #4)
 * double-wraps every query and can recurse. `query(args)` is bound to the
 * pre-extension chain, so it would run OUTSIDE the transaction — the base
 * client passed here is the only safe execution target.
 *
 * Caveats (all intentional, documented in ARCHITECTURE-STATUS.md):
 *  - Nested interactive transactions: services that already call
 *    `prisma.$transaction(cb)` MUST keep working when the extension lands.
 *    Prisma inherits extensions into the itx client, so operations inside an
 *    outer `$transaction` would each open their OWN base transaction — that
 *    breaks atomicity (different connections). Until the wiring PR decides
 *    how to detect "already inside an itx" (or migrates services to the base
 *    client), this extension must stay OUT of the global PrismaService.
 *  - Raw queries ($queryRaw / $executeRaw) are re-dispatched as raw SQL with
 *    positional `$n` parameters reconstructed from the Sql object. If the
 *    shape isn't what we expect, raw runs on the tx WITHOUT the tenant
 *    setting would be unsafe — so we fail closed (throw) instead.
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

interface AllOperationsArgs {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
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

export interface TenantExtensionShape {
  query: {
    $allOperations: (params: AllOperationsArgs) => Promise<unknown>;
  };
}

/**
 * Builds the extension definition. `base` MUST be an unextended PrismaClient.
 * The definition delegates every scoped operation to `base.$transaction(...)`
 * and re-dispatches model ops as `tx[model][operation](args)`.
 */
export function createTenantExtension(base: PrismaClient): TenantExtensionShape {
  return {
    query: {
      $allOperations: async ({ model, operation, args, query }: AllOperationsArgs) => {
        const ctx = tenantContext.getStore();

        // Outside a request/job, or an unauthenticated public request: no
        // tenant to pin. Pass through (RLS, once enabled, still applies at
        // the database level for the connecting role).
        if (!ctx || ctx.isSuperAdmin) {
          return query(args);
        }

        const firmId = ctx.firmId ?? "";
        const isRaw = operation === "$queryRaw" || operation === "$executeRaw";

        return base.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${firmId}, true)`;
          await tx.$executeRaw`SELECT set_config('app.is_superadmin', 'false', true)`;

          if (isRaw) {
            if (!isSqlLike(args)) {
              throw new Error(
                "TenantExtension: raw operation received an unexpected arg shape; refusing to run it unscoped."
              );
            }
            const { text, values } = positionalSql(args);
            return operation === "$queryRaw"
              ? tx.$queryRawUnsafe(text, ...values)
              : tx.$executeRawUnsafe(text, ...values);
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
        });
      }
    }
  };
}
