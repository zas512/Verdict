"use client";
import { AI_CONFIG } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { RotateCcw, Sparkles, X } from "lucide-react";

interface AiChatHeaderProps {
  onClose: () => void;
}

export function AiChatHeader({ onClose }: Readonly<AiChatHeaderProps>) {
  const { clearChat, messages } = useAiChat();
  return (
    <header className="border-border bg-card flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-primary text-primary-foreground relative flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs">
          <Sparkles className="size-5 animate-pulse" />
          <span className="border-card absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 bg-emerald-500" />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-foreground truncate text-sm font-bold tracking-tight">
              {AI_CONFIG.name}
            </h2>
            <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2 py-0.5 text-[10px] font-semibold">
              {AI_CONFIG.badge}
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="truncate">{AI_CONFIG.modelName}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            title="Clear current chat"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
          >
            <RotateCcw className="size-4" />
            <span className="sr-only">Clear conversation</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Close AI Assistant (Esc)"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
        >
          <X className="size-4.5" />
          <span className="sr-only">Close sidebar</span>
        </button>
      </div>
    </header>
  );
}
