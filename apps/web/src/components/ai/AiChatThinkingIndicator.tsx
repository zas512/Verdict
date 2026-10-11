"use client";
import { Scale } from "lucide-react";

export function AiChatThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      {/* Replaced Sparkles with Scale, removed animate-spin */}
      <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-xl shadow-xs">
        <Scale className="text-primary-foreground size-3.5" />
      </div>
      <div className="border-border bg-card flex flex-col gap-1.5 rounded-2xl rounded-tl-sm border px-4 py-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground text-sm font-bold">
            Verdict AI
          </span>
          <span className="text-muted-foreground text-xs">
            is generating...
          </span>
        </div>
        <div className="flex items-center gap-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="bg-primary size-2 rounded-full opacity-60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}