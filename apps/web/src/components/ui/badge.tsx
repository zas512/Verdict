import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-white hover:bg-destructive/80",
        outline: "text-foreground border-border",
        navy: "border-primary/20 bg-primary/10 text-primary font-bold",
        emerald: "border-success/20 bg-success/10 text-success font-bold",
        amber: "border-warning/20 bg-warning/10 text-warning font-bold"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

// Status variants carry meaning that assistive tech should announce; the
// neutral variants (default/secondary/outline/navy) are decorative labels.
const STATUS_VARIANTS = new Set(["emerald", "amber", "destructive"]);

function Badge({ className, variant, role, ...props }: BadgeProps) {
  const isStatus = variant ? STATUS_VARIANTS.has(variant) : false;
  return (
    <div
      role={isStatus ? (role ?? "status") : role}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
