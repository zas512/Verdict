import { INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "./prisma/prisma.service";
import { UserRole } from "./generated/prisma/enums";

/**
 * Covers the wiring that is easy to break and impossible to see in a unit test:
 * which routes the global AccessTokenGuard protects, that @Public() opts out,
 * that RolesGuard is enforced, and that DTO validation actually runs.
 */
describe("API security wiring", () => {
  let app: INestApplication;
  let jwt: JwtService;

  const env = {
    NODE_ENV: "test",
    PORT: "4999",
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/test",
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    JWT_REFRESH_EXPIRES_IN: "7d"
  };

  beforeAll(async () => {
    Object.assign(process.env, env);
    // Loaded after the environment is in place, because AppModule validates it
    // during module construction. `require` rather than `import` so it is not
    // hoisted above the assignment above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require("./app.module") as typeof import("./app.module");

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    jwt = app.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const tokenFor = (role: UserRole, firmId: string | null = "firm-1") =>
    jwt.sign(
      { sub: "user-1", email: "user@example.com", role, firmId },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: "5m" }
    );

  describe("@Public()", () => {
    it("serves the health probe without a token", async () => {
      const res = await request(app.getHttpServer()).get("/api/health");
      expect(res.status).toBe(200);
      expect((res.body as { status?: string }).status).toBe("ok");
    });
  });

  describe("global AccessTokenGuard", () => {
    // /leave and the expense routes carried no guards at all before.
    it.each([
      "/api/users",
      "/api/associates",
      "/api/attendance",
      "/api/firms",
      "/api/leave",
      "/api/fixed-expenses",
      "/api/manual-expenses",
      "/api/auth/me",
      "/api/matters",
      "/api/tasks"
    ])("rejects %s without a token", async (url) => {
      await request(app.getHttpServer()).get(url).expect(401);
    });

    it("rejects a token signed with the wrong secret", async () => {
      const forged = jwt.sign(
        { sub: "user-1", email: "e@x.com", role: UserRole.OWNER, firmId: "f" },
        { secret: "not-the-access-secret", expiresIn: "5m" }
      );
      await request(app.getHttpServer())
        .get("/api/users")
        .set("Authorization", `Bearer ${forged}`)
        .expect(401);
    });

    it("accepts the token from a cookie as well as a bearer header", async () => {
      // Reaches the handler, so the 401 is gone; Prisma is mocked, hence 500.
      const res = await request(app.getHttpServer())
        .get("/api/users")
        .set("Cookie", `access_token=${tokenFor(UserRole.OWNER)}`);
      expect(res.status).not.toBe(401);
    });
  });

  describe("RolesGuard", () => {
    it("keeps a non-super-admin out of /firms", async () => {
      await request(app.getHttpServer())
        .get("/api/firms")
        .set("Authorization", `Bearer ${tokenFor(UserRole.OWNER)}`)
        .expect(403);
    });

    it("keeps an associate out of the firm roster", async () => {
      await request(app.getHttpServer())
        .get("/api/associates")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ASSOCIATE)}`)
        .expect(403);
    });

    it("keeps an ADMIN out of everything but expenses", async () => {
      await request(app.getHttpServer())
        .get("/api/associates")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ADMIN)}`)
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/users")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ADMIN)}`)
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/tasks")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ADMIN)}`)
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/matters")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ADMIN)}`)
        .expect(403);
      const expensesRes = await request(app.getHttpServer())
        .get("/api/expenses")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ADMIN)}`);
      expect(expensesRes.status).not.toBe(403);
    });

    it("keeps an associate out of firm-wide attendance", async () => {
      await request(app.getHttpServer())
        .get("/api/attendance/firm")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ASSOCIATE)}`)
        .expect(403);
    });

    it("keeps an associate out of manual attendance entry", async () => {
      await request(app.getHttpServer())
        .post("/api/attendance/manual")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ASSOCIATE)}`)
        .send({ date: "2026-08-05" })
        .expect(403);
    });

    it("keeps an ADMIN out of approving leave", async () => {
      await request(app.getHttpServer())
        .patch("/api/leave/00000000-0000-0000-0000-000000000001/status")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ADMIN)}`)
        .send({ status: "APPROVED" })
        .expect(403);
    });

    it("keeps an associate out of creating a matter", async () => {
      await request(app.getHttpServer())
        .post("/api/matters")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ASSOCIATE)}`)
        .send({
          firmCaseNumber: "LGA-001",
          caseType: "CIVIL",
          clientName: "Test Client"
        })
        .expect(403);
    });

    it("keeps an associate out of getting matter summary reports", async () => {
      await request(app.getHttpServer())
        .get("/api/matters/00000000-0000-0000-0000-000000000001/summary-report")
        .set("Authorization", `Bearer ${tokenFor(UserRole.ASSOCIATE)}`)
        .expect(403);
    });

    it("lets an owner through to the roster", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/associates")
        .set("Authorization", `Bearer ${tokenFor(UserRole.OWNER)}`);
      expect(res.status).not.toBe(403);
    });
  });

  describe("validation", () => {
    it("rejects a malformed login body", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });

    it("rejects unknown properties", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "a@b.com", password: "secret123", isAdmin: true });
      expect(res.status).toBe(400);
    });

    it("rejects a manual attendance body with a bad date, which used to skip validation entirely", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/attendance/manual")
        .set("Authorization", `Bearer ${tokenFor(UserRole.OWNER)}`)
        .send({
          date: "07-2026-01",
          checkIn: "nonsense",
          checkOut: "also-nonsense",
          status: "NOT_A_STATUS"
        });
      expect(res.status).toBe(400);
    });

    it("refuses to self-register a SUPER_ADMIN", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "attacker@example.com",
          password: "password123",
          role: UserRole.SUPER_ADMIN,
          firmName: "Anything"
        });
      expect(res.status).toBe(403);
    });

    it("refuses to create a firm member with an escalated role", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users")
        .set("Authorization", `Bearer ${tokenFor(UserRole.OWNER)}`)
        .send({
          email: "new@example.com",
          password: "password123",
          role: UserRole.OWNER
        });
      expect(res.status).toBe(400);
    });
  });
});
