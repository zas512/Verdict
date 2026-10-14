"use client";
import { cn } from "@/lib/utils";
import { toggleDialer } from "@/redux/dialer";
import type { RootState } from "@/redux/store";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Phone from "./Dialer";

const MyPhone = () => {
  const dispatch = useDispatch();
  const isPhoneOpen = useSelector((state: RootState) => state.dialer.isOpen);

  return (
    <div
      className={cn(
        "fixed right-6 bottom-6 z-50 flex h-150 w-92 max-w-[calc(100vw-2rem)] flex-col justify-between overflow-hidden rounded-2xl",
        "text-foreground bg-white dark:bg-[#181b24]",
        "border-border/80 border dark:border-white/15",
        "shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.1)]",
        "backdrop-blur-xl transition-all duration-300",
        !isPhoneOpen && "hidden"
      )}
    >
      {/* Phone header */}
      <section className="border-border/80 bg-muted/60 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xs dark:border-white/10 dark:bg-white/4">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/15 dark:bg-primary/20 text-primary rounded-md px-2 py-0.5 text-xs font-semibold">
            User 1
          </span>
          <span className="text-muted-foreground text-xs">
            ID:{" "}
            <strong className="text-foreground font-mono font-semibold">
              1101
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
            title="SIP Ready"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Ready</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(toggleDialer())}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors dark:hover:bg-white/10 dark:hover:text-white"
            title="Close Dialer"
          >
            <X size={16} />
          </button>
        </div>
      </section>

      {/* Phone screen */}
      <section className="bg-card relative flex-1 overflow-y-auto">
        <Phone
          id={1234}
          userName="User"
          domain="domain"
          password="secret"
          port={8089}
          setIsUserRegistered={() => {}}
          setIsSipConnected={() => {}}
        />
      </section>
    </div>
  );
};

export default MyPhone;
