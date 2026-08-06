import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/utils/validation";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (_values: ForgotPasswordInput) => {
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    toast.success("Reset link sent — check your inbox.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="glass rounded-3xl border border-white/15 p-7 shadow-2xl shadow-black/50 sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-[#F47B20] shadow-lg shadow-orange-500/30">
            <KeyRound className="size-5 text-white" />
          </div>
          <h1 className="mt-4 font-display text-[24px] font-bold tracking-tight text-white">
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm text-white/50">
            Enter your account email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-4 text-center animate-fade-in-up">
            <p className="text-sm font-medium text-emerald-200">Link sent successfully</p>
            <p className="mt-1 text-xs text-emerald-200/70">
              Follow the instructions in the email to reset your password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/80">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3.5 text-sm text-white shadow-inner outline-none transition-all placeholder:text-white/30 focus:border-orange-400/60 focus:bg-white/[0.14] focus:ring-2 focus:ring-orange-500/30"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-red-300">{errors.email.message}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full bg-gradient-to-r from-orange-500 to-[#F47B20] text-[15px] font-semibold shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-orange-500"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
              {!isSubmitting ? <Send /> : null}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    </motion.div>
  );
}
