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
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch(openSidebar())}
          aria-label="Open navigation menu"
          className="bg-card border-border text-muted-foreground flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <p className="font-heading text-foreground mt-0.5 text-3xl font-bold tracking-wide">
          {title}
        </p>
      </div>

      {/* Center & Right: Search Bar & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Dynamic Attendance Buttons (self check-in/out for firm owner & associates) */}
        {user && (user.role === "OWNER" || user.role === "ASSOCIATE") && (
          <div className="flex items-center">
            {isCheckedIn ? (
              <div className="bg-card border-border flex items-center gap-1.5 rounded-md border p-1 shadow-none">
                <div className="bg-warning/10 border-warning/20 text-warning flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs font-bold">
                  <span className="bg-warning inline-block h-1 w-1 animate-pulse rounded-full" />
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
                    "text-destructive-foreground flex h-6 cursor-pointer items-center gap-1 rounded-sm px-2.5 text-xs font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
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
                className="bg-success text-success-foreground hover:bg-success/90 flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-bold disabled:pointer-events-none disabled:opacity-50"
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
          className="bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted relative flex size-9 cursor-pointer items-center justify-center rounded-full border"
        >
          <Bell className="size-5" />
          <span className="bg-destructive absolute top-2 right-2 size-2 rounded-full" />
        </button>
      </div>
    </nav>
  );
}
