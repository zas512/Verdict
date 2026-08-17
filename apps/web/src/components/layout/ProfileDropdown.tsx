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
  firm,
}: Readonly<ProfileDropdownProps>) {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

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
              "border-foreground/20 bg-card text-card-foreground absolute bottom-full left-0 z-50 mb-3 flex flex-col gap-3 rounded-2xl border p-3 shadow-lg transition-all duration-300",
              collapsed ? "-left-2 w-56" : "w-full",
            )}
          >
            {/* Header Profile Details */}
            <div className="border-foreground/20 flex flex-col border-b pb-2.5">
              <p className="text-foreground truncate text-sm font-bold">
                {displayName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {user.email}
              </p>
              <span className="text-primary dark:text-primary-foreground bg-primary/10 dark:bg-primary/50 border-primary/20 mt-1.5 inline-block w-max rounded-full border px-2 py-0.5 text-xs font-bold">
                {user.role === "OWNER" ? "Principal Counsel" : user.role}
              </span>
              {firm?.name && (
                <span className="text-muted-foreground mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: firm.accentColor ?? DEFAULT_ACCENT,
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
                  transition: { staggerChildren: 0.035, delayChildren: 0.05 },
                },
              }}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-0.5"
            >
              {/* Settings Item */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
              >
                <Link
                  href="/settings"
                  role="menuitem"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Settings</span>
                </Link>
              </motion.div>

              {/* Help Item */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
              >
                <Link
                  href="/help"
                  role="menuitem"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors"
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>Help & Support</span>
                </Link>
              </motion.div>

              {/* Logout Item */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="text-destructive hover:bg-destructive/10 border-foreground/20 mt-1.5 flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-t px-2.5 py-2 pt-2.5 text-left text-xs font-semibold transition-colors"
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
          "bg-card border-foreground/20 flex cursor-pointer items-center overflow-hidden text-left shadow-xs transition-all duration-300 select-none",
          collapsed
            ? "mx-auto h-10 w-10 justify-center rounded-full border"
            : "h-max w-full gap-3 rounded-full border px-3 py-2",
        )}
        title={collapsed ? displayName : undefined}
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          name={displayName}
          email={user.email}
        />
        {!collapsed && (
          <div className="min-w-0 flex-1 transition-opacity duration-300">
            <p className="text-card-foreground truncate text-sm font-bold">
              {displayName}
            </p>
            <p className="text-primary/80 text-xs whitespace-nowrap dark:text-white/80">
              {user.role === "OWNER" ? "Principal Counsel" : user.role}
            </p>
          </div>
        )}
      </button>
    </div>
  );
}
