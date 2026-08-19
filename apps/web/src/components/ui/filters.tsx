"use client";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

export interface ToolbarFilterOption {
  value: string;
  label: string;
}

export interface ToolbarFilter {
  key: string;
  value: string;
  onChange: (value: string) => void;
  options: ToolbarFilterOption[];
  ariaLabel?: string;
  placeholder?: string;
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
  className?: string;
}

interface DataToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
    placeholder?: string;
  };
  filters?: [ToolbarFilter, ...ToolbarFilter[]];
  actions?: ToolbarAction[];
}

export function Filters({
  search,
  filters,
  actions = []
}: Readonly<DataToolbarProps>) {
  const visibleActions = actions.filter((action) => !action.hidden);

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {search && (
          <SearchInput
            aria-label={search.ariaLabel ?? "Search"}
            placeholder={search.placeholder ?? "Search..."}
            value={search.value}
            onChange={search.onChange}
            className="border-primary/70 bg-card text-foreground shadow-[ inset_0_2px_4px_rgba(0,0,0,0.30), inset_0_1px_0_rgba(255,255,255,0.025) ] placeholder:text-muted-foreground/55 hover:border-border focus-within:border-primary/35 focus-within:shadow-[ inset_0_2px_4px_rgba(0,0,0,0.30), inset_0_1px_0_rgba(255,255,255,0.025), 0_0_0_1px_rgba(212,169,79,0.08) ] h-10 w-full rounded-md border text-sm transition-all duration-150 sm:w-[320px]"
          />
        )}
        {filters?.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger
              aria-label={filter.ariaLabel}
              className="border-border/70 bg-card text-muted-foreground shadow-[ inset_0_2px_4px_rgba(0,0,0,0.30), inset_0_1px_0_rgba(255,255,255,0.025) ] hover:border-border hover:bg-card hover:text-foreground focus:ring-primary/30 data-placeholder:text-muted-foreground/60 h-10 w-36 rounded-md border text-sm font-medium transition-all duration-150 focus:ring-1 focus:ring-offset-0 active:translate-y-px"
            >
              <SelectValue placeholder={filter.placeholder ?? "Select..."} />
            </SelectTrigger>
            <SelectContent className="border-border/80 bg-popover shadow-[ 0_10px_25px_rgba(0,0,0,0.45), 0_2px_6px_rgba(0,0,0,0.30) ] min-w-36">
              {filter.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="focus:bg-muted/40 focus:text-foreground data-[state=checked]:bg-primary/8 data-[state=checked]:text-foreground text-sm"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {visibleActions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {visibleActions.map((action) => {
            const isPrimary =
              action.key === "add" ||
              action.key === "create" ||
              action.className?.includes("bg-primary");
            return (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn(
                  `inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-all duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40`,
                  isPrimary
                    ? `border-primary/30 bg-primary text-primary-foreground shadow-[ 0_1px_0_rgba(255,255,255,0.12), 0_2px_4px_rgba(0,0,0,0.35), 0_5px_10px_rgba(0,0,0,0.18) ] hover:bg-primary/90 active:shadow-[ inset_0_2px_4px_rgba(0,0,0,0.25) ]`
                    : `border-border/70 bg-card text-foreground shadow-[ 0_1px_0_rgba(255,255,255,0.04), 0_2px_3px_rgba(0,0,0,0.28), inset_0_1px_0_rgba(255,255,255,0.02) ] hover:border-border hover:bg-muted/20 active:shadow-[ inset_0_2px_4px_rgba(0,0,0,0.30) ]`,
                  action.className
                )}
              >
                {action.icon && (
                  <span
                    className={cn("shrink-0", action.loading && "animate-spin")}
                  >
                    {action.loading ? (
                      <Loader2 className="size-4" />
                    ) : (
                      action.icon
                    )}
                  </span>
                )}
                {action?.label && <span>{action.label}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
