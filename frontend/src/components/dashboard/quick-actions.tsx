import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { QUICK_ACTIONS } from "@/constants";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
        Quick Actions
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">Frequent operations</p>

      <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-start justify-between rounded-xl border border-border/70 bg-background/60 p-4 text-left transition-all duration-200 hover:border-primary/40 hover:bg-orange-50/60 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="grid size-9 place-items-center rounded-lg bg-orange-50 text-orange-600 transition-transform duration-200 group-hover:scale-110">
              <action.icon className="size-[18px]" strokeWidth={2.2} />
            </div>
            <div className="mt-3 flex w-full items-center justify-between gap-1">
              <span className="text-sm font-semibold text-foreground">{action.label}</span>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <span className="mt-0.5 text-xs text-muted-foreground">{action.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
