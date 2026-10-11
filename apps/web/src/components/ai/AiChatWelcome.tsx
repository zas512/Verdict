"use client";
import { AI_CONFIG, AI_QUICK_PROMPTS, QuickPrompt } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  Scale,
} from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  Scale,
  FileText,
  BookOpen,
  BarChart3,
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "matters", label: "Matters" },
  { id: "drafting", label: "Drafting" },
  { id: "research", label: "Research" },
  { id: "operations", label: "Ops" },
];

export function AiChatWelcome() {
  const { sendMessage } = useAiChat();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredPrompts =
    selectedCategory === "all"
      ? AI_QUICK_PROMPTS
      : AI_QUICK_PROMPTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex flex-col items-center justify-start px-8 pt-14 pb-6 text-center sm:px-10 overflow-y-auto">
      {/* Emblem */}
      <div className="bg-primary text-primary-foreground relative mb-6 flex size-16 items-center justify-center rounded-full shadow-xl ring-2 ring-primary/20 shadow-primary/20">
        <Scale className="size-8" strokeWidth={1.5} />
      </div>

      <h3 className="font-heading text-foreground text-2xl font-bold tracking-tight leading-none">
        {AI_CONFIG.name}
      </h3>
      <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed tracking-tight">
        {AI_CONFIG.description}
      </p>

      {/* Thin divider */}
      <div className="mt-6 mb-7 h-px w-20 bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {/* Category pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all",
                isActive
                  ? "bg-foreground text-background shadow-sm ring-1 ring-foreground/20"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted hover:ring-1 hover:ring-foreground/10"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Suggested prompts — simple text rows like Claude, no cards */}
      <div className="mt-8 w-full max-w-[420px] space-y-0.5 text-left scrollbar-thin">
        {filteredPrompts.map((item: QuickPrompt) => {
          const Icon = ICON_MAP[item.iconName] || Scale;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => sendMessage(item.prompt)}
              className="group flex w-full cursor-pointer items-start gap-3.5 rounded-xl px-3 py-3 text-left transition-all hover:bg-muted/40"
            >
              <div className="bg-muted/40 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors">
                <Icon className="size-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground text-sm font-medium tracking-tight leading-snug">
                    {item.title}
                  </span>
                  <ArrowRight className="text-muted-foreground/40 size-3.5 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-muted-foreground/50 mt-10 text-[10px] tracking-wide">
        Verdict AI · Legal Intelligence
      </p>
    </div>
  );
}
