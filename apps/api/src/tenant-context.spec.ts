import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { TenantContextInterceptor } from "./common/interceptors/tenant-context.interceptor";
import { currentTenant, requireTenant } from "./common/tenant-context";

/**
 * Phase 1 plumbing: the interceptor must expose the caller's tenant to any
 * code running inside the handler, including async continuations, and must
 * not leak it outside.
 */
describe("TenantContextInterceptor", () => {
  const interceptor = new TenantContextInterceptor();

  function httpContext(user?: Record<string, unknown>): ExecutionContext {
    return {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => undefined
      })
    } as unknown as ExecutionContext;
  }


  it("binds firmId, userId and role for an authenticated caller", async () => {
    let observed: ReturnType<typeof currentTenant>;
    const handler: CallHandler = {
      handle: () => {
        observed = currentTenant();
        return of("ok");
      }
    };

    await lastValueFrom(
      interceptor.intercept(
        httpContext({ sub: "u-1", firmId: "firm-1", role: "OWNER" }),
        handler
      )
    );

    expect(observed).toEqual({
      firmId: "firm-1",
      userId: "u-1",
      isSuperAdmin: false
    });
  });

  it("marks platform SUPER_ADMIN and carries a null firmId", async () => {
    let observed: ReturnType<typeof currentTenant>;
    const handler: CallHandler = {
      handle: () => {
        observed = currentTenant();
        return of("ok");
      }
    };

    await lastValueFrom(
      interceptor.intercept(
        httpContext({ sub: "root", firmId: null, role: "SUPER_ADMIN" }),
        handler
      )
    );

    expect(observed).toEqual({ firmId: null, userId: "root", isSuperAdmin: true });
  });

  it("does not leak the store after the request completes", async () => {
    const handler: CallHandler = { handle: () => of("ok") };
    await lastValueFrom(
      interceptor.intercept(
        httpContext({ sub: "u-2", firmId: "firm-9", role: "ASSOCIATE" }),
        handler
      )
    );
    expect(currentTenant()).toBeUndefined();
    expect(() => requireTenant()).toThrow(/No tenant context/);
  });

  it("treats an absent request.user (public route) as no tenant", async () => {
    let observed: ReturnType<typeof currentTenant>;
    const handler: CallHandler = {
      handle: () => {
        observed = currentTenant();
        return of("ok");
      }
    };
    await lastValueFrom(interceptor.intercept(httpContext(undefined), handler));
    expect(observed).toEqual({ firmId: null, isSuperAdmin: false });
  });
});
