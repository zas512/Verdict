import type { UpcomingHearing } from "@/app/(dashboard)/dashboard/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CalendarX2,
  ChevronRight,
  Scale
} from "lucide-react";
import Link from "next/link";

const fmtTime = new Intl.DateTimeFormat("en-PK", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

/** UTC start-of-day so day math is stable regardless of the renderer's TZ. */
function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Relative Tareekh label: Today / Tomorrow / in N days. */
function dayLabel(dateIso: string): string {
  const diff = Math.round(
    (startOfUtcDay(new Date(dateIso)) - startOfUtcDay(new Date())) / 86_400_000
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} days`;
}

function HearingRow({ hearing }: { hearing: UpcomingHearing }) {
  const date = new Date(hearing.hearingDate);
  const weekday = date.toLocaleDateString("en-PK", { weekday: "short" });
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("en-PK", { month: "short" });
  const matter = hearing.matter;

  return (
    <li>
      <Link
        href={`/matters/${hearing.matterId}`}
        className="group flex items-start gap-3 rounded-lg px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        {/* Date block */}
        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-primary/5 py-1.5 ring-1 ring-inset ring-primary/15">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {weekday}
          </span>
          <span className="text-xl font-black leading-none text-primary">
            {day}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {month}
          </span>
        </div>

        {/* Matter + purpose */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {hearing.purpose}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold text-muted-foreground">
            <Scale className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">
              <span className="font-mono font-semibold">
                {matter?.firmCaseNumber ?? "Matter"}
              </span>
              {matter?.clientName ? ` · ${matter.clientName}` : ""}
            </span>
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground/80">
            {[matter?.court, matter?.bench, matter?.currentStage?.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* Relative date + time */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {dayLabel(hearing.hearingDate)}
          </span>
          <span className="text-[11px] font-mono font-semibold text-muted-foreground">
            {fmtTime.format(date)}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </li>
  );
}

/**
 * Upcoming Tareekh for the firm. Server-rendered: the dashboard already holds
 * the hearings payload, so this stays presentational and needs no fetch.
 */
export function UpcomingHearings({
  hearings,
  ok,
  className
}: {
  hearings: UpcomingHearing[];
  ok: boolean;
  className?: string;
}) {
  const upcoming = [...hearings].sort(
    (a, b) =>
      new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime()
  );

  return (
    <Card className={cn("skeuo-card bg-card text-card-foreground relative overflow-hidden", className)}>

      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          Upcoming Hearings
        </CardTitle>
        <Badge variant="navy">Tareekh</Badge>
      </CardHeader>
      <CardContent className="pb-4">
        {!ok ? (
          <p className="py-6 text-center text-xs font-medium text-muted-foreground">
            Couldn&apos;t load upcoming hearings — refresh to retry.
          </p>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <CalendarX2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">
              No hearings on the calendar
            </p>
            <p className="max-w-xs text-xs font-medium text-muted-foreground">
              Upcoming Tareekh will appear here as hearings are scheduled.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {upcoming.slice(0, 5).map((h) => (
                <HearingRow key={h.id} hearing={h} />
              ))}
            </ul>
            {upcoming.length > 5 && (
              <p className="pt-2 text-center text-[11px] font-semibold text-muted-foreground">
                +{upcoming.length - 5} more upcoming
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
