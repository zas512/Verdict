"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { FirmLogo } from "@/components/branding/FirmLogo";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";
import { closeSidebar } from "@/redux/ui";
import {
  Building2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Scale,
  Users,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

interface SidebarProps {
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

/** Sidebar is an in-flow left column on `lg+`; below that it is a hidden
 *  off-canvas drawer revealed as an overlay (backdrop + fixed panel) so the
 *  content area always owns the full width on mobile. */
export function Sidebar({ user }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const mobileOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const { user: authUser } = useAuth();

  // Prefer the getMe-rich user from AuthProvider (carries firm branding +
  // avatarUrl); the server `user` prop only has JWT claims until hydration.
  const richUser = authUser ?? user;
  const firm = richUser.firm ?? null;
  const avatarUrl = richUser.avatarUrl ?? null;

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
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

  // The collapse (icon-only) behavior is desktop-only. On mobile the drawer
  // always shows the full sidebar.
  const collapsed = isDesktop ? desktopCollapsed : false;

  // Track whether we're on a desktop viewport (>= 1024px).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  // Close the mobile drawer on navigation, on Escape, and when we cross up to
  // a desktop viewport (where the drawer no longer exists).
  useEffect(() => {
    dispatch(closeSidebar());
  }, [pathname, dispatch]);

  useEffect(() => {
    if (isDesktop) dispatch(closeSidebar());
  }, [isDesktop, dispatch]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(closeSidebar());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, dispatch]);

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["OWNER", "ADMIN", "ASSOCIATE", "SUPER_ADMIN"]
    },
    {
      title: "Matters & Cases",
      href: "/matters",
      icon: Scale,
      roles: ["OWNER", "ASSOCIATE"]
    },
    {
      title: "Clients",
      href: "/clients",
      icon: Contact,
      roles: ["OWNER", "ASSOCIATE"]
    },
    {
      title: "Tasks",
      href: "/tasks",
      icon: ListChecks,
      roles: ["OWNER", "ASSOCIATE"]
    },
    {
      title: "Associates & Staff",
      href: "/associates",
      icon: Users,
      roles: ["OWNER"]
    },
    {
      title: "Attendance",
      href: "/attendance",
      icon: Calendar,
      roles: ["OWNER", "ASSOCIATE"]
    },
    {
      title: "Leave Requests",
      href: "/leave",
      icon: CalendarDays,
      roles: ["OWNER", "ASSOCIATE"]
    },
    {
      title: "Expenses & Billing",
      href: "/expenses",
      icon: CreditCard,
      roles: ["OWNER", "ADMIN"]
    },
    {
      title: "Firms Management",
      href: "/platform",
      icon: Building2,
      roles: ["SUPER_ADMIN"]
    }
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  const displayName = user.name || user.email;

  return (
    <>
      {/* Mobile backdrop (hidden on desktop) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="sidebar-backdrop"
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
        // On mobile, a closed drawer is still in the DOM (translated off-canvas);
        // make it inert so its links can't be tabbed into. Desktop is never inert.
        inert={isDesktop ? undefined : !mobileOpen}
        className={cn(
          "flex flex-col justify-between bg-sidebar border-r border-sidebar-border text-sidebar-foreground relative overflow-visible",
          "min-h-screen shrink-0 transition-[transform,width,padding] duration-300 ease-out",
          // Mobile: fixed overlay drawer, off-canvas until opened
          "fixed inset-y-0 left-0 z-50 w-64 p-5",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: normal in-flow flex column, with the collapse behavior
          "lg:static lg:translate-x-0",
          collapsed ? "lg:w-18 lg:p-3" : "lg:w-64 lg:p-5"
        )}
      >
        {/* Floating Collapse Toggle Button (desktop only) */}
        <button
          type="button"
          onClick={() => setDesktopCollapsed(!desktopCollapsed)}
          aria-label={
            desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          aria-expanded={!desktopCollapsed}
          className="hidden lg:flex absolute top-4 -right-3 z-40 h-8 w-8 rounded-full bg-card border border-border shadow-xs items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer hover:scale-105 transition-all"
          title={
            desktopCollapsed
              ? "Expand sidebar (Ctrl+B)"
              : "Collapse sidebar (Ctrl+B)"
          }
        >
          {desktopCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        {/* Top Section */}
        <div className="space-y-6 flex flex-col">
          {/* Brand Logo & Title */}
          <div
            className={cn(
              "flex items-center border-b border-sidebar-border h-11.25",
              collapsed
                ? "justify-center pb-6 mt-6"
                : "gap-3 mt-8 justify-between pb-12"
            )}
          >
            {collapsed ? (
              <FirmLogo
                logoUrl={firm?.logoUrl}
                name={firm?.name ?? "LGA"}
                accentColor={firm?.accentColor}
                size={30}
              />
            ) : (
              <>
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
                {/* Mobile-only close button */}
                <button
                  type="button"
                  onClick={() => dispatch(closeSidebar())}
                  aria-label="Close navigation menu"
                  className="lg:hidden h-8 w-8 rounded-lg bg-sidebar-accent/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Items */}
          <nav
            className="space-y-1.5 pt-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {!collapsed && (
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground px-3 pb-1">
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
                      "relative flex items-center rounded-xl text-xs font-semibold outline-none transition-colors",
                      collapsed
                        ? "justify-center h-9 w-9 mx-auto"
                        : "px-3.5 py-2.5 gap-3 w-full",
                      isActive
                        ? "text-sidebar-primary-foreground font-bold shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-sidebar-foreground"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    {/* Hover background pill */}
                    {hoveredIndex === index && !isActive && (
                      <motion.div
                        layoutId="sidebar-hover-pill"
                        className={cn(
                          "absolute inset-0 bg-sidebar-accent/80",
                          collapsed ? "rounded-full" : "rounded-xl"
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
                          collapsed ? "rounded-full" : "rounded-xl"
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
                    {!collapsed && (
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
            collapsed={collapsed}
            displayName={displayName}
            avatarUrl={avatarUrl}
            firm={firm}
          />
        </div>
      </aside>
    </>
  );
}
