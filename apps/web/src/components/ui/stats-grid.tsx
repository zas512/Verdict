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
    value: "text-foreground",
    icon: "text-primary"
  },
  success: {
    value: "text-foreground",
    icon: "text-success"
  },
  destructive: {
    value: "text-foreground",
    icon: "text-destructive"
  },
  warning: {
    value: "text-foreground",
    icon: "text-warning"
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
    <div className="p-5">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${colors.icon}`} />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${colors.value}`}>{value}</p>
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
