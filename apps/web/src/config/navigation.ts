import {
  Building2,
  Calendar,
  CalendarDays,
  Contact,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Scale,
  Users,
  LucideIcon
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
}

export const navItems: NavItem[] = [
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
