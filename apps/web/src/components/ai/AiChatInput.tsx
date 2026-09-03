"use client";
import { AI_CONFIG } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";
import { AiAttachment } from "@/types/ai-chat";
import { ArrowUp, Mic, Paperclip, Scale, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

export function AiChatInput() {
  const { sendMessage, isThinking } = useAiChat();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-adjust height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!input.trim() && attachments.length === 0) || isThinking) return;

    sendMessage(input, attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: AiAttachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setAttachments((prev) => [...prev, ...fileList]);
    toast.success(`Attached ${files.length} document(s) for AI analysis`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const hasContent = input.trim().length > 0 || attachments.length > 0;

  return (
    <div className="border-border bg-card shrink-0 border-t p-3 sm:p-4">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="border-border bg-muted/80 text-foreground flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
            >
              <Paperclip className="text-primary size-3" />
              <span className="max-w-40 truncate font-medium">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(file.id)}
                className="text-muted-foreground hover:text-destructive ml-1 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Box Card */}
      <div className="border-border bg-background focus-within:border-primary/50 focus-within:ring-primary/20 relative rounded-2xl border p-2.5 transition-all focus-within:ring-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Verdict AI anything (e.g. summarize hearings, draft notices)..."
          rows={1}
          className="text-foreground placeholder:text-muted-foreground max-h-35 w-full resize-none bg-transparent px-1 py-0.5 text-xs leading-relaxed focus:outline-none"
        />

        {/* Action Bottom Bar */}
        <div className="border-border/40 mt-2 flex items-center justify-between border-t pt-1">
          {/* Left tools: Attachments & Case context */}
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach legal document or PDF"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
            >
              <Paperclip className="size-3.5" />
              <span className="sr-only">Attach document</span>
            </button>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Context selector: Type matter number or client name"
                )
              }
              title="Reference Matter / Case"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors"
            >
              <Scale className="text-primary size-3" />
              <span className="hidden sm:inline">Reference Matter</span>
            </button>

            <button
              type="button"
              onClick={() =>
                toast.info("Voice input will be supported in upcoming release")
              }
              title="Voice dictation"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
            >
              <Mic className="size-3.5" />
              <span className="sr-only">Voice dictation</span>
            </button>
          </div>

          {/* Right tool: Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasContent || isThinking}
            aria-label="Send query"
            className={cn(
              "flex size-7.5 cursor-pointer items-center justify-center rounded-full shadow-xs transition-all duration-200",
              hasContent && !isThinking
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            )}
          >
            <ArrowUp className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Small Disclaimer */}
      <p className="text-muted-foreground/80 mt-2 text-center text-[10px] leading-tight">
        {AI_CONFIG.disclaimer}
      </p>
    </div>
  );
}
