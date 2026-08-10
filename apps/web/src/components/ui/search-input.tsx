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
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none",
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
              "w-full h-9 pl-9 pr-3 text-xs bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:pointer-events-none disabled:opacity-50",
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
          "w-full max-w-xs sm:w-80 h-10 flex items-center px-3 rounded-xl border border-border bg-card transition-colors hover:border-primary/70 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40",
          containerClassName
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "size-5 text-muted-foreground shrink-0",
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
            "flex-1 h-full w-full min-w-0 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border-0 focus:ring-0 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
