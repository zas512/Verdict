import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
// Same constant @HttpCode() writes; "@nestjs/common/constants" is a working
// subpath import (the package has no exports map).
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { Request, Response } from "express";
import { from, Observable, of } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { IDEMPOTENT_KEY } from "../decorators/idempotent.decorator";
import type { JwtPayload } from "../../modules/auth/strategies/access-token.strategy";
import {
  IDEMPOTENCY_STORE,
  fingerprint,
  type IdempotencyStore
} from "../idempotency/idempotency.store";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
export const IDEMPOTENCY_REPLAYED_HEADER = "x-idempotency-replayed";

/**
 * IdempotencyInterceptor — blueprint §4.3 / §9.1.
 *
 * Opt-in per handler via @Idempotent(). Money, filing and hearing-capture
 * POSTs should carry it.
 *
 * Phase 1 state: DARK. The interceptor is globally registered, but unless an
 * IdempotencyStore is provided (IDEMPOTENCY_STORE=memory — dev/test only) it
 * is a complete passthrough: it does NOT demand the header from clients yet.
 * Replay durability needs an `IdempotencyRecord` table (migration —
 * ARCHITECTURE-STATUS.md open problem #8). Handler exceptions release the
 * claim so the caller may retry safely.
 *
 * A replay is answered with the recorded status and body plus
 * `X-Idempotency-Replayed: true`, and never reaches the handler.
 *
 * Guard order (blueprint §9.1): after auth/permission guards, before the
 * handler — global APP_INTERCEPTOR registration satisfies that.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(IDEMPOTENCY_STORE)
    private readonly store?: IdempotencyStore
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const required = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Dark passthrough: no store configured, no enforcement, no header demand.
    if (!required || !this.store) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: JwtPayload }>();
    const response = http.getResponse<Response>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );

    const rawKey = request.headers[IDEMPOTENCY_KEY_HEADER];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!key) {
      throw new BadRequestException(
        "Idempotency-Key header (UUID) is required for this endpoint"
      );
    }
    if (!isUuid(key)) {
      throw new BadRequestException("Idempotency-Key header must be a UUID");
    }

    // Public routes have no tenant; scope by IP so one caller cannot replay
    // another caller's response. Authenticated routes scope by firm.
    const scope =
      request.user?.firmId ??
      (isPublic ? (request.ip ?? "anonymous") : (request.user?.sub ?? "user"));
    const scopedKey = `${scope}:${key.toLowerCase()}`;
    const handler = context.getHandler();
    const hash = fingerprint(
      request.method,
      routeOf(context, request),
      request.body
    );
    const status = this.statusFor(handler, request.method);

    return from(this.store.begin(scopedKey, hash)).pipe(
      switchMap((claim) => {
        switch (claim.kind) {
          case "replay":
            response.status(claim.record.status);
            response.setHeader(IDEMPOTENCY_REPLAYED_HEADER, "true");
            return of(claim.record.body);
          case "conflict":
            throw new ConflictException(
              "Idempotency-Key was already used with a different request"
            );
          case "inflight":
            throw new ConflictException(
              "A request with this Idempotency-Key is still in progress"
            );
          case "proceed":
            return next.handle().pipe(
              tap({
                next: (body) => {
                  void this.store
                    ?.complete(scopedKey, hash, status, body)
                    .catch((error: unknown) =>
                      this.logger.error(
                        `Failed to persist idempotency record: ${String(error)}`
                      )
                    );
                }
              }),
              catchError((error: unknown) => {
                void this.store?.abandon(scopedKey, hash).catch(() => undefined);
                throw error;
              })
            );
        }
      })
    );
  }

  /** Mirrors Nest's status resolution so the stored status matches reality. */
  private statusFor(
    handler: (...args: unknown[]) => unknown,
    method: string
  ): number {
    const explicit = this.reflector.get<number | undefined>(
      HTTP_CODE_METADATA,
      handler
    );
    if (typeof explicit === "number") {
      return explicit;
    }
    return method === "POST" ? 201 : 200;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function routeOf(context: ExecutionContext, request: Request): string {
  const route = (request as Request & { route?: { path?: string } }).route
    ?.path;
  if (typeof route === "string") {
    return route;
  }
  return context.getClass().name;
}
