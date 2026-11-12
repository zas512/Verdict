import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Ambient per-request tenant context.
 *
 * Populated by TenantContextInterceptor for every authenticated HTTP request
 * (and left empty for public routes). Phase 1 delivers this dark: nothing
 * reads it to enforce access yet. It exists so the Prisma extension can find
 * the caller's firm and `set_config('app.tenant_id', …)` inside the request
 * transaction once RLS is enabled.
 *
 * NEVER read this outside a request. Background jobs (BullMQ) must enter a
 * context explicitly per job with tenantContext.run({ firmId }, …) — losing
 * the ambient value is fail-closed, not a fallback to "all firms".
 */
export interface TenantContextValue {
  /** firmId (the codebase's tenant key; see ARCHITECTURE.md §4.4). */
  firmId: string | null;
  /** Authenticated user id, when known. */
  userId?: string;
  /** Platform SUPER_ADMIN: not subject to tenant scoping, sees metadata only. */
  isSuperAdmin: boolean;
}

export const tenantContext = new AsyncLocalStorage<TenantContextValue>();

/** Returns the active context or a detached sentinel (SuperAdmin-less empty). */
export function currentTenant(): TenantContextValue | undefined {
  return tenantContext.getStore();
}

export function requireTenant(): TenantContextValue {
  const store = tenantContext.getStore();
  if (!store) {
    throw new Error(
      "No tenant context: called outside a request/job scope. Wrap the entry point in tenantContext.run()."
    );
  }
  return store;
}
