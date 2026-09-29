"use client";
import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = typeof window !== "undefined" ? localStorage.getItem("cookie_consent") : null;
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-[#0B1221]/10 bg-[#F6F3EE]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#C5A059]" aria-hidden="true" />
          <div>
            <p className="text-[#0B1221] font-heading text-sm font-medium">Cookie & Privacy Notice</p>
            <p className="text-[#0B1221]/70 text-xs leading-relaxed">
              We use essential cookies for authentication. For full details see{" "}
              <a href="/privacy" className="underline decoration-[#C5A059] underline-offset-2 hover:text-[#C5A059]">Privacy Policy</a>.
              Applies for users in Pakistan, USA, UK, and Australia.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={accept}
            className="rounded-sm bg-[#0B1221] px-4 py-2 text-xs font-medium text-[#F6F3EE] hover:bg-[#1A2332] transition-colors"
          >
            Accept
          </button>
          <button
            onClick={reject}
            className="rounded-sm border border-[#0B1221]/20 px-4 py-2 text-xs font-medium text-[#0B1221] hover:bg-[#0B1221]/5 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
