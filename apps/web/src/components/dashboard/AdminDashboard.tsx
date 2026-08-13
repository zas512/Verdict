import dynamic from "next/dynamic";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPKR } from "@/lib/format";
import { backendFetch } from "@/lib/server-api";
import { Receipt, Wallet } from "lucide-react";
import type { ExpenseRecord } from "@/app/(dashboard)/dashboard/page";

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

function isFixedExpense(e: ExpenseRecord): boolean {
  const type = (e.type ?? "").toUpperCase();
  return type === "FIXED" || type === "SALARY" || type === "PAYROLL";
}

interface AdminStats {
  expenses: ExpenseRecord[];
  fixedTotal: number;
  manualTotal: number;
  expensesTotal: number;
}

async function loadAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    expenses: [],
    fixedTotal: 0,
    manualTotal: 0,
    expensesTotal: 0
  };
  try {
    const expensesRes = await backendFetch("/expenses").catch(() => null);
    const expenses: ExpenseRecord[] = expensesRes?.ok
      ? await expensesRes.json().catch(() => [])
      : [];
    const fixedTotal = expenses
      .filter(isFixedExpense)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const manualTotal = expenses
      .filter((e) => !isFixedExpense(e))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return {
      expenses,
      fixedTotal,
      manualTotal,
      expensesTotal: fixedTotal + manualTotal
    };
  } catch {
    return empty;
  }
}

/**
 * ADMIN sees only the firm's expenses — no headcount or attendance tiles.
 * Mirrors the role matrix: ADMIN manages expenses and nothing else.
 */
export async function AdminDashboard() {
  const { expenses, fixedTotal, manualTotal, expensesTotal } =
    await loadAdminStats();

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Expense Overview" breadcrumb="Billing" />

      {/* Expense summary */}
      <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Expenses & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-4xl font-black text-foreground tracking-tight">
            {formatPKR(expensesTotal)}
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-1 mb-4">
            Monthly operational expenses (PKR)
          </p>

          <div className="border-t border-border/80 my-3" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Fixed salaries</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{formatPKR(fixedTotal)}</p>
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Manual expenses</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{formatPKR(manualTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardAnalytics expenses={expenses} />
    </div>
  );
}
