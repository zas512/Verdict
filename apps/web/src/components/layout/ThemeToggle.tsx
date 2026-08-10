"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        type="button"
        className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted relative cursor-pointer"
      >
        <Sun className="size-5 text-muted-foreground" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted relative cursor-pointer"
      title="Toggle Light / Dark theme"
    >
      {isDark ? (
        <Sun className="size-5 text-warning transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="size-5 text-primary transition-transform duration-200 rotate-0 scale-100" />
      )}
    </button>
  );
}
