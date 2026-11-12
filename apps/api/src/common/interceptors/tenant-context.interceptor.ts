import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { JwtPayload } from "../../modules/auth/strategies/access-token.strategy";
import { type TenantContextValue, tenantContext } from "../tenant-context";

/**
 * Binds the authenticated caller to AsyncLocalStorage for the lifetime of the
 * request. Additive plumbing for Phase 1 — no authorization decision is made
 * here. Enforcement arrives with the RLS migration.
 *
 * Registration: bound globally in AppModule, AFTER AccessTokenGuard (which
 * populates request.user) and before any handler runs.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    const store: TenantContextValue = user
      ? {
          firmId: user.firmId ?? null,
          userId: user.sub,
          isSuperAdmin: user.role === "SUPER_ADMIN"
        }
      : { firmId: null, isSuperAdmin: false };

    // Preserve the returned Observable inside the ALS scope so downstream
    // handlers and awaited continuations see the store.
    return new Observable((subscriber) => {
      tenantContext.run(store, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
