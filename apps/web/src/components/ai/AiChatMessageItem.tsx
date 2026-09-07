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
import React, { useState } from "react";
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
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const formatTimestamp = (ts?: string): string => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  };

  // Safe inline formatting for bold, italic, and code snippets
  const renderFormattedInline = (text: string): React.ReactNode => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="text-foreground font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return (
          <em key={index} className="text-foreground/90 italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={index}
            className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // Comprehensive, crash-resilient block formatter
  const formatContent = (content: string): React.ReactNode => {
    if (!content || typeof content !== "string") {
      return (
        <p className="text-foreground/90 text-xs leading-relaxed">
          {content || ""}
        </p>
      );
    }

    try {
      const lines = content.split("\n");
      const elements: React.ReactNode[] = [];
      let inCodeBlock = false;
      let codeBlockLanguage = "";
      let codeBlockLines: string[] = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];

        // Code block toggle
        if (line.trim().startsWith("```")) {
          if (inCodeBlock) {
            // End of code block
            elements.push(
              <div
                key={`code-${idx}`}
                className="bg-muted/80 border-border my-2 overflow-x-auto rounded-lg border p-3 font-mono text-[11px]"
              >
                {codeBlockLanguage && (
                  <div className="text-muted-foreground border-border/40 mb-1.5 border-b pb-1 text-[10px] uppercase">
                    {codeBlockLanguage}
                  </div>
                )}
                <pre className="text-foreground/90 whitespace-pre">
                  {codeBlockLines.join("\n")}
                </pre>
              </div>
            );
            inCodeBlock = false;
            codeBlockLines = [];
            codeBlockLanguage = "";
          } else {
            // Start of code block
            inCodeBlock = true;
            codeBlockLanguage = line.trim().replace(/^```/, "").trim();
            codeBlockLines = [];
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockLines.push(line);
          continue;
        }

        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          elements.push(<div key={`gap-${idx}`} className="h-1.5" />);
          continue;
        }

        // Horizontal divider
        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          elements.push(
            <hr key={`hr-${idx}`} className="border-border my-2" />
          );
          continue;
        }

        // Headers (H1 - H4)
        if (trimmed.startsWith("#### ")) {
          elements.push(
            <h5
              key={`h4-${idx}`}
              className="font-heading text-foreground mt-2 mb-0.5 text-xs font-bold tracking-tight"
            >
              {renderFormattedInline(trimmed.replace(/^####\s+/, ""))}
            </h5>
          );
          continue;
        }
        if (trimmed.startsWith("### ")) {
          elements.push(
            <h4
              key={`h3-${idx}`}
              className="font-heading text-foreground mt-2 mb-1 text-xs font-bold tracking-tight sm:text-sm"
            >
              {renderFormattedInline(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
          continue;
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          elements.push(
            <h3
              key={`h2-${idx}`}
              className="font-heading text-foreground mt-2.5 mb-1 text-sm font-bold tracking-tight sm:text-base"
            >
              {renderFormattedInline(trimmed.replace(/^#+\s+/, ""))}
            </h3>
          );
          continue;
        }

        // Blockquotes and Alerts
        if (trimmed.startsWith(">")) {
          if (
            trimmed.startsWith("> [!TIP]") ||
            trimmed.startsWith("> [!NOTE]")
          ) {
            continue;
          }
          elements.push(
            <blockquote
              key={`bq-${idx}`}
              className="border-primary/60 bg-primary/5 text-foreground/90 my-1.5 rounded-r-md border-l-2 py-1 pl-3 text-xs italic"
            >
              {renderFormattedInline(trimmed.replace(/^>\s*/, ""))}
            </blockquote>
          );
          continue;
        }

        // Bullet lists
        if (
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ") ||
          trimmed.startsWith("• ")
        ) {
          const bulletText = trimmed.replace(/^[-*•]\s+/, "");
          elements.push(
            <div
              key={`bullet-${idx}`}
              className="my-0.5 ml-2 flex items-start gap-2 text-xs leading-relaxed"
            >
              <span className="text-primary mt-1 text-[8px] select-none">
                •
              </span>
              <span className="text-foreground/90 flex-1">
                {renderFormattedInline(bulletText)}
              </span>
            </div>
          );
          continue;
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          elements.push(
            <div
              key={`num-${idx}`}
              className="my-0.5 ml-2 flex items-start gap-1.5 text-xs leading-relaxed"
            >
              <span className="text-primary font-semibold select-none">
                {numMatch[1]}.
              </span>
              <span className="text-foreground/90 flex-1">
                {renderFormattedInline(numMatch[2])}
              </span>
            </div>
          );
          continue;
        }

        // Standard Paragraph
        elements.push(
          <p
            key={`p-${idx}`}
            className="text-foreground/90 text-xs leading-relaxed"
          >
            {renderFormattedInline(line)}
          </p>
        );
      }

      // Handle unclosed code block if any
      if (inCodeBlock && codeBlockLines.length > 0) {
        elements.push(
          <div
            key="code-unclosed"
            className="bg-muted/80 border-border my-2 overflow-x-auto rounded-lg border p-3 font-mono text-[11px]"
          >
            <pre className="text-foreground/90 whitespace-pre">
              {codeBlockLines.join("\n")}
            </pre>
          </div>
        );
      }

      return elements;
    } catch {
      // Fallback in case of unexpected string manipulation error
      return (
        <p className="text-foreground/90 text-xs leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      );
    }
  };

  const citations = Array.isArray(message.citations) ? message.citations : [];
  const sources = Array.isArray(message.sources) ? message.sources : [];
  const attachments = Array.isArray(message.attachments)
    ? message.attachments
    : [];

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
          {message.timestamp && (
            <>
              <span>•</span>
              <span>{formatTimestamp(message.timestamp)}</span>
            </>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl p-3.5 text-xs shadow-xs transition-all",
            isUser
              ? "bg-primary text-primary-foreground shadow-primary/10 rounded-tr-xs"
              : message.status === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive rounded-tl-xs border"
                : "border-border bg-card text-card-foreground rounded-tl-xs border"
          )}
        >
          {/* Attachments if any */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id || att.name}
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
          {citations.length > 0 && (
            <div className="border-border/80 mt-3 border-t pt-2.5">
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                <BookOpen className="text-primary size-3" />
                <span>Legal Authorities & Citations</span>
              </div>
              <div className="space-y-1.5">
                {citations.map((cite, cIdx) => {
                  const title =
                    typeof cite === "string"
                      ? cite
                      : cite?.title || "Authority";
                  const year =
                    typeof cite === "object" ? cite?.year : undefined;
                  const source =
                    typeof cite === "object"
                      ? cite?.source || "Statutory Reference"
                      : "Statutory Authority";
                  const summary =
                    typeof cite === "object" ? cite?.summary : undefined;

                  return (
                    <div
                      key={cIdx}
                      className="bg-muted/60 border-border/60 rounded-lg border p-2 text-[11px]"
                    >
                      <div className="text-foreground flex items-center justify-between font-semibold">
                        <span>{title}</span>
                        {year && (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {year}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {source}
                      </p>
                      {summary && (
                        <p className="text-foreground/80 mt-1 text-[10px] italic">
                          &quot;{summary}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Referenced Sources if any */}
          {sources.length > 0 && (
            <div className="border-border/80 mt-3 border-t pt-2.5">
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                <FileText className="text-primary size-3" />
                <span>Referenced Documents & Context</span>
              </div>
              <div className="space-y-1.5">
                {sources.map((src, sIdx) => {
                  const docName =
                    src?.document_name || src?.document_id || "Document";
                  const score =
                    typeof src?.similarity_score === "number"
                      ? Math.round(src.similarity_score * 100)
                      : null;

                  return (
                    <div
                      key={sIdx}
                      className="bg-muted/60 border-border/60 rounded-lg border p-2 text-[11px]"
                    >
                      <div className="text-foreground flex items-center justify-between font-semibold">
                        <span className="truncate">{docName}</span>
                        {score !== null && (
                          <span className="text-muted-foreground shrink-0 text-[10px]">
                            {score}% match
                          </span>
                        )}
                      </div>
                      {src?.chunk_text && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[10px]">
                          {src.chunk_text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Toolbar for Assistant Responses */}
        {!isUser && message.status !== "error" && (
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
