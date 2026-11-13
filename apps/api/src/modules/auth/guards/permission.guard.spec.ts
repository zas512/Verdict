import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionGuard } from "./permission.guard";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, permissionsForRole } from "../permissions";
import { UserRole } from "../../../generated/prisma/enums";

describe("permissionsForRole", () => {
  it("grants SUPER_ADMIN and OWNER every permission", () => {
    expect(permissionsForRole(UserRole.SUPER_ADMIN)).toEqual(ALL_PERMISSIONS);
    expect(permissionsForRole(UserRole.OWNER)).toEqual(ALL_PERMISSIONS);
  });

  it("grants ADMIN only finance read/post/export", () => {
    expect(permissionsForRole(UserRole.ADMIN)).toEqual([
      "finance.read",
      "finance.post",
      "finance.export"
    ]);
  });

  it("grants ASSOCIATE matter/hearing/document permissions, no finance", () => {
    const held = permissionsForRole(UserRole.ASSOCIATE);
    expect(held).toContain("matter.read");
    expect(held).toContain("hearing.write");
    expect(held).not.toContain("finance.post");
    expect(held).not.toContain("user.manage");
  });

  it("returns an empty bundle for an unknown role", () => {
    expect(permissionsForRole(undefined)).toEqual([]);
  });

  it("ADMIN bundle is a strict subset of OWNER", () => {
    const owner = new Set<string>(ROLE_PERMISSIONS.OWNER);
    for (const p of ROLE_PERMISSIONS.ADMIN) {
      expect(owner.has(p)).toBe(true);
    }
  });
});

describe("PermissionGuard", () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new PermissionGuard(reflector);
  });

  function httpContext(
    user: Record<string, unknown> | undefined,
    handlerPermissions?: string[],
    isPublic = false
  ): ExecutionContext {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === "isPublic") return isPublic;
        if (key === "permissions_required") return handlerPermissions;
        return undefined;
      }
    );
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user })
      })
    } as unknown as ExecutionContext;
  }

  it("allows @Public() routes without checking permissions", () => {
    expect(guard.canActivate(httpContext(undefined, ["finance.post"], true))).toBe(true);
  });

  it("allows routes that declare no @Permissions()", () => {
    expect(guard.canActivate(httpContext({ sub: "u", role: UserRole.ASSOCIATE }))).toBe(true);
  });

  it("allows an OWNER to post finances", () => {
    const ctx = httpContext(
      { sub: "u", role: UserRole.OWNER, firmId: "firm-1" },
      ["finance.post"]
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows an ADMIN to post finances but not to manage users", () => {
    const admin = { sub: "u", role: UserRole.ADMIN, firmId: "firm-1" };
    expect(guard.canActivate(httpContext(admin, ["finance.post"]))).toBe(true);
    expect(() => guard.canActivate(httpContext(admin, ["user.manage"]))).toThrow(
      ForbiddenException
    );
  });

  it("denies an ASSOCIATE the finance bundle entirely", () => {
    const assoc = { sub: "u", role: UserRole.ASSOCIATE, firmId: "firm-1" };
    expect(() => guard.canActivate(httpContext(assoc, ["finance.post"]))).toThrow(
      ForbiddenException
    );
    expect(() => guard.canActivate(httpContext(assoc, ["finance.read"]))).toThrow(
      ForbiddenException
    );
  });

  it("denies when the role is missing", () => {
    const ctx = httpContext({ sub: "u", firmId: "firm-1" }, ["finance.read"]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("requires ALL listed permissions (AND)", () => {
    const admin = { sub: "u", role: UserRole.ADMIN, firmId: "firm-1" };
    // ADMIN holds finance.post but not matter.manage
    expect(() =>
      guard.canActivate(httpContext(admin, ["finance.post", "matter.manage"]))
    ).toThrow(ForbiddenException);
    // OWNER holds both
    const owner = { sub: "u", role: UserRole.OWNER, firmId: "firm-1" };
    expect(
      guard.canActivate(httpContext(owner, ["finance.post", "matter.manage"]))
    ).toBe(true);
  });
});
