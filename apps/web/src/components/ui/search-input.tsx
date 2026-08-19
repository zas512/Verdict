import { Search } from "lucide-react";
import {
  forwardRef,
  type ChangeEvent,
  type ChangeEventHandler,
  type InputHTMLAttributes
} from "react";

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  onChange?: (value: string) => void;
  onChangeEvent?: ChangeEventHandler<HTMLInputElement>;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onChange, onChangeEvent, value, placeholder = "Search..." }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
      onChangeEvent?.(e);
    };
    return (
      <div className="border-foreground/10 bg-card hover:border-primary/70 focus-within:border-primary focus-within:ring-primary/40 flex h-10 w-full max-w-xs items-center gap-1 rounded-lg border px-3 transition-colors focus-within:ring-2 sm:w-80">
        <Search className="text-muted-foreground size-4" />
        <input
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="text-foreground placeholder:text-foreground/60 h-full w-full flex-1 px-2 text-sm outline-none focus:ring-0 focus:outline-none"
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
