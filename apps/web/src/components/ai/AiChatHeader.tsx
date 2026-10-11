"use client";
import { AI_CONFIG } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { RotateCcw, Scale, X } from "lucide-react";

interface AiChatHeaderProps {
  onClose: () => void;
}

export function AiChatHeader({ onClose }: Readonly<AiChatHeaderProps>) {
  const { clearChat, messages } = useAiChat();
  return (
    <header className="skeuo-card bg-card border-border/60 flex h-18 shrink-0 items-center justify-between border-b px-6">
      <div className="flex min-w-0 items-center gap-4">
        {/* Scale emblem — static, no pulse */}
        <div className="bg-primary text-primary-foreground ring-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs ring-1">
          <Scale className="size-5" strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-foreground truncate text-base leading-none font-bold tracking-tight">
            {AI_CONFIG.name}
          </h2>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide">
            <span className="truncate">{AI_CONFIG.modelName}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Legal Intelligence</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            title="Clear current chat"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-9 cursor-pointer items-center justify-center rounded-xl transition-colors"
          >
            <RotateCcw className="size-4" strokeWidth={1.5} />
            <span className="sr-only">Clear conversation</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Close AI Assistant (Esc)"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-9 cursor-pointer items-center justify-center rounded-xl transition-colors"
        >
          <X className="size-4" strokeWidth={1.5} />
          <span className="sr-only">Close sidebar</span>
        </button>
      </div>
    </header>
  );
}
