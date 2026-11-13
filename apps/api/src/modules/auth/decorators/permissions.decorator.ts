import { SetMetadata } from "@nestjs/common";
import type { Permission } from "../permissions";

export const PERMISSIONS_REQUIRED_KEY = "permissions_required";

/**
 * Declares the permission(s) a handler requires. All listed permissions must
 * be held (AND). Handler/class-level: class is applied when handler is absent.
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_REQUIRED_KEY, permissions);
