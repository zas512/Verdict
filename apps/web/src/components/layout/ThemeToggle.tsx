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
    () => false,
  );

  if (!mounted) {
    return (
      <button
        type="button"
        className="bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted relative flex size-9 cursor-pointer items-center justify-center rounded-md border"
      >
        <Sun className="text-muted-foreground size-5" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted relative flex size-9 cursor-pointer items-center justify-center rounded-md border"
      title="Toggle Light / Dark theme"
    >
      {isDark ? (
        <Sun className="text-warning size-5 scale-100 rotate-0 transition-transform duration-200" />
      ) : (
        <Moon className="text-primary size-5 scale-100 rotate-0 transition-transform duration-200" />
      )}
    </button>
  );
}
