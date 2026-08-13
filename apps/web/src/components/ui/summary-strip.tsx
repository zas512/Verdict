import { cn } from "@/lib/utils";

export interface SummaryMetric {
  label: string;
  value: string | number;
  indicator?: string;
  indicatorColor?: string;
  accentColor?: string;
}

interface SummaryStripProps {
  metrics: SummaryMetric[];
  className?: string;
}

export function SummaryStrip({ metrics, className }: Readonly<SummaryStripProps>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border border-border bg-card rounded-lg overflow-hidden shadow-xs",
        className
      )}
    >
      {metrics.map((m, i) => (
        <div
          key={`${m.label}-${i}`}
          className="p-5 flex flex-col justify-center min-w-0 relative"
        >
          {m.accentColor && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: m.accentColor }}
            />
          )}
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {m.label}
          </span>
          <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
            <span className="text-3xl font-black tracking-tight text-foreground">
              {m.value}
            </span>
            {m.indicator && (
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wide",
                  m.indicatorColor ?? "text-muted-foreground"
                )}
              >
                {m.indicator}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
