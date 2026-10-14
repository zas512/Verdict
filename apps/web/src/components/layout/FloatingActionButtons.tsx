"use client";
import { AiChatTriggerButton } from "@/components/ai/AiChatTriggerButton";
import { DialerOpenButton } from "@/components/dialer/DialerOpenButton";
import { useAiChat } from "@/hooks/useAiChat";
import type { RootState } from "@/redux/store";
import { useSelector } from "react-redux";

export function FloatingActionButtons() {
  const { isOpen: isAiChatOpen } = useAiChat();
  const isDialerOpen = useSelector((state: RootState) => state.dialer.isOpen);

  if (isAiChatOpen || isDialerOpen) {
    return null;
  }

  return (
    <>
      <AiChatTriggerButton />
      <DialerOpenButton />
    </>
  );
}
