import type { UpcomingHearing } from "@/app/(dashboard)/dashboard/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarDays, CalendarX2, ChevronRight, Scale } from "lucide-react";
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
        className="group hover:bg-muted/50 focus-visible:bg-muted/50 -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors focus-visible:outline-none"
      >
        {/* Date block */}
        <div className="bg-primary/5 ring-primary/15 flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 ring-1 ring-inset">
          <span className="text-muted-foreground text-[11px] font-bold tracking-wide uppercase">
            {weekday}
          </span>
          <span className="text-primary text-xl leading-none font-black">
            {day}
          </span>
          <span className="text-muted-foreground text-[11px] font-bold tracking-wide uppercase">
            {month}
          </span>
        </div>

        {/* Matter + purpose */}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-bold">
            {hearing.purpose}
          </p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold">
            <Scale className="text-primary/70 h-3 w-3 shrink-0" />
            <span className="truncate">
              <span className="font-mono font-semibold">
                {matter?.firmCaseNumber ?? "Matter"}
              </span>
              {matter?.clientName ? ` · ${matter.clientName}` : ""}
            </span>
          </p>
          <p className="text-muted-foreground/80 mt-0.5 truncate text-xs font-medium">
            {[matter?.court, matter?.bench, matter?.currentStage?.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* Relative date + time */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-primary text-[11px] font-bold tracking-wide uppercase">
            {dayLabel(hearing.hearingDate)}
          </span>
          <span className="text-muted-foreground font-mono text-[11px] font-semibold">
            {fmtTime.format(date)}
          </span>
        </div>
        <ChevronRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
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
    <Card
      className={cn(
        "skeuo-card bg-card text-card-foreground relative overflow-hidden",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-3">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
          <CalendarDays className="text-primary h-4 w-4" />
          Upcoming Hearings
        </CardTitle>
        <Badge variant="navy">Tareekh</Badge>
      </CardHeader>
      <CardContent className="pb-4">
        {!ok ? (
          <p className="text-muted-foreground py-6 text-center text-xs font-medium">
            Couldn&apos;t load upcoming hearings — refresh to retry.
          </p>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-2xl">
              <CalendarX2 className="h-5 w-5" />
            </div>
            <p className="text-foreground text-sm font-bold">
              No hearings on the calendar
            </p>
            <p className="text-muted-foreground max-w-xs text-xs font-medium">
              Upcoming Tareekh will appear here as hearings are scheduled.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-border/60 divide-y">
              {upcoming.slice(0, 5).map((h) => (
                <HearingRow key={h.id} hearing={h} />
              ))}
            </ul>
            {upcoming.length > 5 && (
              <p className="text-muted-foreground pt-2 text-center text-[11px] font-semibold">
                +{upcoming.length - 5} more upcoming
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
