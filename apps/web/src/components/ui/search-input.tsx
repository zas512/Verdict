import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { forwardRef, type ChangeEvent, type ChangeEventHandler } from "react";

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  onChange?: (value: string) => void;
  onChangeEvent?: ChangeEventHandler<HTMLInputElement>;
  containerClassName?: string;
  iconClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "absolute";
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      containerClassName,
      iconClassName,
      onChange,
      onChangeEvent,
      value,
      icon: Icon = Search,
      variant = "default",
      placeholder = "Search...",
      ...props
    },
    ref
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
      onChangeEvent?.(e);
    };

    if (variant === "absolute") {
      return (
        <div className={cn("relative w-full", containerClassName)}>
          {Icon && (
            <Icon
              className={cn(
                "text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2",
                iconClassName
              )}
            />
          )}
          <input
            ref={ref}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(
              "bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/40 h-9 w-full rounded-md border pr-3 pl-9 text-xs transition-colors outline-none focus:ring-1 disabled:pointer-events-none disabled:opacity-50",
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "border-border bg-card hover:border-primary/70 focus-within:border-primary focus-within:ring-primary/40 flex h-10 w-full max-w-xs items-center rounded-md border px-3 transition-colors focus-within:ring-2 sm:w-80",
          containerClassName
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "text-muted-foreground size-5 shrink-0",
              iconClassName
            )}
          />
        )}
        <input
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "text-foreground placeholder:text-muted-foreground h-full w-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none focus:ring-0 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
