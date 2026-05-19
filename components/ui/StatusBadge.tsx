import { cn } from "@/lib/cn";
import { IconAlertTriangle, IconBookmark, IconCheck } from "./icons";

export type ActivityStatus = "todo" | "booked" | "paid";

const STATUS_CONFIG: Record<
  ActivityStatus,
  { label: string; classes: string; Icon: typeof IconCheck }
> = {
  todo: {
    label: "To book",
    classes: "bg-status-todo-bg text-status-todo-fg",
    Icon: IconAlertTriangle,
  },
  booked: {
    label: "Booked",
    classes: "bg-status-booked-bg text-status-booked-fg",
    Icon: IconBookmark,
  },
  paid: {
    label: "Paid",
    classes: "bg-status-paid-bg text-status-paid-fg",
    Icon: IconCheck,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ActivityStatus;
  className?: string;
}) {
  const { label, classes, Icon } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-[3px] text-micro font-medium uppercase tracking-eyebrow shrink-0",
        classes,
        className,
      )}
    >
      <Icon className="w-[11px] h-[11px]" />
      {label}
    </span>
  );
}
