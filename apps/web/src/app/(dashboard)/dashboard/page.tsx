import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { AssociateDashboard } from "@/components/dashboard/AssociateDashboard";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { OwnerDashboardBoard } from "@/components/dashboard/OwnerDashboardBoard";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { formatPKR } from "@/lib/format";
import { backendFetch } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

interface AttendanceRecord {
  id: string;
  associateId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
  source: "MANUAL" | "BIOMETRIC_IMPORT" | "REMOTE_CHECKIN";
}

export interface ExpenseRecord {
  amount?: number;
  date?: string;
  createdAt?: string;
  category?: string;
  type?: string;
}

export interface UpcomingHearing {
  id: string;
  matterId: string;
  hearingDate: string;
  purpose: string;
  status: string;
  presidingJudge?: string | null;
  matter?: {
    id: string;
    firmCaseNumber: string;
    courtCaseNumber?: string | null;
    clientName: string;
    court?: string | null;
    bench?: string | null;
    caseType?: string | null;
    currentStage?: { name: string } | null;
  } | null;
}

interface FirmStats {
  totalAssociates: number | null;
  present: number | null;
  absent: number | null;
  leave: number | null;
  remote: number | null;
  expenses: ExpenseRecord[];
  expensesTotal: number | null;
  fixedTotal: number | null;
  manualTotal: number | null;
  hearings: UpcomingHearing[];
  /** Whether each source actually returned usable data — a failed source must
   *  surface as "unavailable", never as zero. */
  associatesOk: boolean;
  attendanceOk: boolean;
  expensesOk: boolean;
  hearingsOk: boolean;
}

function isFixedExpense(e: ExpenseRecord): boolean {
  const type = (e.type ?? "").toUpperCase();
  return type === "FIXED" || type === "SALARY" || type === "PAYROLL";
}

async function loadFirmStats(): Promise<FirmStats> {
  const empty: FirmStats = {
    totalAssociates: null,
    present: null,
    absent: null,
    leave: null,
    remote: null,
    expenses: [],
    expensesTotal: null,
    fixedTotal: null,
    manualTotal: null,
    hearings: [],
    associatesOk: false,
    attendanceOk: false,
    expensesOk: false,
    hearingsOk: false
  };

  try {
    const [associatesRes, attendanceRes, expensesRes, hearingsRes] =
      await Promise.all([
        backendFetch("/associates").catch(() => null),
        backendFetch("/attendance/firm").catch(() => null),
        backendFetch("/expenses").catch(() => null),
        backendFetch("/hearings/upcoming").catch(() => null)
      ]);

    const associates = associatesRes?.ok
      ? await associatesRes.json().catch(() => [])
      : [];
    const attendance: AttendanceRecord[] = attendanceRes?.ok
      ? await attendanceRes.json().catch(() => [])
      : [];
    const expenses: ExpenseRecord[] = expensesRes?.ok
      ? await expensesRes.json().catch(() => [])
      : [];
    const hearings: UpcomingHearing[] = hearingsRes?.ok
      ? await hearingsRes.json().catch(() => [])
      : [];

    // A source counts as OK only if the request succeeded AND the body parsed
    // to a usable array. Anything else is "unavailable", not zero.
    const associatesOk = Array.isArray(associates);
    const attendanceOk = Array.isArray(attendance);
    const expensesOk = Array.isArray(expenses);
    const hearingsOk = Array.isArray(hearings);

    const totalAssociates = associatesOk ? associates.length : null;

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayRecords = attendance.filter((r) => r.date?.startsWith(todayKey));

    const presentSet = new Set(
      todayRecords
        .filter((r) => r.status === "PRESENT")
        .map((r) => r.associateId)
    );
    const leaveSet = new Set(
      todayRecords.filter((r) => r.status === "LEAVE").map((r) => r.associateId)
    );
    // Remote = distinct associates whose only presence today came from a remote
    // check-in. Someone with a biometric PRESENT record is present, not remote,
    // so they must not be counted twice.
    const remoteSet = new Set(
      todayRecords
        .filter(
          (r) => r.source === "REMOTE_CHECKIN" && !presentSet.has(r.associateId)
        )
        .map((r) => r.associateId)
    );

    const present = presentSet.size;
    const leave = leaveSet.size;
    const remote = remoteSet.size;
    // Absent is only trustworthy when both headcount and today's attendance
    // actually loaded; otherwise the whole-firm "absent" figure is fabricated.
    const absent =
      associatesOk && attendanceOk
        ? Math.max(0, associates.length - present - leave - remote)
        : null;

    const fixedTotal = expenses
      .filter(isFixedExpense)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const manualTotal = expenses
      .filter((e) => !isFixedExpense(e))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expensesTotal = fixedTotal + manualTotal;

    return {
      totalAssociates,
      present: associatesOk && attendanceOk ? present : null,
      absent,
      leave: associatesOk && attendanceOk ? leave : null,
      remote: associatesOk && attendanceOk ? remote : null,
      expenses,
      expensesTotal: expensesOk ? expensesTotal : null,
      fixedTotal: expensesOk ? fixedTotal : null,
      manualTotal: expensesOk ? manualTotal : null,
      hearings,
      associatesOk,
      attendanceOk,
      expensesOk,
      hearingsOk
    };
  } catch {
    return empty;
  }
}

export default async function DashboardPage() {
  const { user } = await getSession();

  // Defensive — the (dashboard) layout already redirects unauthenticated
  // visitors, but this also narrows `user` to non-null for the code below.
  if (!user) {
    redirect("/login");
  }

  if (user.role === "SUPER_ADMIN") {
    return <SuperAdminDashboard />;
  }

  // ADMIN: expenses are the only surface they manage.
  if (user.role === "ADMIN") {
    return <AdminDashboard />;
  }

  // ASSOCIATE: personal tasks + attendance, no firm-wide stats.
  if (user.role === "ASSOCIATE") {
    return <AssociateDashboard />;
  }

  const stats = await loadFirmStats();
  const {
    totalAssociates,
    present,
    absent,
    leave,
    remote,
    expenses,
    expensesTotal,
    fixedTotal,
    manualTotal,
    hearings,
    associatesOk,
    attendanceOk,
    expensesOk,
    hearingsOk
  } = stats;

  const expenseValue = expensesTotal == null ? "—" : formatPKR(expensesTotal);
  const fixedValue = fixedTotal == null ? "—" : formatPKR(fixedTotal);
  const manualValue = manualTotal == null ? "—" : formatPKR(manualTotal);

  // Surface failed sources explicitly instead of silently showing partial data
  // as fact. Retry = refresh (this is a server-rendered view).
  const failedSources = [
    !associatesOk && "Headcount",
    !attendanceOk && "Attendance",
    !expensesOk && "Expenses",
    !hearingsOk && "Hearings"
  ].filter((s): s is string => typeof s === "string");

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Firm Operational Dashboard" />

      {/* Partial-fetch warning: a failed source is "unavailable", never zero. */}
      {failedSources.length > 0 && (
        <div
          role="alert"
          className="border-warning/25 bg-warning/10 flex items-start gap-3 rounded-xl border px-4 py-3"
        >
          <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-sm">
            <p className="text-warning-foreground font-bold">
              Some data couldn&apos;t be loaded
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {failedSources.join(", ")}{" "}
              {failedSources.length === 1 ? "is" : "are"} unavailable — showing
              a partial overview.{" "}
              <a
                href="/dashboard"
                className="text-warning-foreground font-bold underline underline-offset-2 hover:opacity-80"
              >
                Retry
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Reorderable landing — every card is a tile the owner can drag into
          their preferred arrangement (persisted per user). */}
      <OwnerDashboardBoard
        userId={user.sub}
        totalAssociates={totalAssociates}
        present={present}
        absent={absent}
        leave={leave}
        remote={remote}
        expenseValue={expenseValue}
        fixedValue={fixedValue}
        manualValue={manualValue}
        hearings={hearings}
        hearingsOk={hearingsOk}
        expenses={expenses}
      />
    </div>
  );
}
