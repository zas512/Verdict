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
import { RefreshCw, Plus } from "lucide-react";

export interface ToolbarFilterOption {
  value: string;
  label?: string;
}

export interface ToolbarFilter {
  key: string;
  value: string;
  onChange: (value: string) => void;
  options: ToolbarFilterOption[];
  ariaLabel?: string;
  placeholder?: string;
}

interface DataToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
    placeholder?: string;
  };
  filters?: [ToolbarFilter, ...ToolbarFilter[]];
  refresh: () => void | Promise<void>;
  addNewLable: string;
  addNewOnClick: () => void | Promise<void>;
  isRefetching?: boolean;
}

export function Filters({
  search,
  filters,
  refresh,
  addNewLable = "Add New",
  addNewOnClick,
  isRefetching
}: Readonly<DataToolbarProps>) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <section className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
        {search && (
          <SearchInput
            aria-label={search.ariaLabel ?? "Search"}
            placeholder={search.placeholder ?? "Search..."}
            value={search.value}
            onChange={search.onChange}
          />
        )}
        {filters?.map((filter) => {
          const isDefault = filter.value === filter.options[0]?.value;
          return (
            <Select
              key={filter.key}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger
                aria-label={filter.ariaLabel}
                className={cn(
                  "border-foreground/10 bg-card hover:border-border hover:bg-card hover:text-foreground focus:ring-primary/30 h-10 w-36 rounded-lg border text-sm font-medium transition-all duration-150 focus:ring-1 focus:ring-offset-0 active:translate-y-px",
                  isDefault ? "text-foreground/60" : "text-foreground"
                )}
              >
                <SelectValue
                  placeholder={filter.placeholder ?? "Select..."}
                  className={
                    isDefault ? "text-foreground/60" : "text-foreground"
                  }
                />
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
          );
        })}
      </section>
      <section className="flex items-center gap-4">
        <button
          type="button"
          onClick={addNewOnClick}
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
        >
          <Plus className="size-4" />
          {addNewLable}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefetching}
          className="bg-card hover:bg-card/90 border-primary/80 text-primary flex size-10 cursor-pointer items-center justify-center rounded-lg border disabled:opacity-50"
        >
          <RefreshCw className={cn("size-5", isRefetching && "animate-spin")} />
        </button>
      </section>
    </div>
  );
}
