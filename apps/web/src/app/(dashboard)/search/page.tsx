import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { formatPKR } from "@/lib/format";
import { backendFetch } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import {
  Building2,
  ChevronRight,
  ListChecks,
  Receipt,
  Scale,
  Search,
  SearchX,
  Users
} from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchKind = "matters" | "associates" | "expenses" | "tasks" | "firms";

interface SearchResult {
  kind: SearchKind;
  label: string;
  meta: string;
  href: string;
}

/** Which modules a role may search — mirrors the API role matrix. */
const ROLE_SCOPES: Record<string, SearchKind[]> = {
  OWNER: ["matters", "associates", "expenses", "tasks"],
  ADMIN: ["expenses"],
  ASSOCIATE: ["matters", "tasks"],
  SUPER_ADMIN: ["firms"]
};

const ENDPOINTS: Record<SearchKind, string> = {
  matters: "/matters",
  associates: "/associates",
  expenses: "/expenses",
  tasks: "/tasks",
  firms: "/firms"
};

const KIND_META: Record<
  SearchKind,
  {
    title: string;
    singular: string;
    Icon: ComponentType<{ className?: string }>;
  }
> = {
  matters: { title: "Matters & Cases", singular: "Matter", Icon: Scale },
  associates: {
    title: "Associates & Staff",
    singular: "Associate",
    Icon: Users
  },
  expenses: { title: "Expenses & Billing", singular: "Expense", Icon: Receipt },
  tasks: { title: "Tasks", singular: "Task", Icon: ListChecks },
  firms: { title: "Firms", singular: "Firm", Icon: Building2 }
};

const includes = (q: string, ...fields: unknown[]) =>
  fields.some((f) => f != null && String(f).toLowerCase().includes(q));

function resultsFor(kind: SearchKind, items: any[], q: string): SearchResult[] {
  switch (kind) {
    case "matters":
      return items
        .filter((m) =>
          includes(
            q,
            m.firmCaseNumber,
            m.courtCaseNumber,
            m.cnr,
            m.caseType,
            m.court,
            m.bench,
            m.clientName,
            m.currentStage?.name,
            m.status
          )
        )
        .map((m) => ({
          kind,
          label: `${m.firmCaseNumber ?? "Matter"} · ${m.clientName ?? "—"}`,
          meta: [m.caseType, m.court, m.currentStage?.name ?? m.status]
            .filter(Boolean)
            .join(" · "),
          href: `/matters/${m.id}`
        }));
    case "associates":
      return items
        .filter((a) => includes(q, a.name, a.email, a.role))
        .map((a) => ({
          kind,
          label: a.name ?? a.email ?? "Associate",
          meta: [a.role, a.email].filter(Boolean).join(" · "),
          href: "/associates"
        }));
    case "expenses":
      return items
        .filter((e) => includes(q, e.category, e.type))
        .map((e) => ({
          kind,
          label: e.category ?? e.type ?? "Expense",
          meta: [e.type, e.amount ? formatPKR(Number(e.amount)) : null]
            .filter(Boolean)
            .join(" · "),
          href: "/expenses"
        }));
    case "tasks":
      return items
        .filter((t) =>
          includes(
            q,
            t.title,
            t.status,
            t.priority,
            t.matter?.firmCaseNumber,
            t.matter?.clientName
          )
        )
        .map((t) => ({
          kind,
          label: t.title ?? "Task",
          meta: [t.status, t.priority, t.matter?.firmCaseNumber]
            .filter(Boolean)
            .join(" · "),
          href: "/tasks"
        }));
    case "firms":
      return items
        .filter((f) => includes(q, f.name))
        .map((f) => ({
          kind,
          label: f.name ?? "Firm",
          meta: "Platform",
          href: "/platform"
        }));
  }
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const { q: rawQuery } = await searchParams;
  const query = rawQuery?.trim() ?? "";
  const q = query.toLowerCase();
  const scopes = ROLE_SCOPES[user.role] ?? [];

  const groups = await Promise.all(
    scopes.map(async (kind) => {
      const res = await backendFetch(ENDPOINTS[kind]).catch(() => null);
      const items = res?.ok ? await res.json().catch(() => null) : null;
      if (!Array.isArray(items)) {
        return { kind, results: [] as SearchResult[], unavailable: true };
      }
      if (!q)
        return { kind, results: [] as SearchResult[], unavailable: false };
      return { kind, results: resultsFor(kind, items, q), unavailable: false };
    })
  );

  const totalResults = groups.reduce((n, g) => n + g.results.length, 0);
  const anyUnavailable = groups.some((g) => g.unavailable);

  return (
    <div className="space-y-6">
      <HeaderUpdater title={q ? `Results for “${query}”` : "Global Search"} />

      {q === "" ? (
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground text-sm font-bold">
                Search the firm
              </p>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs font-medium">
                Find matters, associates, expenses, and tasks by case number,
                client, category, or keyword. Results appear as you type.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : totalResults === 0 ? (
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-2xl">
              <SearchX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground text-sm font-bold">
                No matches for “{query}”
              </p>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs font-medium">
                Try a case number, client name, or category.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="skeuo-card bg-card text-card-foreground overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {totalResults} {totalResults === 1 ? "result" : "results"}
            </CardTitle>
            <CardDescription>for “{query}”</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-0 pt-0 pb-0">
            {groups.map(({ kind, results, unavailable }) => {
              const { Icon, title } = KIND_META[kind];
              return (
                (results.length > 0 || unavailable) && (
                  <section key={kind}>
                    <div className="flex items-center justify-between px-5 pb-2">
                      <div className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                        <Icon className="h-3.5 w-3.5" />
                        {title}
                      </div>
                      {unavailable ? (
                        <span className="text-warning text-[11px] font-semibold tracking-wide uppercase">
                          Unavailable
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px] font-bold">
                          {results.length}
                        </span>
                      )}
                    </div>
                    <div className="divide-border/60 border-border/60 divide-y border-t">
                      {unavailable ? (
                        <p className="text-muted-foreground px-5 py-3 text-xs font-medium">
                          Couldn&apos;t load{" "}
                          {KIND_META[kind].title.toLowerCase()} — refresh to
                          retry.
                        </p>
                      ) : (
                        results.map((r, i) => (
                          <Link
                            key={`${r.kind}-${i}`}
                            href={r.href}
                            className="group hover:bg-muted/60 focus-visible:bg-muted/60 flex items-center justify-between gap-3 px-5 py-3 transition-colors focus-visible:outline-none"
                          >
                            <div className="min-w-0">
                              <p className="text-foreground truncate text-sm font-semibold">
                                {r.label}
                              </p>
                              <p className="text-muted-foreground truncate text-xs font-medium">
                                {r.meta}
                              </p>
                            </div>
                            <ChevronRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        ))
                      )}
                    </div>
                  </section>
                )
              );
            })}
            {anyUnavailable && (
              <p className="border-border/60 text-muted-foreground border-t px-5 py-3 text-[11px] font-medium">
                Some sections couldn&apos;t be loaded and are marked
                unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
