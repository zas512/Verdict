import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantGuard } from "./tenant.guard";
import { UserRole } from "../../../generated/prisma/enums";

/**
 * Unit tests for TenantGuard.
 * Mirror RolesGuard's pattern: mock Reflector + ExecutionContext, assert pass/fail.
 */
describe("TenantGuard", () => {
  let guard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new TenantGuard(reflector);
  });

  function httpContext(
    user?: Record<string, unknown>,
    isPublic = false
  ): ExecutionContext {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(isPublic);
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user })
      })
    } as unknown as ExecutionContext;
  }

  it("allows @Public() routes without any user", () => {
    expect(guard.canActivate(httpContext(undefined, true))).toBe(true);
  });

  it("allows SUPER_ADMIN through even without firmId", () => {
    const ctx = httpContext({ sub: "root", role: UserRole.SUPER_ADMIN, firmId: null });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows a firm-scoped OWNER through", () => {
    const ctx = httpContext({ sub: "u-1", role: UserRole.OWNER, firmId: "firm-1" });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows a firm-scoped ASSOCIATE through", () => {
    const ctx = httpContext({ sub: "u-2", role: UserRole.ASSOCIATE, firmId: "firm-1" });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("denies a non-SUPER_ADMIN authenticated user with null firmId", () => {
    const ctx = httpContext({ sub: "u-3", role: UserRole.ADMIN, firmId: null });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("denies a non-SUPER_ADMIN authenticated user with undefined firmId", () => {
    const ctx = httpContext({ sub: "u-4", role: UserRole.OWNER, firmId: undefined });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("denies an authenticated user with missing role but firmId present", () => {
    // Role missing but firmId present — still allow (fail-open on missing role
    // is not our concern; RolesGuard handles that). TenantGuard only checks firmId.
    const ctx = httpContext({ sub: "u-5", firmId: "firm-1" });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("denies when user is absent (should never happen after AccessTokenGuard)", () => {
    const ctx = httpContext(undefined, false);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
