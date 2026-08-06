import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/constants";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
}

/** Premium "coming soon" state for Phase 2 pages. */
export function PagePlaceholder({ title, description, icon: Icon, features = [] }: PagePlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-orange-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-amber-100/50 blur-3xl" />

      <div className="relative flex flex-col items-center px-6 py-20 text-center">
        <div className="grid size-20 place-items-center rounded-3xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-600 shadow-inner">
          <Icon className="size-9" strokeWidth={1.7} />
        </div>
        <Badge variant="primary" className="mt-6">
          Scheduled for Phase 2
        </Badge>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>

        {features.length > 0 ? (
          <div className="mt-8 grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-left text-xs font-medium text-foreground/80"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {BRAND.fullName} · {BRAND.location}
        </p>
      </div>
    </motion.div>
  );
}
