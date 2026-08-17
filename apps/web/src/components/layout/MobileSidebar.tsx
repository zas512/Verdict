"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { FirmLogo } from "@/components/branding/FirmLogo";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { navItems } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";
import { closeSidebar } from "@/redux/ui";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SidebarProps } from "./Sidebar";

export function MobileSidebar({ user }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const mobileOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const { user: authUser } = useAuth();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const richUser = authUser ?? user;
  const firm = richUser.firm ?? null;
  const avatarUrl = richUser.avatarUrl ?? null;
  const displayName = user.name || user.email;

  useEffect(() => {
    dispatch(closeSidebar());
  }, [pathname, dispatch]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(closeSidebar());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, dispatch]);

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dispatch(closeSidebar())}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        inert={!mobileOpen}
        className={cn(
          "flex flex-col justify-between bg-sidebar border-r border-sidebar-border text-sidebar-foreground fixed inset-y-0 left-0 z-50 w-64 p-5 transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Section */}
        <div className="space-y-6 flex flex-col">
          {/* Brand Logo & Title */}
          <div className="flex items-center border-b border-sidebar-border h-11.25 gap-3 mt-8 justify-between pb-12">
            <div className="flex min-w-0 items-center gap-3">
              <FirmLogo
                logoUrl={firm?.logoUrl}
                name={firm?.name ?? "LGA"}
                accentColor={firm?.accentColor}
                size={40}
              />
              <div className="min-w-0">
                <p className="truncate text-base font-black tracking-tight text-sidebar-foreground">
                  {firm?.name ?? "Laal Global Advisory"}
                </p>
                {firm?.tagline && (
                  <p className="truncate text-[10px] font-semibold text-muted-foreground">
                    {firm.tagline}
                  </p>
                )}
              </div>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={() => dispatch(closeSidebar())}
              aria-label="Close navigation menu"
              className="lg:hidden h-8 w-8 rounded-lg bg-sidebar-accent/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Search and Theme Toggle */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1">
              <GlobalSearch containerClassName="w-full" />
            </div>
            <ThemeToggle />
          </div>

          {/* Navigation Items */}
          <nav
            className="space-y-1.5 pt-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground px-3 pb-1">
              Navigation
            </p>
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
                      "relative flex items-center rounded-xl text-xs font-semibold outline-none transition-colors px-3.5 py-2.5 gap-3 w-full",
                      isActive
                        ? "text-sidebar-primary-foreground font-bold shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-sidebar-foreground"
                    )}
                  >
                    {/* Hover background pill */}
                    {hoveredIndex === index && !isActive && (
                      <motion.div
                        layoutId="mobile-sidebar-hover-pill"
                        className="absolute inset-0 bg-sidebar-accent/80 rounded-xl"
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
                        layoutId="mobile-sidebar-active-pill"
                        className="absolute inset-0 bg-sidebar-primary rounded-xl"
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
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="relative z-10 truncate"
                    >
                      {item.title}
                    </motion.span>
                  </Link>
                );
              })}
            </AnimatePresence>
          </nav>
        </div>

        {/* Bottom Profile Section */}
        <div className="pt-4 border-t border-sidebar-border relative">
          <ProfileDropdown
            user={richUser}
            collapsed={false}
            displayName={displayName}
            avatarUrl={avatarUrl}
            firm={firm}
          />
        </div>
      </aside>
    </>
  );
}
