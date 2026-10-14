"use client";
import { useAiChat } from "@/hooks/useAiChat";
import { toggleDialer } from "@/redux/dialer";
import type { RootState } from "@/redux/store";
import { Phone } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

export function DialerOpenButton() {
  const dispatch = useDispatch();
  const { isOpen: isAiChatOpen } = useAiChat();
  const isDialerOpen = useSelector((state: RootState) => state.dialer.isOpen);

  if (isAiChatOpen || isDialerOpen) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleDialer())}
      aria-label="Open Dialer"
      title="Open Dialer"
      className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 fixed right-6 bottom-22 z-40 flex size-12 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
    >
      <Phone className="m-auto size-6" />
    </button>
  );
}
