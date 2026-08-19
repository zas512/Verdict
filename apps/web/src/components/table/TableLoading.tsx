import { Loader2 } from "lucide-react";

export function TableLoading({
  loadingLabel
}: Readonly<{
  loadingLabel: string;
}>) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl">
        <Loader2 className="text-primary h-5 w-5 animate-spin" />
      </div>
      <p className="text-foreground/90 text-xs font-bold tracking-[0.14em] uppercase">
        {loadingLabel}
      </p>
    </div>
  );
}
