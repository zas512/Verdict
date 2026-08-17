"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { navItems } from "@/config/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MobileSidebar = dynamic(
  () => import("./MobileSidebar").then((mod) => mod.MobileSidebar),
  { ssr: false }
);

export interface SidebarProps {
  user: {
    email: string;
    role: string;
    firmId: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    firm?: {
      name?: string | null;
      logoUrl?: string | null;
      accentColor?: string | null;
      tagline?: string | null;
    } | null;
  };
}

export function Sidebar({ user }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const richUser = authUser ?? user;
  const firm = richUser.firm ?? null;
  const avatarUrl = richUser.avatarUrl ?? null;

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Expose the firm's accent color so branding surfaces can tint with it.
  useEffect(() => {
    if (firm?.accentColor) {
      document.documentElement.style.setProperty(
        "--brand-accent",
        firm.accentColor
      );
    }
  }, [firm?.accentColor]);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse (desktop only)
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setDesktopCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));
  const displayName = user.name || user.email;

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col justify-between bg-sidebar border-r border-sidebar-border text-sidebar-foreground relative overflow-visible",
          "min-h-screen shrink-0 transition-[transform,width,padding] duration-300 ease-out",
          desktopCollapsed ? "w-18 p-3" : "w-64 p-5"
        )}
      >
        {/* Floating Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setDesktopCollapsed(!desktopCollapsed)}
          aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!desktopCollapsed}
          className="absolute top-3 -right-4 z-40 size-8 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer"
          title={
            desktopCollapsed
              ? "Expand sidebar (Ctrl+B)"
              : "Collapse sidebar (Ctrl+B)"
          }
        >
          {desktopCollapsed ? (
            <ChevronRight className="size-4 m-auto" />
          ) : (
            <ChevronLeft className="size-4 m-auto" />
          )}
        </button>

        {/* Top Section */}
        <div className="space-y-6 flex flex-col">
          {/* Brand Logo & Title */}
          <div
            className={cn(
              "flex items-center border-b border-sidebar-border h-11.25",
              desktopCollapsed
                ? "justify-center pb-6 mt-6"
                : "gap-3 mt-8 justify-between pb-12"
            )}
          >
            {desktopCollapsed ? (
              <Image src="/logo.png" alt="" width={40} height={40} />
            ) : (
              <div className="flex min-w-0 items-center gap-3">
                <Image src="/logo.png" alt="" width={100} height={40} />
                <p className="truncate text-lg font-garamond font-bold tracking-tight text-sidebar-foreground">
                  VERDICT
                </p>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav
            className="space-y-1.5 pt-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {!desktopCollapsed && (
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground px-3 pb-1">
                Navigation
              </p>
            )}
            <AnimatePresence>
              {filteredNav.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={() => setHoveredIndex(index)}
                    className={cn(
                      "relative flex items-center rounded-md text-sm font-semibold outline-none transition-colors",
                      desktopCollapsed
                        ? "justify-center h-9 w-9 mx-auto"
                        : "px-3.5 py-2 gap-3 w-full",
                      isActive
                        ? "text-sidebar-primary-foreground font-bold"
                        : "text-muted-foreground hover:text-sidebar-foreground"
                    )}
                    title={desktopCollapsed ? item.title : undefined}
                  >
                    {/* Hover background pill */}
                    {hoveredIndex === index && !isActive && (
                      <motion.div
                        layoutId="sidebar-hover-pill"
                        className={cn(
                          "absolute inset-0 bg-sidebar-accent/80",
                          desktopCollapsed ? "rounded-full" : "rounded-md"
                        )}
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 32,
                          mass: 0.6
                        }}
                      />
                    )}
                    {/* Active background pill */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className={cn(
                          "absolute inset-0 bg-sidebar-primary",
                          desktopCollapsed ? "rounded-full" : "rounded-md"
                        )}
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 32,
                          mass: 0.6
                        }}
                      />
                    )}

                    <Icon
                      className={cn(
                        "h-4 w-4 relative z-10 shrink-0",
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    />
                    {!desktopCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        className="relative z-10 truncate"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </AnimatePresence>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="pt-4 border-t border-sidebar-border relative">
          <ProfileDropdown
            user={richUser}
            collapsed={desktopCollapsed}
            displayName={displayName}
            avatarUrl={avatarUrl}
            firm={firm}
          />
        </div>
      </aside>

      {/* Render Mobile Sidebar overlay components */}
      {isMobile && <MobileSidebar user={user} />}
    </>
  );
}
