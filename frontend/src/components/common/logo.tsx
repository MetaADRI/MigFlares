import { cn } from "@/utils/cn";
import { BRAND } from "@/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  className?: string;
}

/**
 * Brand logo — the official Mig Flares lockup (logo.png) on a white pill so it
 * stays crisp on both the dark sidebar and light surfaces. The pill is
 * height-based so the landscape logo keeps its aspect ratio and stays readable.
 */
export function Logo({ size = "md", withTagline = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md shadow-orange-500/25 ring-1 ring-black/5",
          size === "lg" ? "h-12 px-2.5" : size === "sm" ? "h-8 px-1.5" : "h-10 px-2",
        )}
      >
        <img
          src="/logo.png"
          alt={BRAND.name}
          className={cn("h-full w-auto object-contain", size === "sm" && "max-w-24")}
        />
      </div>
      {withTagline ? (
        <div className="leading-none">
          <p className="font-display text-sm font-bold tracking-tight text-foreground">{BRAND.name}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {BRAND.tagline}
          </p>
        </div>
      ) : null}
    </div>
  );
}
