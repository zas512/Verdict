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
  filters: [ToolbarFilter, ...ToolbarFilter[]];
  actions?: ToolbarAction[];
}

export function Filters({
  search,
  filters,
  actions = []
}: Readonly<DataToolbarProps>) {
  return (
    <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {search && (
          <SearchInput
            aria-label={search.ariaLabel ?? "Search"}
            placeholder={search.placeholder ?? "Search..."}
            value={search.value}
            onChange={search.onChange}
          />
        )}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger aria-label={filter.ariaLabel} className="w-44">
              <SelectValue
                placeholder={filter.placeholder}
                className={
                  filter.value === "ALL" ? "text-muted-foreground" : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {actions
          .filter((action) => !action.hidden)
          .map((action) => (
            <button
              type="button"
              key={action.key}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={cn(
                "h-10 rounded-full px-3 bg-card border border-border flex items-center gap-2 justify-center text-white hover:bg-muted relative cursor-pointer",
                action.className
              )}
            >
              {action.icon && (
                <span className={action.loading ? "animate-spin" : undefined}>
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
      </div>
    </section>
  );
}
