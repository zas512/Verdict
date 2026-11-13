import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import { PERMISSIONS_REQUIRED_KEY } from "../decorators/permissions.decorator";
import type { Permission } from "../permissions";
import { permissionsForRole } from "../permissions";
import type { JwtPayload } from "../strategies/access-token.strategy";

/**
 * PermissionGuard — blueprint §4.3 / §11.3. Runs after AccessTokenGuard,
 * TenantGuard and RolesGuard.
 *
 * Additive, dark migration strategy: handlers without @Permissions() pass.
 * Handlers with @Permissions() require ALL listed permissions, resolved from
 * the role bundle (ROLE_PERMISSIONS). RolesGuard still gates the principal;
 * PermissionGuard layers the capability check on top.
 *
 * Registered globally in AppModule.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user?.role) {
      throw new ForbiddenException("Access denied: missing role context");
    }

    const held = permissionsForRole(user.role);
    const missing = required.filter((p) => !held.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Access denied: missing permission ${missing.join(", ")}`
      );
    }
    return true;
  }
}
