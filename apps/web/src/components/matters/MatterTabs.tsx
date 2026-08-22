import { MatterTabButtonProps } from "@/types/matterTypes";

export function MatterTabButton({
  tab,
  activeTab,
  onTabSelect,
  icon,
  label,
  id
}: Readonly<MatterTabButtonProps>) {
  const isActive = activeTab === tab;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onTabSelect(tab)}
      className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold tracking-wide ${
        isActive
          ? "bg-primary/5 text-primary border-primary/30 border"
          : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
