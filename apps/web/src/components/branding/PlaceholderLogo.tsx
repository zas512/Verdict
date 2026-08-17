import { cn } from "@/lib/utils";

/** Firm accent fallback when a firm has not set its own color. */
export const DEFAULT_ACCENT = "#2563EB";

interface PlaceholderLogoProps {
  /** Name used to derive the initials (firm name or user name). */
  name: string;
  accentColor?: string | null;
  /** Side length in px. */
  size?: number;
  rounded?: string;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return letters.toUpperCase();
}

/**
 * Initials on an accent-colored rounded square — the placeholder used whenever
 * a firm has no logo (and the same visual language backs user avatars).
 */
export function PlaceholderLogo({
  name,
  accentColor,
  size = 36,
  rounded = "rounded-xl",
  className
}: Readonly<PlaceholderLogoProps>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden font-black text-white select-none",
        rounded,
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: accentColor ?? DEFAULT_ACCENT
      }}
    >
      <span
        className="leading-none"
        style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
      >
        {initialsOf(name)}
      </span>
    </div>
  );
}
