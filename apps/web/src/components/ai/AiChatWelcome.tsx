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
  Sparkles
} from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  Scale,
  FileText,
  BookOpen,
  BarChart3
};

const CATEGORIES = [
  { id: "all", label: "All Suggestions" },
  { id: "matters", label: "Matters" },
  { id: "drafting", label: "Drafting" },
  { id: "research", label: "Research" },
  { id: "operations", label: "Operations" }
];

export function AiChatWelcome() {
  const { sendMessage } = useAiChat();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredPrompts =
    selectedCategory === "all"
      ? AI_QUICK_PROMPTS
      : AI_QUICK_PROMPTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
      {/* AI Emblem */}
      <div className="from-primary via-primary/80 to-chart-2 text-primary-foreground relative mb-5 flex size-14 items-center justify-center rounded-2xl bg-linear-to-tr shadow-md">
        <Sparkles className="size-7" />
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-emerald-400" />
        </span>
      </div>

      <h3 className="font-heading text-foreground text-lg font-bold tracking-tight sm:text-xl">
        Welcome to {AI_CONFIG.name}
      </h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs sm:text-sm">
        {AI_CONFIG.description}
      </p>

      {/* Category Pills */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Quick Prompt Cards */}
      <div className="mt-5 grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
        {filteredPrompts.map((item: QuickPrompt) => {
          const Icon = ICON_MAP[item.iconName] || Sparkles;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => sendMessage(item.prompt)}
              className="group border-border bg-card hover:border-primary/40 hover:bg-accent/40 flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all hover:shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors">
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
                    {item.categoryLabel}
                  </span>
                  <p className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="text-primary mt-2.5 flex items-center justify-end text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-100">
                <span>Ask AI</span>
                <ArrowRight className="ml-1 size-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
