import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import type { JwtPayload } from "../strategies/access-token.strategy";

/**
 * TenantGuard — runs after AccessTokenGuard + RolesGuard so request.user is populated.
 * Enforces that every authenticated non-SUPER_ADMIN request has a firmId.
 * SUPER_ADMIN (firmId === null) is allowed through; the downstream RLS layer
 * uses app.is_superadmin for its bypass.
 *
 * Registered globally in AppModule after RolesGuard.
 * Skips @Public() routes (health, auth endpoints).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user) {
      // Should never happen: AccessTokenGuard runs first and rejects unauthenticated.
      throw new ForbiddenException("Access denied: missing authentication context");
    }

    // SUPER_ADMIN has firmId === null and is legitimate; let them through.
    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    // Any other authenticated user MUST have a firmId.
    if (!user.firmId) {
      throw new ForbiddenException("Access denied: no tenant context (firmId missing)");
    }

    return true;
  }
}