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
        "bg-[#171A20]",
        "border border-[#2A2E36]",
        "shadow-[0_1px_0_rgba(255,255,255,0.08),0_2px_3px_rgba(0,0,0,0.8),0_8px_20px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {/* Top / left highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-t border-l border-white/9"
      />

      {/* Bottom / right dark edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-r border-b border-black/70"
      />

      {/* Inner embossed edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px z-10 rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.035),inset_0_-2px_4px_rgba(0,0,0,0.5)]"
      />

      {metrics.map((m, i) => (
        <div
          key={`${m.label}-${i}`}
          className={cn(
            "relative min-w-0 p-5",
            "flex flex-col justify-center",
            "bg-[#171A20]",
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
