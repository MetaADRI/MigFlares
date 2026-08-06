import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type LoginInput } from "@/utils/validation";

const REMEMBER_KEY = "mf_remember_username";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Prefill remembered username.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setRememberMe(true);
      setValue("username", saved);
    }
  }, [setValue]);

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values.username, values.password);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, values.username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch {
      const message = "Invalid username or password. Please try again.";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="glass rounded-3xl border border-white/15 p-7 shadow-2xl shadow-black/50 sm:p-9">
        {/* Header */}
        <div className="mb-7 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Staff Portal
          </span>
          <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight text-white">
            {greeting()}
          </h1>
          <p className="mt-1.5 text-sm text-white/50">
            {todayLabel()} · Sign in to manage your car wash
          </p>
        </div>

        {/* Error banner */}
        {serverError ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-3 text-sm text-red-200 animate-fade-in-up">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/80">
              Username
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <input
                id="username"
                autoComplete="username"
                placeholder="e.g. admin"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3.5 text-sm text-white shadow-inner outline-none transition-all placeholder:text-white/30 focus:border-orange-400/60 focus:bg-white/[0.14] focus:ring-2 focus:ring-orange-500/30"
                {...register("username")}
              />
            </div>
            {errors.username ? (
              <p className="text-xs text-red-300">{errors.username.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-orange-300 transition-colors hover:text-orange-200"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-11 text-sm text-white shadow-inner outline-none transition-all placeholder:text-white/30 focus:border-orange-400/60 focus:bg-white/[0.14] focus:ring-2 focus:ring-orange-500/30"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition-colors hover:text-white/80"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-red-300">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(Boolean(v))}
                className="border-white/30 bg-white/10 text-white data-[state=checked]:border-orange-400 data-[state=checked]:bg-orange-500"
              />
              Remember me
            </label>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full bg-gradient-to-r from-orange-500 to-[#F47B20] text-[15px] font-semibold shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-orange-500"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
            {!isSubmitting ? <ArrowRight /> : null}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
