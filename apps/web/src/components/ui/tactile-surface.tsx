import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TactileSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function TactileSurface({ children, className }: Readonly<TactileSurfaceProps>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] transition-colors duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}
