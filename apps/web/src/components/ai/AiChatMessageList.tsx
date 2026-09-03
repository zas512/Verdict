"use client";
import { useAiChat } from "@/hooks/useAiChat";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AiChatMessageItem } from "./AiChatMessageItem";
import { AiChatThinkingIndicator } from "./AiChatThinkingIndicator";
import { AiChatWelcome } from "./AiChatWelcome";

export function AiChatMessageList() {
  const { messages, isThinking } = useAiChat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto"
    });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isThinking]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isFarFromBottom);
  };

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex-1 overflow-y-auto">
        <AiChatWelcome />
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full space-y-2 overflow-y-auto py-4"
      >
        {messages.map((message) => (
          <AiChatMessageItem key={message.id} message={message} />
        ))}
        {isThinking && <AiChatThinkingIndicator />}
        <div ref={messagesEndRef} className="h-2" />
      </div>
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
          className="bg-card border-border text-foreground hover:bg-muted absolute right-4 bottom-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border shadow-md transition-all"
        >
          <ArrowDown className="size-4" />
        </button>
      )}
    </div>
  );
}
