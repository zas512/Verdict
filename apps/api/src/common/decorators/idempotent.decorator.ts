import { SetMetadata } from "@nestjs/common";

export const IDEMPOTENT_KEY = "idempotent";

/**
 * Marks a handler as requiring an `Idempotency-Key` header (UUID). Honoured by
 * IdempotencyInterceptor. Blueprint §9.1: money, filing and hearing-capture
 * POSTs.
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
