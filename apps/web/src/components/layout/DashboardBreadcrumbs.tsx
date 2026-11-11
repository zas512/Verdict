"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/Breadcrumbs";

/** Segment -> visible label for known dashboard routes. */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  matters: "Matters",
  tasks: "Tasks",
  clients: "Clients",
  associates: "Associates",
  attendance: "Attendance",
  leave: "Leave Requests",
  expenses: "Expenses",
  platform: "Platform",
  search: "Search",
  team: "Team",
};

/**
 * Accessible breadcrumb trail + BreadcrumbList JSON-LD for the authenticated
 * app. Mounted once in the dashboard layout. The dashboard root itself is
 * skipped (breadcrumb would duplicate the page heading).
 */
export function DashboardBreadcrumbs() {
  const pathname = usePathname() ?? "/";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || pathname === "/dashboard") return null;

  const items: BreadcrumbItem[] = [{ name: "Dashboard", href: "/dashboard" }];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const looksLikeRecordId = /^[0-9a-fA-F-]{8,}$/.test(seg);
    let label: string;
    if (looksLikeRecordId) {
      label = "Matter details";
    } else {
      label = SEGMENT_LABELS[seg] ?? seg.replace(/[-_]/g, " ");
    }
    items.push({ name: label, href: acc });
  });

  // For a matter detail route, collapse the middle matters crumbs cleanly.
  return (
    <Breadcrumbs
      items={items}
      className="text-muted-foreground -mt-2 text-xs font-medium"
    />
  );
}
