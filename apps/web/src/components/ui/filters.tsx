"use client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ReactNode } from "react";

export interface ToolbarFilterOption {
  value: string;
  label: string;
}

export interface ToolbarFilter {
  key: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder: string;
  options: ToolbarFilterOption[];
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "outline";
  disabled?: boolean;
  hidden?: boolean;
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
              <SelectValue placeholder={filter.placeholder} />
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
            <Button
              key={action.key}
              variant={action.variant}
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.className ??
                "rounded-full h-10 text-sm font-semibold border-border"
              }
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
      </div>
    </section>
  );
}
