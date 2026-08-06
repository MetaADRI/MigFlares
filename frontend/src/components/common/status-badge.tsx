import { cn } from "@/utils/cn";

export interface StatusMeta {
  label: string;
  className: string;
  dot: string;
}

interface StatusBadgeProps {
  meta: StatusMeta;
  className?: string;
}

/** Colored pill badge driven by status metadata. */
export function StatusBadge({ meta, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
