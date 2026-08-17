# API audit — findings and remediation

A record of what was broken, missing, or unimplemented in `apps/api`, and what
replaced it. Scope was the NestJS API only; `apps/web` was not modified.

**Verification at time of writing:** `tsc --noEmit` clean · `nest build` clean ·
27/27 tests pass · lint down from 23 errors to 6 (all pre-existing, see
[Still open](#still-open)).

---

## 1. Blocked the build entirely

### Prisma client was never generated

`prisma/schema.prisma` outputs to `src/generated/prisma`, which is `.gitignore`d
and did not exist. Every file importing `../generated/prisma/client` failed to
resolve, so nothing compiled.

Fixed by running `npx prisma generate`. **This is a per-clone step** — it must
run after `npm install` and after any schema change. Worth adding to a
`postinstall` script.

---

## 2. Security

### 2.1 Anyone could create a platform SUPER_ADMIN — critical

`AuthService.register` rejected `ADMIN` and `ASSOCIATE`, handled `OWNER`, then
**fell through** to an unguarded `// SUPER_ADMIN` branch:

```ts
// SUPER_ADMIN
const user = await this.prisma.user.create({
  data: { email, passwordHash, role: UserRole.SUPER_ADMIN, firmId: null }
});
```

`POST /api/auth/register` is unauthenticated, so any caller could mint a
platform administrator with full cross-firm access.

Now: registration is OWNER-only. SUPER_ADMIN accounts are provisioned out of
band via `prisma/seed.ts`. Covered by a test.

### 2.2 Three controllers had no guards at all

`/leave`, `/fixed-expenses` and `/manual-expenses` carried no `@UseGuards()`,
making them reachable without a token. `GET /api` also served an unauthenticated
`"Hello World!"`.

Root cause was the pattern, not the individual files: guards were opt-in
per controller, so forgetting one silently published it.

Now: `AccessTokenGuard` and `RolesGuard` are bound globally as `APP_GUARD`, so
routes are **authenticated by default** and must opt out with the new
`@Public()` decorator. `GET /api` became `GET /api/health`.

### 2.3 Any associate could read the whole firm roster

`AssociatesController.findAll` / `findOne` had no `@Roles()`, and `RolesGuard`
allows any authenticated user when no roles are declared. An ASSOCIATE could
list every colleague's account and email — while the web sidebar already
restricted that page to OWNER/ADMIN.

Now: `@Roles(OWNER)` at class level, matching the frontend's intent.

### 2.4 JWTs and password hashes written to stdout

```ts
console.log("login tokens: ", tokens); // access + refresh JWTs
console.log("user in backend: ", user); // passwordHash, refreshTokenHash
```

Plus a dozen more `console.log` calls across the services.

Now: all removed, replaced by a `LoggingInterceptor` that logs method, URL,
status, duration and user id — and nothing else.

### 2.5 Role escalation caught too late

`CreateTeamMemberDto` accepted `@IsEnum(UserRole)`, i.e. any role including
SUPER_ADMIN, and relied on the service to reject it.

Now: `@IsIn([ADMIN, ASSOCIATE])` rejects at validation with a 400.

### 2.6 Deactivating a user did not revoke their session

Setting `isActive: false` left `refreshTokenHash` intact, so the user could keep
exchanging it for fresh access tokens.

Now: deactivation clears `refreshTokenHash`, and `refresh()` re-checks
`isActive`.

### 2.7 Login leaked which emails exist

`login` returned early when no user matched, skipping bcrypt entirely. The
response-time difference distinguished registered from unregistered emails.

Now: unknown emails are compared against a fixed dummy hash so both paths do the
same work.

### 2.8 Credential endpoints shared the global rate limit

Only the app-wide 50 req/min applied. `/auth/login` and `/auth/register` now
carry `@Throttle({ default: { limit: 5, ttl: 60_000 } })`.

### 2.9 Cookies had no `sameSite`, and outlived their tokens

Four copies of the same cookie block, none setting `sameSite`, all with
`maxAge: 24h` while the access token expires in 15m — so a cookie was usually
present but carrying a dead token.

Now: one `authCookieOptions()` helper in `auth.constants.ts`, `sameSite: "lax"`,
and lifetimes that mirror the JWT TTLs.

---

## 3. Correctness bugs

### 3.1 Attendance dates were off by one day

`Attendance.date` is `@db.Date`, which needs an exact UTC midnight. The code
built it from local components:

```ts
const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
```

At UTC+5 that is `19:00` the _previous_ day in UTC. Manual entries had the same
flaw via `new Date(body.date + "T00:00:00")`.

Now: a `toDateOnly()` helper using `Date.UTC(...)`, and `parseDateOnly()`
appending `T00:00:00.000Z`.

### 3.2 Checking in twice in one day returned a 500

The schema has `@@unique([associateId, date])`, but `checkIn` only looked for an
_open_ shift (`checkOut: null`). After checking out, a second check-in the same
day hit the constraint as an unhandled `P2002`.

Now: the day's row is looked up by its unique key, giving a 400 ("already
checked in") or a 409 ("already recorded today").

### 3.3 Attendance endpoints were completely unvalidated

The payloads were declared inline:

```ts
@Body() body: { date: string; checkIn: string; checkOut: string; ... }
```

`ValidationPipe` skips a metatype of `Object`, so **nothing ran** — despite
`whitelist` and `forbidNonWhitelisted` being enabled globally. Raw strings went
straight into `new Date()` and into Prisma via `data: any`.

Now: real `CheckInDto` / `CreateAttendanceDto` / `UpdateAttendanceDto` classes
with `@IsISO8601`, `@Matches`, `@IsEnum`; `Prisma.AttendanceUpdateInput`
replaces `any`. Covered by a test.

### 3.4 `firmName` was never actually required

```ts
@ValidateIf((dto) => dto.role === UserRole.OWNER)
@IsString()
@IsOptional()          // cancels the ValidateIf
firmName?: string;
```

`@IsOptional()` skipped the check whenever the value was absent, pushing the
requirement into the service. Now a plain `@IsNotEmpty()`.

### 3.5 Misconfiguration reported as 401

`AuthService.getEnv` threw `UnauthorizedException` for a missing JWT secret — a
server misconfiguration surfacing to the client as an auth failure. The
strategies separately read `process.env.JWT_ACCESS_SECRET!` at construction.

Now: `ConfigModule.forRoot({ validate })` validates all seven variables at boot
via class-validator, so a bad deployment fails immediately with a precise
message. Everything reads through `ConfigService`.

### 3.6 Wrong default port

`main.ts` fell back to `3001`; `.env.example` and the web client both use
`4000`. Now `4000`, from validated config.

### 3.7 Prisma connected lazily, and never shut down cleanly

A bad `DATABASE_URL` first appeared as a failed request rather than a failed
boot, and there were no shutdown hooks, so SIGTERM dropped the pool mid-query.

Now: `onModuleInit` calls `$connect()`, and `main.ts` calls
`app.enableShutdownHooks()`.

---

## 4. Missing NestJS building blocks

| Piece             | Before                 | Now                                                         |
| ----------------- | ---------------------- | ----------------------------------------------------------- |
| Interceptors      | none                   | `LoggingInterceptor`, `ClassSerializerInterceptor` (global) |
| Exception filters | none                   | `AllExceptionsFilter` (global), maps Prisma errors          |
| `PassportModule`  | never imported         | registered with `session: false`                            |
| Guard binding     | per-controller, opt-in | global `APP_GUARD` chain + `@Public()`                      |
| Serialization     | raw Prisma objects     | entities + `plainToInstance`                                |
| Env validation    | none                   | `validateEnv` at boot                                       |
| Tests             | none                   | 27                                                          |

### 4.1 Exception filter

A single `@Catch()` filter rather than a chain, because ordering for globally
bound filters is easy to get subtly wrong. Precedence is explicit:
Prisma → `HttpException` → unknown. Prisma mappings:

| Code    | Status | Meaning                    |
| ------- | ------ | -------------------------- |
| `P2002` | 409    | unique constraint          |
| `P2025` | 404    | record not found           |
| `P2003` | 400    | foreign key violation      |
| `P2014` | 400    | required relation violated |

The response body keeps Nest's `{ statusCode, message, error }` shape, which the
Next.js BFF already reads via `errorData.message`.

### 4.2 Serialization

Services now return entity instances built with
`plainToInstance(cls, data, { excludeExtraneousValues: true })`. Only
`@Expose()`d properties survive, so `passwordHash` and `refreshTokenHash` cannot
reach a response **even if a query forgets to narrow its `select`** — the
previous design depended on every `select` being written correctly.

Entities: `UserEntity`, `AttendanceEntity`, `FirmEntity`, `AuthUserEntity`.
Response shapes are unchanged, so the web app needed no edits.

### 4.3 Guard order

Declared in `AppModule` and executed in this order:

1. `ThrottlerGuard` — rate limit
2. `AccessTokenGuard` — authenticate (honours `@Public()`)
3. `RolesGuard` — authorize (honours `@Roles()`)

### 4.4 JWT transport mismatch

The API set httpOnly cookies on login/refresh but the strategies extracted from
the `Authorization` header only — so a browser talking to the API directly could
never authenticate. It worked solely because the Next.js BFF reads the cookie
and re-sends it as a bearer token.

Now: `ExtractJwt.fromExtractors([bearer, cookie])`. The cookie extractor parses
the raw header, so no `cookie-parser` dependency was added.

---

## 5. Duplication removed

`UsersService.createTeamMember` and `AssociatesService.create` were near-copies
operating on the same `user` table, and had drifted — only the associates path
set `mustChangePassword`, accepted a `name`, or defaulted the role.

`UsersService` is now the single implementation (`create`, `findAll`, `findOne`,
`update`, `resolveAssociateId`); `AssociatesService` delegates to it. The old
DTO files re-export the shared `CreateFirmMemberDto` / `UpdateFirmMemberDto`, so
both routes validate identically.

Also: `FirmsModule` was importing the `@Global()` `PrismaModule` redundantly;
empty placeholder entities (`export class Auth {}`) became real entities.

> **Naming caveat:** `AssociatesService` manages _user accounts_, but Prisma also
> has an `Associate` model — the HR record attendance hangs off. They are
> different things. `UsersService.resolveAssociateId` links a user to its
> Associate row, creating it on first use inside a transaction so concurrent
> requests cannot create two.

---

## 6. Test suite

`src/app.security.spec.ts` — 27 tests over the wiring that is invisible to unit
tests: which routes the global guard protects, that `@Public()` opts out, that
`RolesGuard` is enforced (including the RBAC matrix — ADMIN kept out of
everything but expenses, ASSOCIATE kept out of firm-wide and manual attendance,
ADMIN kept out of leave approval), that DTO validation runs, and that the two
privilege-escalation paths are closed. Prisma is mocked, so no database needed.

Two config fixes were required to make tests runnable at all:

- **`moduleNameMapper`** — the generated Prisma client uses `.js` extensions in
  its relative imports (NodeNext style). Jest could not resolve them; mapped
  `^(\.{1,2}/.*)\.js$` → `$1`.
- **`tsconfig.types`** — was `["node"]`, which excluded `@types/jest` even though
  the package was installed. Now `["node", "jest"]`.

---

## 7. Module dependency graph

`nestjs-spelunker` walks the live DI container on bootstrap and writes
`deps.mermaid`. Because it runs inside `bootstrap()`, `nest start --watch`
regenerates it on every restart — change a module's `imports` and the file
follows.

Skipped when `NODE_ENV=production`, and wrapped in try/catch so a docs artifact
can never take the API down.

**Gotcha worth remembering:** edges must be written `A --> B`, not `A-->B`.
Written tight, Mermaid can match its asymmetric-node rule (`id>text]`) instead of
the link rule, producing a stray node named `A--` and silently dropping every
edge. The first version rendered as nine disconnected boxes for exactly this
reason.

Arrows run **dependency → dependent**: `AuthModule --> AppModule` means AppModule
imports AuthModule. Swap the two names in the `.map()` to reverse it.

---

## Still open

Deliberately not addressed — listed so nothing is lost.

- **`/leave` was a Nest CLI scaffold** (`'This action adds a new leave'`) when
  this audit was written. It has since been fully implemented: associates apply
  for and track their own leave, the owner sees every firm request and is the
  only role that can approve/reject, per-year balances are decremented on
  approval, and the web app gained a `/leave` page. `/fixed-expenses` and
  `/manual-expenses` were implemented as part of the expenses module.
- **`void crypto;`** at the end of `users.service.ts` — kept at your request. The
  import it referred to is gone, so it now resolves to the Node global and does
  nothing.
- **`deps.mermaid` is untracked.** Commit it (useful for reviewing wiring changes
  in diffs) or add it to `.gitignore`.
- **`apps/web` untouched.** It has its own `console.log` calls that print user
  objects, and `lib/api.ts` keeps an in-memory access token that the login flow
  never actually sets — so the browser-direct axios path is unauthenticated. The
  cookie extractor added in §4.4 makes that path viable if you want to pursue it.
- **Root `npm run dev` is broken** — it calls `concurrently`, which is declared in
  the root `package.json` but not installed.
- **Email case sensitivity.** Emails are trimmed but not lowercased, so
  `A@x.com` and `a@x.com` can both register. Normalising would be correct but
  risks locking out any existing mixed-case account, so it was left alone.
