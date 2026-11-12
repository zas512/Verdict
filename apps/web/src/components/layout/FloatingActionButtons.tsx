"use client";
import { isDialerEnabled } from "@/config/dialer";
import { AiChatTriggerButton } from "@/components/ai/AiChatTriggerButton";
import { DialerOpenButton } from "@/components/dialer/DialerOpenButton";
import MyPhone from "@/components/dialer/MyPhone";
import { useAiChat } from "@/hooks/useAiChat";

export function FloatingActionButtons() {
  const { isOpen: isAiChatOpen } = useAiChat();

  if (isAiChatOpen) {
    return null;
  }

  const dialerEnabled = isDialerEnabled();

  return (
    <>
      <AiChatTriggerButton />
      {dialerEnabled && <DialerOpenButton />}
      {dialerEnabled && <MyPhone />}
    </>
  );
}
