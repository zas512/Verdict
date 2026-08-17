import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TactileSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function TactileSurface({
  children,
  className
}: Readonly<TactileSurfaceProps>) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors duration-150 dark:border-[rgba(255,255,255,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}
