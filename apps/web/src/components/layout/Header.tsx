"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn, getErrorMessage } from "@/lib/utils";
import { RootState } from "@/redux/store";
import { openSidebar } from "@/redux/ui";
import { Bell, Menu, Play, Square } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

const DesktopThemeToggle = dynamic(
  () =>
    import("@/components/layout/ThemeToggle").then((mod) => mod.ThemeToggle),
  { ssr: false }
);

export function Header({ title: propTitle }: Readonly<{ title?: string }>) {
  const reduxHeader = useSelector((state: RootState) => state.header);
  const title = propTitle ?? reduxHeader.title;
  const dispatch = useDispatch();
  const { user, refreshUser } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isCheckedIn = user?.isCheckedIn ?? false;
  const activeCheckInTime = user?.activeCheckInTime;
  const [confirmingCheckOut, setConfirmingCheckOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const armCheckOut = () => {
    setConfirmingCheckOut(true);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(
      () => setConfirmingCheckOut(false),
      4000
    );
  };

  const checkIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      const clientDate = `${year}-${month}-${day}`;
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDate })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check in");
      }
      toast.success("Checked in successfully!");
      await refreshUser();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Check-in failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkOut = async () => {
    if (isSubmitting) return;
    if (!confirmingCheckOut) {
      armCheckOut();
      return;
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmingCheckOut(false);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check out");
      }

      toast.success("Checked out successfully!");
      await refreshUser();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Check-out failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeFriendly = (isoStr: string | null | undefined) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  let checkOutText = "Check Out";
  if (isSubmitting) {
    checkOutText = "Checking out…";
  } else if (confirmingCheckOut) {
    checkOutText = "Confirm check out";
  }

  return (
    <nav className="flex items-center justify-between gap-4">
      {/* Left: Mobile nav toggle + Breadcrumb & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => dispatch(openSidebar())}
          aria-label="Open navigation menu"
          className="lg:hidden size-9 shrink-0 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground transition-colors cursor-pointer"
        >
          <Menu className="size-5" />
        </button>
        <p className="text-3xl font-heading font-bold tracking-wide text-foreground mt-0.5">
          {title}
        </p>
      </div>

      {/* Center & Right: Search Bar & Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Dynamic Attendance Buttons (self check-in/out for firm owner & associates) */}
        {user && (user.role === "OWNER" || user.role === "ASSOCIATE") && (
          <div className="flex items-center">
            {isCheckedIn ? (
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-md p-1 shadow-none">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 border border-warning/20 text-warning font-mono font-bold text-xs rounded-sm">
                  <span className="h-1 w-1 rounded-full bg-warning inline-block animate-pulse" />
                  <span>In: {formatTimeFriendly(activeCheckInTime)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => checkOut()}
                  disabled={isSubmitting}
                  aria-live="polite"
                  title={
                    confirmingCheckOut
                      ? "Tap again to confirm check-out"
                      : "Check out of today's shift"
                  }
                  className={cn(
                    "flex items-center gap-1 h-6 px-2.5 rounded-sm text-destructive-foreground font-bold text-xs transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50",
                    confirmingCheckOut
                      ? "bg-destructive hover:bg-destructive/90"
                      : "bg-destructive/90 hover:bg-destructive"
                  )}
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                  <span>{checkOutText}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => checkIn()}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-success text-success-foreground hover:bg-success/90 font-bold text-xs cursor-pointer disabled:pointer-events-none disabled:opacity-50"
              >
                <Play className="size-3 fill-current" />
                <span>{isSubmitting ? "Checking in…" : "Check In"}</span>
              </button>
            )}
          </div>
        )}

        {/* Theme Switcher Button */}
        <div className="hidden lg:block">
          {isDesktop && <DesktopThemeToggle />}
        </div>

        {/* Notifications Icon */}
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted relative cursor-pointer"
        >
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
        </button>
      </div>
    </nav>
  );
}
