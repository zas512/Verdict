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
        "rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.35),0_8px_24px_rgba(0,0,0,0.18)] dark:border-[rgba(255,255,255,0.065)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_2px_4px_rgba(0,0,0,0.30),0_10px_24px_rgba(0,0,0,0.16)] transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
