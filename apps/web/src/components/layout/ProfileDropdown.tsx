"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEFAULT_ACCENT } from "@/components/branding/PlaceholderLogo";
import { UserAvatar } from "@/components/branding/UserAvatar";
import { cn } from "@/lib/utils";
import { HelpCircle, LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProfileDropdownProps {
  user: {
    email: string;
    role: string;
    firmId: string | null;
    name?: string | null;
  };
  collapsed: boolean;
  displayName: string;
  avatarUrl?: string | null;
  firm?: {
    name?: string | null;
    logoUrl?: string | null;
    accentColor?: string | null;
    tagline?: string | null;
  } | null;
}

export function ProfileDropdown({
  user,
  collapsed,
  displayName,
  avatarUrl,
  firm
}: Readonly<ProfileDropdownProps>) {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Close on outside click and Escape; return focus to the trigger on Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoading(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={closeMenu}
    >
      {/* Dropdown Menu Card */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="profile-menu"
            role="menu"
            aria-label="Profile actions"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            style={{ transformOrigin: "bottom" }}
            className={cn(
              "absolute bottom-full left-0 mb-3 rounded-2xl border border-border bg-card shadow-lg p-3 text-card-foreground flex flex-col gap-3 z-50 transition-all duration-300",
              collapsed ? "w-56 -left-2" : "w-full"
            )}
          >
            {/* Header Profile Details */}
            <div className="flex flex-col border-b border-border pb-2.5">
              <p className="text-sm font-bold text-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              <span className="inline-block text-xs font-bold text-primary dark:text-primary-foreground bg-primary/10 dark:bg-primary/50 px-2 py-0.5 rounded-full border border-primary/20 mt-1.5 w-max">
                {user.role === "OWNER" ? "Principal Counsel" : user.role}
              </span>
              {firm?.name && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mt-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: firm.accentColor ?? DEFAULT_ACCENT
                    }}
                  />
                  <span className="truncate">{firm.name}</span>
                </span>
              )}
            </div>

            {/* Staggered Actions List */}
            <motion.div
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.035, delayChildren: 0.05 }
                }
              }}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-0.5"
            >
              {/* Settings Item */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" }
                }}
              >
                <Link
                  href="/settings"
                  role="menuitem"
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Settings</span>
                </Link>
              </motion.div>

              {/* Help Item */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" }
                }}
              >
                <Link
                  href="/help"
                  role="menuitem"
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>Help & Support</span>
                </Link>
              </motion.div>

              {/* Logout Item */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" }
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors mt-1.5 pt-2.5 border-t border-border text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>{isLoading ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Card (Trigger) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="profile-menu"
        className={cn(
          "flex items-center bg-card shadow-xs overflow-hidden transition-all duration-300 cursor-pointer select-none text-left",
          collapsed
            ? "rounded-full justify-center mx-auto h-10 w-10 border border-border"
            : "px-3 rounded-full gap-3 h-max py-2 w-full border border-border"
        )}
        title={collapsed ? displayName : undefined}
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          name={displayName}
          email={user.email}
        />
        {!collapsed && (
          <div className="flex-1 min-w-0 transition-opacity duration-300">
            <p className="text-sm font-bold text-card-foreground truncate">
              {displayName}
            </p>
            <p className="text-xs text-primary/80 dark:text-white/80 whitespace-nowrap">
              {user.role === "OWNER" ? "Principal Counsel" : user.role}
            </p>
          </div>
        )}
      </button>
    </div>
  );
}
