import { Outlet } from "react-router-dom";
import { MapPin } from "lucide-react";
import { BRAND } from "@/constants";

/** Full-screen brand backdrop used by login & password pages. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#121212] px-4 py-10">
      {/* Floating brand orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-40 -top-40 size-[480px] rounded-full bg-orange-500/25 blur-[120px] animate-float-slow" />
        <div className="absolute -right-40 top-1/3 size-[420px] rounded-full bg-amber-400/20 blur-[110px] animate-float-slower" />
        <div className="absolute -bottom-40 left-1/3 size-[400px] rounded-full bg-orange-600/25 blur-[120px] animate-float-slow" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img
            src="/login-logo.jpeg"
            alt={BRAND.name}
            className="h-24 w-auto max-w-[300px] rounded-2xl object-contain drop-shadow-[0_8px_28px_rgba(244,123,32,0.35)]"
          />
          <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-white/85">
            {BRAND.tagline}
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-white/45">
            <MapPin className="size-3" /> {BRAND.location}
          </p>
        </div>

        <Outlet />

        <p className="mt-8 text-xs text-white/30">
          © {new Date().getFullYear()} {BRAND.fullName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
