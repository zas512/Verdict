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
import { useState } from "react";

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
  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));
  const displayName = user.name || user.email;

  return (
    <>
      <aside
        className={cn(
          "bg-sidebar border-sidebar-border text-sidebar-foreground relative hidden flex-col justify-between overflow-visible border-r lg:flex",
          "min-h-screen shrink-0 transition-[transform,width,padding] duration-300 ease-out",
          desktopCollapsed ? "w-18 p-3" : "w-64 p-5"
        )}
      >
        <button
          type="button"
          onClick={() => setDesktopCollapsed(!desktopCollapsed)}
          aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!desktopCollapsed}
          className="bg-card text-foreground/70 hover:text-foreground border-foreground/10 absolute top-3 -right-4 z-40 size-8 cursor-pointer rounded-full border"
          title={
            desktopCollapsed
              ? "Expand sidebar (Ctrl+B)"
              : "Collapse sidebar (Ctrl+B)"
          }
        >
          {desktopCollapsed ? (
            <ChevronRight className="m-auto size-4" />
          ) : (
            <ChevronLeft className="m-auto size-4" />
          )}
        </button>

        {/* Top Section */}
        <div className="flex flex-col space-y-6">
          {/* Brand Logo & Title */}
          <div
            className={cn(
              "border-foreground/10 flex items-center justify-center border-b",
              desktopCollapsed ? "mt-4 pb-4" : "pb-4"
            )}
          >
            {desktopCollapsed ? (
              <Image
                src="/logo_verdict.png"
                alt=""
                priority
                width={30}
                height={40}
                style={{ height: "auto" }}
              />
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Image
                  src="/logo_verdict.png"
                  alt=""
                  priority
                  width={50}
                  height={50}
                  style={{ height: "auto" }}
                />
                <p className="font-garamond text-sidebar-foreground cursor-default truncate text-lg font-bold tracking-tight">
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
              <p className="text-muted-foreground px-3 pb-1 text-xs font-extrabold tracking-wider uppercase">
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
                      "relative flex items-center rounded-md text-sm font-semibold transition-colors outline-none",
                      desktopCollapsed
                        ? "mx-auto h-9 w-9 justify-center"
                        : "w-full gap-3 px-3.5 py-2",
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
                          "bg-sidebar-accent/80 absolute inset-0",
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
                          "bg-sidebar-primary absolute inset-0",
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
                        "relative z-10 h-4 w-4 shrink-0",
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
        <div className="border-foreground/10 relative border-t pt-4">
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
