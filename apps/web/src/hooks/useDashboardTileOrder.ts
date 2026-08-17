"use client";

import { useEffect, useState } from "react";

/**
 * Dashboard tile ids, in the default (first-visit) order. `analytics` spans
 * two grid columns; the rest pair up in the 2-up rows.
 */
export const DASHBOARD_TILE_IDS = [
  "associates",
  "expenses",
  "tareekh",
  "approvals",
  "analytics"
] as const;

export type DashboardTileId = (typeof DASHBOARD_TILE_IDS)[number];

const STORAGE_PREFIX = "lga:dashboard-tiles:";

function readOrder(
  userId: string,
  defaults: readonly DashboardTileId[]
): DashboardTileId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return [...defaults];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...defaults];
    // Keep the stored tiles that still exist; append any newer defaults the
    // stored layout predates, so a persisted order never silently drops a card.
    const stored = parsed.filter(
      (id): id is DashboardTileId =>
        typeof id === "string" && (defaults as readonly string[]).includes(id)
    );
    const missing = defaults.filter((id) => !(stored as string[]).includes(id));
    return [...stored, ...missing];
  } catch {
    return [...defaults];
  }
}

/**
 * The user's dashboard tile order, persisted per user to localStorage. The
 * choice is a per-user *layout preference*, so a local key scoped by userId is
 * the right size: it survives reloads and role switches without needing a
 * backend round-trip on every landing.
 */
export function useDashboardTileOrder(
  userId: string,
  defaults: readonly DashboardTileId[] = DASHBOARD_TILE_IDS
) {
  const [order, setOrder] = useState<DashboardTileId[]>(() =>
    typeof window === "undefined" ? [...defaults] : readOrder(userId, defaults)
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + userId,
        JSON.stringify(order)
      );
    } catch {
      // Storage can be unavailable (private mode, quota) — reorder still works
      // for the session, it just won't persist.
    }
  }, [userId, order]);

  return [order, setOrder] as const;
}
