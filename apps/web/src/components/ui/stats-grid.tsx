import type { LucideIcon } from "lucide-react";
import { Building2, Contact, User, UserCheck } from "lucide-react";
import Card from "@/components/ui/card-custom";

type StatCard = {
  title?: string;
  value?: string | number;
  icon?: LucideIcon;
  color?: "primary" | "success" | "destructive" | "warning";
};

type StatsGridProps = {
  stats?: StatCard[];
};

const defaultStats: StatCard[] = [
  {
    title: "Total Clients",
    value: 0,
    icon: Contact,
    color: "primary"
  },
  {
    title: "Active",
    value: 0,
    icon: UserCheck,
    color: "success"
  },
  {
    title: "Inactive",
    value: 0,
    icon: User,
    color: "destructive"
  },
  {
    title: "Companies",
    value: 0,
    icon: Building2,
    color: "warning"
  }
];

const colorClasses = {
  primary: {
    value: "text-primary",
    icon: "bg-primary/10 text-primary border-primary/20"
  },
  success: {
    value: "text-success",
    icon: "bg-success/10 text-success border-success/20"
  },
  destructive: {
    value: "text-destructive",
    icon: "bg-destructive/10 text-destructive border-destructive/20"
  },
  warning: {
    value: "text-warning",
    icon: "bg-warning/10 text-warning border-warning/20"
  }
};

function StatsCard({
  title = "Untitled",
  value = 0,
  icon: Icon = Contact,
  color = "primary"
}: Readonly<StatCard>) {
  const colors = colorClasses[color];

  return (
    <div className="p-6 flex items-center justify-between">
      <div>
        <p className="font-bold text-lg tracking-wider text-white/90 uppercase">
          {title}
        </p>
        <p className={`text-4xl font-black mt-1 ${colors.value}`}>{value}</p>
      </div>
      <div
        className={`size-14 rounded-full flex items-center justify-center border ${colors.icon}`}
      >
        <Icon className="size-7" />
      </div>
    </div>
  );
}

export function StatsGrid({ stats = defaultStats }: Readonly<StatsGridProps>) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={`${stat.title}-${index}`}>
          <StatsCard {...stat} />
        </Card>
      ))}
    </div>
  );
}
