"use client";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function AiChatThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="bg-primary text-primary-foreground relative flex size-7 shrink-0 items-center justify-center rounded-xl shadow-xs">
        <Sparkles className="text-primary-foreground size-3.5 animate-spin" />
      </div>
      <div className="border-border bg-card flex flex-col gap-1.5 rounded-2xl rounded-tl-sm border px-4 py-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground text-[11px] font-bold">
            Verdict AI
          </span>
          <span className="text-muted-foreground text-[10px]">
            is generating...
          </span>
        </div>
        <div className="flex items-center gap-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="bg-primary size-2 rounded-full"
              animate={{
                y: [0, -5, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
