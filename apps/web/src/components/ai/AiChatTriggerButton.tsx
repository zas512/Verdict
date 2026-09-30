"use client";
import { isAiEnabled } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function AiChatTriggerButton() {
  const enabled = isAiEnabled();
  const { toggle, isOpen } = useAiChat();

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          key="ai-floating-trigger"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed right-6 bottom-6 z-40"
        >
          <button
            type="button"
            onClick={toggle}
            aria-label="Open Verdict AI Assistant"
            title="Open Verdict AI Assistant"
            className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 size-12 cursor-pointer rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <Sparkles className="m-auto size-6" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
