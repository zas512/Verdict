"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { FirmLogo } from "@/components/branding/FirmLogo";
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
          "bg-sidebar border-sidebar-border text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r p-5 transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Section */}
        <div className="flex flex-col space-y-6">
          {/* Brand Logo & Title */}
          <div className="border-sidebar-border mt-8 flex h-11.25 items-center justify-between gap-3 border-b pb-12">
            <div className="flex min-w-0 items-center gap-3">
              <FirmLogo
                logoUrl={firm?.logoUrl}
                name={firm?.name ?? "LGA"}
                accentColor={firm?.accentColor}
                size={40}
              />
              <div className="min-w-0">
                <p className="text-sidebar-foreground truncate text-base font-black tracking-tight">
                  {firm?.name ?? "Laal Global Advisory"}
                </p>
                {firm?.tagline && (
                  <p className="text-muted-foreground truncate text-[10px] font-semibold">
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
              className="bg-sidebar-accent/60 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ThemeToggle />

          {/* Navigation Items */}
          <nav
            className="space-y-1.5 pt-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <p className="text-muted-foreground px-3 pb-1 text-[11px] font-extrabold tracking-wider uppercase">
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
                      "relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors outline-none",
                      isActive
                        ? "text-sidebar-primary-foreground shadow-primary/20 font-bold shadow-md"
                        : "text-muted-foreground hover:text-sidebar-foreground"
                    )}
                  >
                    {/* Hover background pill */}
                    {hoveredIndex === index && !isActive && (
                      <motion.div
                        layoutId="mobile-sidebar-hover-pill"
                        className="bg-sidebar-accent/80 absolute inset-0 rounded-xl"
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
                        className="bg-sidebar-primary absolute inset-0 rounded-xl"
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
        <div className="border-sidebar-border relative border-t pt-4">
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
