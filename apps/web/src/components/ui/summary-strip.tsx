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

export function SummaryStrip({
  metrics,
  className
}: Readonly<SummaryStripProps>) {
  return (
    <div
      className={cn(
        "relative grid grid-cols-2 md:grid-cols-4",
        "overflow-hidden rounded-xl",
        "bg-card",
        "border border-border/80 dark:border-[#2A2E36]",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none",
        className
      )}
    >
      {/* Top / left highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-t border-l border-transparent dark:border-white/9"
      />

      {/* Bottom / right dark edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-r border-b border-black/[0.04] dark:border-black/70"
      />

      {/* Inner embossed edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px z-10 rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.035),inset_0_-2px_4px_rgba(0,0,0,0.5)]"
      />

      {metrics.map((m, i) => (
        <div
          key={`${m.label}-${i}`}
          className={cn(
            "relative min-w-0 p-5",
            "flex flex-col justify-center",
            "bg-card",
            "divide-border/50",
            i % 2 === 0 ? "border-border/50 border-r md:border-r-0" : "",
            i >= 2 ? "border-border/50 border-t md:border-t-0" : "",
            "md:border-border/50 md:border-r",
            i === metrics.length - 1 && "md:border-r-0"
          )}
        >
          {/* Metric-specific accent */}
          {m.accentColor && (
            <div
              className="absolute top-3 bottom-3 left-0 w-0.5 rounded-r-full opacity-80"
              style={{
                backgroundColor: m.accentColor,
                boxShadow: `0 0 8px ${m.accentColor}40`
              }}
            />
          )}

          <span className="text-foreground/70 text-sm font-semibold tracking-[0.16em] uppercase">
            {m.label}
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-foreground text-3xl leading-none font-semibold tracking-tight">
              {m.value}
            </span>

            {m.indicator && (
              <span
                className={cn(
                  "text-xs font-medium",
                  m.indicatorColor ?? "text-[#858994]"
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
