import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function Card({
  className,
  children
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <div
      data-slot="card"
      className={cn(
        "group relative rounded-lg p-6 border border-border bg-card shadow-xs",
        className
      )}
    >
      {children}
    </div>
  );
}
