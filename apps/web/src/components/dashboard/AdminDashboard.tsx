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
      <div className="text-muted-foreground flex items-center justify-center py-16 text-xs font-semibold">
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
      <HeaderUpdater title="Expense Overview" />

      {/* Expense summary */}
      <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
        <CardHeader className="pt-4 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            Expenses & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-foreground text-4xl font-black tracking-tight">
            {formatPKR(expensesTotal)}
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
                {formatPKR(fixedTotal)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs font-extrabold tracking-wider uppercase">
                Manual expenses
              </span>
              <p className="text-foreground mt-0.5 text-lg font-bold">
                {formatPKR(manualTotal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardAnalytics expenses={expenses} />
    </div>
  );
}
