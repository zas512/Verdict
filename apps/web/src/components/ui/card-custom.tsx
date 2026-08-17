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
        "group border-border bg-card relative rounded-lg border p-6 shadow-xs",
        className
      )}
    >
      {children}
    </div>
  );
}
