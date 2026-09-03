"use client";
import { isAiEnabled } from "@/config/ai";
import { useAiChat } from "@/hooks/useAiChat";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { AiChatHeader } from "./AiChatHeader";
import { AiChatInput } from "./AiChatInput";
import { AiChatMessageList } from "./AiChatMessageList";

const DESKTOP_SIDEBAR_WIDTH = 440;

export function AiChatSidebar() {
  const enabled = isAiEnabled();
  const { isOpen, close } = useAiChat();
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (!enabled) return null;

  // On Mobile: Render as a full-width overlay drawer when open
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end md:hidden">
            {/* Backdrop */}
            <motion.div
              key="mobile-ai-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Mobile panel */}
            <motion.aside
              key="mobile-ai-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="border-border bg-card relative z-50 flex h-full w-full max-w-[90vw] flex-col justify-between border-l shadow-2xl"
            >
              <AiChatHeader onClose={close} />
              <AiChatMessageList />
              <AiChatInput />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // On Desktop/Tablet: In-flow right sidebar that smoothly squeezes the middle content
  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? DESKTOP_SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 32,
        mass: 0.75
      }}
      className={cn(
        "bg-card relative hidden h-screen shrink-0 flex-col overflow-hidden transition-[border-color] duration-200 md:flex",
        isOpen ? "border-border border-l" : "pointer-events-none border-l-0"
      )}
    >
      <div
        style={{ width: `${DESKTOP_SIDEBAR_WIDTH}px` }}
        className="flex h-full shrink-0 flex-col justify-between"
      >
        <AiChatHeader onClose={close} />
        <AiChatMessageList />
        <AiChatInput />
      </div>
    </motion.aside>
  );
}
