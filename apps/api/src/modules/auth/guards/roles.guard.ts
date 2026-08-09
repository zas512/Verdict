import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import type { UserRole } from "../../../generated/prisma/enums";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { JwtPayload } from "../strategies/access-token.strategy";

/**
 * Registered globally after AccessTokenGuard, so `request.user` is already
 * populated by the time this runs. Routes without `@Roles()` are allowed for
 * any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user?.role) {
      throw new ForbiddenException("Access denied: missing role context");
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Access denied: insufficient permissions");
    }
    return true;
  }
}
