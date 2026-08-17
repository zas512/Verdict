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
import {
  Laptop,
  Palmtree,
  Receipt,
  UserCheck,
  Users,
  UserX,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ExpenseRecord,
  UpcomingHearing
} from "@/app/(dashboard)/dashboard/page";
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
      <div className="text-muted-foreground flex items-center justify-center py-16 text-xs font-semibold">
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
    <div className="bg-muted/50 ring-border/40 flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2.5 text-center ring-1 ring-inset">
      {icon}
      <span className="text-foreground text-sm font-black">
        {value == null ? "—" : value}
      </span>
      <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
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
          <Card className="skeuo-card bg-card text-card-foreground relative h-full overflow-hidden">
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
                Total Associates
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-foreground text-4xl font-black tracking-tight">
                {totalAssociates == null ? "—" : totalAssociates}
              </div>
              <p className="text-muted-foreground mt-1 mb-4 text-xs font-semibold">
                Firm-wide headcount
              </p>

              <div className="border-border/80 my-3 border-t" />

              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                    Present
                  </span>
                  <p className="text-success mt-0.5 text-xl font-bold">
                    {present ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                    Absent
                  </span>
                  <p className="text-destructive mt-0.5 text-xl font-bold">
                    {absent ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                    On Leave
                  </span>
                  <p className="text-warning mt-0.5 text-xl font-bold">
                    {leave ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                    Remote
                  </span>
                  <p className="text-info mt-0.5 text-xl font-bold">
                    {remote ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "expenses":
        return (
          <Card className="skeuo-card bg-card text-card-foreground relative h-full overflow-hidden">
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
                Expenses & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-foreground text-4xl font-black tracking-tight">
                {expenseValue}
              </div>
              <p className="text-muted-foreground mt-1 mb-4 text-xs font-semibold">
                Monthly operational expenses (PKR)
              </p>

              <div className="border-border/80 my-3 border-t" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                    Fixed salaries
                  </span>
                  <p className="text-foreground mt-0.5 text-lg font-bold">
                    {fixedValue}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                    Manual expenses
                  </span>
                  <p className="text-foreground mt-0.5 text-lg font-bold">
                    {manualValue}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "tareekh":
        return (
          <UpcomingHearings
            hearings={hearings}
            ok={hearingsOk}
            className="h-full"
          />
        );
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
