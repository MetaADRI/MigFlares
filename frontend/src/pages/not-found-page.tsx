import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#121212] px-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 -top-32 size-[400px] rounded-full bg-orange-500/20 blur-[110px] animate-float-slow" />
        <div className="absolute -right-32 bottom-0 size-[360px] rounded-full bg-amber-400/15 blur-[100px] animate-float-slower" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <Logo className="mb-10" />
        <div className="grid size-20 place-items-center rounded-3xl bg-white/[0.06] text-orange-300 ring-1 ring-white/10">
          <Compass className="size-9" strokeWidth={1.6} />
        </div>
        <h1 className="mt-6 font-display text-6xl font-extrabold tracking-tight text-white">404</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
          This bay is empty — the page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/" className="mt-8">
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-[#F47B20] shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-orange-500">
            <ArrowLeft /> Back to dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
