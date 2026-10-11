"use client";
import { isAiEnabled } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { Scale } from "lucide-react";

export function AiChatTriggerButton() {
  const enabled = isAiEnabled();
  const { toggle, isOpen } = useAiChat();
  if (!enabled) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Open Verdict AI Assistant"
          title="Open Verdict AI Assistant"
          className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 fixed right-6 bottom-6 z-40 flex size-12 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
        >
          <Scale className="m-auto size-6" />
        </button>
      )}
    </>
  );
}
