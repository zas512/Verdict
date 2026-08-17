"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DashboardTileId } from "@/hooks/useDashboardTileOrder";

/**
 * A draggable dashboard tile. Dragging is handle-scoped (the grip in the top
 * right) so the card's own buttons and links stay click-safe — the @dnd-kit
 * PointerSensor + KeyboardSensor are attached only to the grip.
 */
export function DashboardTile({
  id,
  className,
  children
}: {
  id: DashboardTileId;
  className?: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "group/tile relative h-full",
        isDragging && "z-50",
        className
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder card"
        title="Drag to reorder"
        className="text-muted-foreground/40 hover:bg-muted hover:text-foreground focus-visible:ring-primary/40 absolute top-2 right-2 z-30 flex h-7 w-7 cursor-grab items-center justify-center rounded-lg opacity-0 transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {isDragging && (
        <div
          aria-hidden
          className="ring-primary/50 pointer-events-none absolute inset-0 z-20 rounded-[1.5rem] shadow-2xl ring-2"
        />
      )}
      {children}
    </div>
  );
}
