import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InsetSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function InsetSurface({ children, className }: Readonly<InsetSurfaceProps>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-muted/10 p-3.5 dark:bg-[#121419] dark:border-[rgba(255,255,255,0.035)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),inset_0_-1px_0_rgba(255,255,255,0.05)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.45),inset_0_-1px_0_rgba(255,255,255,0.018)]",
        className
      )}
    >
      {children}
    </div>
  );
}
