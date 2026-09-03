"use client";
import { useAiChat } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";
import { AiMessage } from "@/types/ai-chat";
import {
  BookOpen,
  Check,
  Copy,
  FileText,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AiChatMessageItemProps {
  message: AiMessage;
}

export function AiChatMessageItem({
  message
}: Readonly<AiChatMessageItemProps>) {
  const { setFeedback } = useAiChat();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  // Simple formatting helper for markdown-like headers, bold, bullets, alerts
  const formatContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Header 3
      if (line.startsWith("### ")) {
        return (
          <h4
            key={idx}
            className="font-heading text-foreground mt-2 mb-1 text-sm font-bold tracking-tight"
          >
            {line.replace("### ", "")}
          </h4>
        );
      }
      // Header 2 or 1
      if (line.startsWith("## ") || line.startsWith("# ")) {
        return (
          <h3
            key={idx}
            className="font-heading text-foreground mt-2.5 mb-1 text-base font-bold tracking-tight"
          >
            {line.replace(/^#+\s/, "")}
          </h3>
        );
      }
      // Divider
      if (line.trim() === "---") {
        return <hr key={idx} className="border-border my-2" />;
      }
      // Bullet list
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletText = line.trim().substring(2);
        return (
          <li
            key={idx}
            className="text-foreground/90 ml-4 list-disc text-xs leading-relaxed"
          >
            {renderFormattedInline(bulletText)}
          </li>
        );
      }
      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div
            key={idx}
            className="my-1 ml-1 flex items-start gap-1.5 text-xs leading-relaxed"
          >
            <span className="text-primary font-semibold">{numMatch[1]}.</span>
            <span>{renderFormattedInline(numMatch[2])}</span>
          </div>
        );
      }
      // Tip or Alert blockquote
      if (line.startsWith("> [!TIP]") || line.startsWith("> [!NOTE]")) {
        return null;
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            className="border-primary/60 bg-primary/5 text-foreground/90 my-1.5 rounded-r-md border-l-2 py-1 pl-3 text-xs italic"
          >
            {renderFormattedInline(line.replace(/^>\s*/, ""))}
          </blockquote>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-foreground/90 text-xs leading-relaxed">
          {renderFormattedInline(line)}
        </p>
      );
    });
  };

  // Inline formatting helper for **bold** and *italic*
  const renderFormattedInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="text-foreground font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="text-foreground/80 italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        "group flex w-full gap-3 px-4 py-2 transition-colors",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="bg-primary text-primary-foreground relative flex size-7 shrink-0 items-center justify-center rounded-xl shadow-xs">
          <Sparkles className="size-3.5" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1.5 sm:max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Author / Timestamp label */}
        <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[10px]">
          <span className="text-foreground/80 font-semibold">
            {isUser ? "You" : "Verdict AI"}
          </span>
          <span>•</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl p-3.5 text-xs shadow-xs transition-all",
            isUser
              ? "bg-primary text-primary-foreground shadow-primary/10 rounded-tr-xs"
              : "border-border bg-card text-card-foreground rounded-tl-xs border"
          )}
        >
          {/* Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium",
                    isUser
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <FileText className="size-3.5" />
                  <span className="max-w-[140px] truncate">{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Formatted Content */}
          <div className="space-y-1">
            {isUser ? (
              <p className="leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            ) : (
              formatContent(message.content)
            )}
          </div>

          {/* Legal Citations if any */}
          {message.citations && message.citations.length > 0 && (
            <div className="border-border/80 mt-3 border-t pt-2.5">
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                <BookOpen className="text-primary size-3" />
                <span>Legal Authorities & Citations</span>
              </div>
              <div className="space-y-1.5">
                {message.citations.map((cite, cIdx) => (
                  <div
                    key={cIdx}
                    className="bg-muted/60 border-border/60 rounded-lg border p-2 text-[11px]"
                  >
                    <div className="text-foreground flex items-center justify-between font-semibold">
                      <span>{cite.title}</span>
                      {cite.year && (
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {cite.year}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      {cite.source}
                    </p>
                    {cite.summary && (
                      <p className="text-foreground/80 mt-1 text-[10px] italic">
                        &quot;{cite.summary}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Toolbar for Assistant Responses */}
        {!isUser && (
          <div className="flex items-center gap-1 px-1 opacity-80 transition-opacity hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy response"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
            >
              {copied ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Copy className="size-3" />
              )}
              <span className="sr-only">Copy message</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFeedback(
                  message.id,
                  message.feedback === "liked" ? null : "liked"
                )
              }
              title="Good response"
              className={cn(
                "flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors",
                message.feedback === "liked"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ThumbsUp className="size-3" />
              <span className="sr-only">Like response</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFeedback(
                  message.id,
                  message.feedback === "disliked" ? null : "disliked"
                )
              }
              title="Poor response"
              className={cn(
                "flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors",
                message.feedback === "disliked"
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ThumbsDown className="size-3" />
              <span className="sr-only">Dislike response</span>
            </button>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-xl shadow-xs">
          <User className="size-3.5" />
        </div>
      )}
    </div>
  );
}
