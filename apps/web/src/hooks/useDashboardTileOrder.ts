"use client";
import { useEffect, useState } from "react";

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

export function useDashboardTileOrder(
  userId: string,
  defaults: readonly DashboardTileId[] = DASHBOARD_TILE_IDS
) {
  const [isMounted, setIsMounted] = useState(false);
  const [order, setOrder] = useState<DashboardTileId[]>(() => [...defaults]);
  const [syncState, setSyncState] = useState({ mounted: false, userId });

  useEffect(() => {
    const mounted = () => {
      setIsMounted(true);
    };
    mounted();
  }, []);

  if (isMounted && (!syncState.mounted || syncState.userId !== userId)) {
    setSyncState({ mounted: true, userId });
    setOrder(readOrder(userId, defaults));
  }

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
