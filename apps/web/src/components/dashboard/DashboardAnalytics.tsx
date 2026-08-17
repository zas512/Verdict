"use client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { ExpenseRecord } from "@/app/(dashboard)/dashboard/page";
import { PieChart as PieIcon, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const FIXED_EXPENSE_TYPES = new Set(["FIXED", "SALARY", "PAYROLL"]);

/** Pakistan's fiscal year runs 1 July – 30 June, so "FY 2025–26" spans that. */
function pakistaniFiscalYearLabel(now = new Date()): string {
  const fy = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `FY ${fy}–${String(fy + 1).slice(2)}`;
}
const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)"
];

function aggregateExpenses(expenses: ExpenseRecord[]) {
  const monthlyMap = new Map<string, { fixed: number; manual: number }>();
  const categoryMap = new Map<string, number>();

  for (const e of expenses) {
    const amount = Number(e.amount) || 0;
    if (amount <= 0) continue;
    const dateStr = e.date || e.createdAt || "";
    const monthKey = dateStr.slice(0, 7);
    const isFixed = FIXED_EXPENSE_TYPES.has((e.type ?? "").toUpperCase());

    if (monthKey) {
      const entry = monthlyMap.get(monthKey) ?? { fixed: 0, manual: 0 };
      if (isFixed) entry.fixed += amount;
      else entry.manual += amount;
      monthlyMap.set(monthKey, entry);
    }

    const category = e.category?.trim() || "Other";
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + amount);
  }

  const monthlyData = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, value]) => ({
      month: new Date(`${monthKey}-01`).toLocaleDateString(undefined, {
        month: "short"
      }),
      fixed: value.fixed,
      manual: value.manual
    }));

  const categoryTotals = [...categoryMap.entries()];
  const grandTotal =
    categoryTotals.reduce((sum, [, value]) => sum + value, 0) || 1;
  const categoryData = categoryTotals
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value], i) => ({
      name,
      value: Math.round((value / grandTotal) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length]
    }));

  return { monthlyData, categoryData };
}

function EmptyChartState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="skeuo-card bg-card text-card-foreground md:col-span-12">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <PieIcon className="text-primary h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs font-medium">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <PieIcon className="text-muted-foreground/40 h-10 w-10" />
          <p className="text-foreground text-sm font-bold">
            No expense records yet
          </p>
          <p className="text-muted-foreground max-w-sm text-xs">
            Expense trends and allocation charts will appear here once billing
            data is recorded for this firm.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardAnalytics({
  expenses = []
}: {
  expenses?: ExpenseRecord[];
}) {
  const { monthlyData, categoryData } = useMemo(
    () => aggregateExpenses(expenses),
    [expenses]
  );

  if (monthlyData.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyChartState
          title="Monthly Financial Overhead"
          description="Fixed payroll salaries vs manual operational expenses"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Chart: Monthly Expense Trends */}
        <Card className="skeuo-card bg-card text-card-foreground md:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <TrendingUp className="text-primary h-4 w-4" />
                Monthly Financial Overhead
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-medium">
                Fixed payroll salaries vs manual operational expenses
              </CardDescription>
            </div>
            <Badge variant="navy">{pakistaniFiscalYearLabel()}</Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                      fontWeight: 600
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                      fontWeight: 600
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                      color: "var(--card-foreground)",
                      fontWeight: 600
                    }}
                    formatter={(value) =>
                      new Intl.NumberFormat("en-PK", {
                        style: "currency",
                        currency: "PKR",
                        maximumFractionDigits: 0
                      }).format(Number(value) || 0)
                    }
                  />
                  <Bar
                    dataKey="fixed"
                    name="Fixed Salaries"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="manual"
                    name="Manual Expenses"
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Chart: Category Breakdown Donut */}
        <Card className="skeuo-card bg-card text-card-foreground md:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <PieIcon className="text-primary h-4 w-4" />
                Expense Allocation
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-medium">
                Categorical distribution of firm budget
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex h-52 w-full items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    shape={(props) => {
                      const { ...rest } = props;
                      return <path {...rest} fill={props.payload.color} />;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      fontSize: "12px",
                      color: "var(--card-foreground)",
                      fontWeight: 600
                    }}
                    formatter={(value) => `${value}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="border-border grid grid-cols-2 gap-2 border-t pt-2">
              {categoryData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate font-semibold">
                    {item.name}:
                  </span>
                  <span className="text-foreground font-bold">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
