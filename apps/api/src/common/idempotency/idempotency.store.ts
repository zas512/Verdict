import { createHash } from "crypto";

/**
 * Idempotency store abstraction (blueprint §4.3 / §9.1).
 *
 * This is the seam a durable implementation (an `IdempotencyRecord` table via
 * Prisma — see ARCHITECTURE.md open problem #8) will slot into. The current
 * repository ships two implementations only:
 *
 *   - `InMemoryIdempotencyStore`: dev/test correctness checks for replay
 *     semantics. NOT safe across processes or restarts. Never enable it for
 *     real money traffic in production.
 *
 * Disabled (no store) means the interceptor is a passthrough — the default.
 *
 * Key semantics (matching the blueprint):
 *   - Keys are scoped per tenant (`firmId`), so the same key from another firm
 *     is an unrelated record.
 *   - The stored fingerprint covers method + route + body, so the same key
 *     with a different body is a 409, never a replay.
 *   - Only successful (2xx-range) responses are stored; failures are never
 *     cached and the key is released so the client may retry.
 */

export const IDEMPOTENCY_STORE = Symbol("IDEMPOTENCY_STORE");

export interface IdempotencyStoreRecord {
  status: number;
  body: unknown;
  createdAt: number;
}

export type BeginResult =
  | { kind: "proceed" }
  | { kind: "replay"; record: IdempotencyStoreRecord }
  /** Same key, different request fingerprint — blueprint: 409. */
  | { kind: "conflict" }
  /** Same key, same request, still running. */
  | { kind: "inflight" };

export interface IdempotencyStore {
  /**
   * Claims `scopedKey` for this request or tells the caller what to do with
   * the existing record. Claims are held until `complete` or `abandon`.
   */
  begin(scopedKey: string, requestHash: string): Promise<BeginResult>;
  complete(
    scopedKey: string,
    requestHash: string,
    status: number,
    body: unknown
  ): Promise<void>;
  /** Releases a claim without storing a response (handler threw). */
  abandon(scopedKey: string, requestHash: string): Promise<void>;
}

interface MemoryEntry {
  requestHash: string;
  claim: boolean;
  record?: IdempotencyStoreRecord;
  createdAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 10_000;

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, MemoryEntry>();

  async begin(
    scopedKey: string,
    requestHash: string
  ): Promise<BeginResult> {
    this.sweep();
    const existing = this.entries.get(scopedKey);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        return { kind: "conflict" };
      }
      if (existing.record) {
        return { kind: "replay", record: existing.record };
      }
      return { kind: "inflight" };
    }

    this.entries.set(scopedKey, {
      requestHash,
      claim: true,
      createdAt: Date.now()
    });
    return { kind: "proceed" };
  }

  async complete(
    scopedKey: string,
    requestHash: string,
    status: number,
    body: unknown
  ): Promise<void> {
    const existing = this.entries.get(scopedKey);
    if (!existing || existing.requestHash !== requestHash || !existing.claim) {
      return; // claim lost (expired/evicted) — nothing to store against
    }
    existing.record = { status, body, createdAt: Date.now() };
  }

  async abandon(scopedKey: string, requestHash: string): Promise<void> {
    const existing = this.entries.get(scopedKey);
    if (existing && existing.requestHash === requestHash && !existing.record) {
      this.entries.delete(scopedKey);
    }
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.createdAt > TTL_MS) {
        this.entries.delete(key);
      }
    }
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }
}

/** Deterministic JSON stringify (sorted object keys) for fingerprinting. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const inner = keys
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",");
  return `{${inner}}`;
}

export function fingerprint(
  method: string,
  route: string,
  body: unknown
): string {
  return createHash("sha256")
    .update(`${method}:${route}:${stableStringify(body)}`)
    .digest("hex");
}
