"use client";
import dynamic from "next/dynamic";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { Laptop, Palmtree, Receipt, UserCheck, Users, UserX, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpenseRecord, UpcomingHearing } from "@/app/(dashboard)/dashboard/page";
import {
  DASHBOARD_TILE_IDS,
  useDashboardTileOrder,
  type DashboardTileId
} from "@/hooks/useDashboardTileOrder";
import { DashboardTile } from "./DashboardTile";
import { PendingApprovals } from "./PendingApprovals";
import { UpcomingHearings } from "./UpcomingHearings";
import type { ReactNode } from "react";

const DashboardAnalytics = dynamic(
  () =>
    import("@/components/dashboard/DashboardAnalytics").then(
      (mod) => mod.DashboardAnalytics
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16 text-xs font-semibold text-muted-foreground">
        Loading analytics...
      </div>
    )
  }
);

function StatTile({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/50 ring-1 ring-inset ring-border/40 py-2.5 px-1 text-center">
      {icon}
      <span className="text-sm font-black text-foreground">
        {value == null ? "—" : value}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

interface OwnerDashboardBoardProps {
  /** Storage key for the per-user tile order. */
  userId: string;
  totalAssociates: number | null;
  present: number | null;
  absent: number | null;
  leave: number | null;
  remote: number | null;
  expenseValue: string;
  fixedValue: string;
  manualValue: string;
  hearings: UpcomingHearing[];
  hearingsOk: boolean;
  expenses: ExpenseRecord[];
}

/**
 * The OWNER landing. The five cards are a reorderable tile grid — the user's
 * arrangement is persisted per user (localStorage, keyed by userId) and every
 * tile stretches to match its row-mate so the two-up rows read as equal.
 */
export function OwnerDashboardBoard({
  userId,
  totalAssociates,
  present,
  absent,
  leave,
  remote,
  expenseValue,
  fixedValue,
  manualValue,
  hearings,
  hearingsOk,
  expenses
}: OwnerDashboardBoardProps) {
  const [order, setOrder] = useDashboardTileOrder(userId, DASHBOARD_TILE_IDS);

  // Handle-scoped drag (DashboardTile owns the grip), so card buttons and
  // links keep working; the tiny distance still stops an accidental grab.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as DashboardTileId);
      const newIndex = prev.indexOf(over.id as DashboardTileId);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const tileContent = (id: DashboardTileId) => {
    switch (id) {
      case "associates":
        return (
          <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary via-primary/80 to-chart-2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Associates
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-black text-foreground tracking-tight">
                {totalAssociates == null ? "—" : totalAssociates}
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-1 mb-4">
                Firm-wide headcount
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatTile
                  icon={<UserCheck className="h-3.5 w-3.5 text-success" />}
                  label="Present"
                  value={present}
                />
                <StatTile
                  icon={<UserX className="h-3.5 w-3.5 text-destructive" />}
                  label="Absent"
                  value={absent}
                />
                <StatTile
                  icon={<Palmtree className="h-3.5 w-3.5 text-warning" />}
                  label="On Leave"
                  value={leave}
                />
                <StatTile
                  icon={<Laptop className="h-3.5 w-3.5 text-info" />}
                  label="Remote"
                  value={remote}
                />
              </div>
            </CardContent>
          </Card>
        );
      case "expenses":
        return (
          <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary via-primary/80 to-chart-2" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Expenses & Billings
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Receipt className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-black text-foreground tracking-tight">
                {expenseValue}
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-1 mb-4">
                Fixed salaries + manual operational expenses (PKR)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-success" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fixed Salaries
                    </span>
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    {fixedValue}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Manual Expenses
                    </span>
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    {manualValue}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "tareekh":
        return <UpcomingHearings hearings={hearings} ok={hearingsOk} className="h-full" />;
      case "approvals":
        return <PendingApprovals className="h-full" />;
      case "analytics":
        return <DashboardAnalytics expenses={expenses} />;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="grid gap-4 lg:grid-cols-2">
          {order.map((id) => (
            <DashboardTile
              key={id}
              id={id}
              className={id === "analytics" ? "lg:col-span-2" : undefined}
            >
              {tileContent(id)}
            </DashboardTile>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
