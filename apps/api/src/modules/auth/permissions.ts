import { UserRole } from "../../generated/prisma/enums";

/**
 * Permission taxonomy and role bundles (blueprint §11.3).
 *
 * Code today has exactly four DB roles: SUPER_ADMIN, OWNER, ADMIN, ASSOCIATE.
 * The blueprint's PARTNER/JUNIOR/CLERK/ACCOUNTANT/CLIENT roles do NOT exist
 * in the schema, so bundles below cover only what the DB can express.
 * Extending the enum is a schema decision (ask first).
 *
 * Keep this file in sync with arch.status doc and blueprint §11.3.
 */
export const PERMISSIONS = [
  "matter.read",
  "matter.write",
  "matter.manage",
  "hearing.write",
  "finance.read",
  "finance.post",
  "finance.approve",
  "finance.export",
  "document.upload",
  "document.download",
  "document.share",
  "user.manage",
  "rules.manage",
  "audit.read",
  "settings.manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Every permission, for SUPER_ADMIN's platform-level bundle. */
export const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  // Platform operator: everything. (Actual power comes from firmId === null +
  // isSuperAdmin in the RLS layer; this keeps the guard layer consistent.)
  SUPER_ADMIN: ALL_PERMISSIONS,
  // Firm owner: full bundle as well. OWNER is the tenant principal.
  OWNER: ALL_PERMISSIONS,
  // Firm admin (accounts/expense management): money visibility and posting,
  // no matter or user administration. Mirrors the existing @Roles on
  // /expenses + /fixed-expenses + /manual-expenses + /recurring-expenses
  // (OWNER, ADMIN) and the deliberate exclusion from /users, /associates,
  // /tasks, /matters (see roles.guard spec).
  ADMIN: ["finance.read", "finance.post", "finance.export"],
  // Associate advocate: works matters, records hearings, moves documents.
  // No finance, no user management.
  ASSOCIATE: [
    "matter.read",
    "matter.write",
    "hearing.write",
    "document.upload",
    "document.download"
  ]
};

/** Returns the bundle for a role, or an empty bundle for an unknown role. */
export function permissionsForRole(role: UserRole | undefined): readonly Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}
