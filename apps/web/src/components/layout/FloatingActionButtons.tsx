"use client";
import { AiChatTriggerButton } from "@/components/ai/AiChatTriggerButton";
import { DialerOpenButton } from "@/components/dialer/DialerOpenButton";
import MyPhone from "@/components/dialer/MyPhone";
import { useAiChat } from "@/hooks/useAiChat";

export function FloatingActionButtons() {
  const { isOpen: isAiChatOpen } = useAiChat();

  if (isAiChatOpen) {
    return null;
  }

  return (
    <>
      <AiChatTriggerButton />
      <DialerOpenButton />
      <MyPhone />
    </>
  );
}
