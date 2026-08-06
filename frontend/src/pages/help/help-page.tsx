import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Command,
  HelpCircle,
  Keyboard,
  Lightbulb,
  LifeBuoy,
  Mail,
  MessageSquarePlus,
  Play,
  Rocket,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/constants";
import { cn } from "@/utils/cn";

const FAQS = [
  {
    q: "How do I record a new wash job?",
    a: "Open Wash Jobs from the Operations menu and press 'New Wash Job'. Pick the customer, their vehicle and the service, add any extras, then assign an attendant. The job moves through Pending → In Progress → Completed, and a receipt is generated automatically on completion.",
  },
  {
    q: "How are receipts numbered?",
    a: "Receipts use the prefix and format set in Settings → Receipts. The default format is RCP-{date}-{seq:4}, giving you a unique, chronological receipt number for every wash.",
  },
  {
    q: "When does stock get flagged as low?",
    a: "Inventory items are flagged when the quantity on hand drops to or below the reorder level you set on the item. The Inventory page shows a low-stock banner and the bell icon alerts you to reorder.",
  },
  {
    q: "Can I undo a completed wash?",
    a: "A completed wash keeps its receipt for accounting integrity. If a mistake was made, void the receipt from the Receipts page with a reason — the void is recorded in the audit log.",
  },
  {
    q: "How do I approve an expense?",
    a: "Expenses enter as Pending. Open the Expenses page, find the entry, and use Approve or Reject. Approved expenses feed into the monthly expense totals on the dashboard and analytics.",
  },
  {
    q: "What happens when I suspend an employee?",
    a: "Suspended employees can no longer be assigned to new wash jobs, but their history is preserved for reporting and payroll preparation.",
  },
];

const SHORTCUTS = [
  { keys: "G then D", action: "Go to Dashboard" },
  { keys: "G then W", action: "Go to Wash Jobs" },
  { keys: "N", action: "New wash job" },
  { keys: "/", action: "Focus search" },
  { keys: "?", action: "Show keyboard help" },
];

const QUICK_START = [
  { step: 1, title: "Record your first wash", detail: "Wash Jobs → New Wash Job. Select a customer, vehicle and service." },
  { step: 2, title: "Set up your services", detail: "Services → Add Service. Add prices, durations and stock requirements." },
  { step: 3, title: "Add your team", detail: "Employees → Add Employee. Attendants appear in the wash form." },
  { step: 4, title: "Stock your shelves", detail: "Inventory → Add Item. Set reorder levels to get low-stock alerts." },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [feedbackType, setFeedbackType] = useState<"feedback" | "bug" | "feature">("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const send = () => {
    if (message.trim().length < 10) {
      toast.error("Please describe your message in a little more detail");
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setMessage("");
      toast.success(feedbackType === "bug" ? "Bug report sent — thank you!" : "Thanks for your feedback!");
    }, 900);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Help & Support" description="Guides, answers and ways to reach the Mig Flares team." />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left rail */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#191919] to-[#2a2a2a] p-5 text-white shadow-lg"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-white/10">
              <LifeBuoy className="size-5 text-orange-400" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">Need a hand?</h3>
            <p className="mt-1 text-sm text-white/70">
              Our team supports {BRAND.fullName} from {BRAND.location}.
            </p>
            <div className="mt-4 space-y-2 text-sm text-white/80">
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-orange-400" /> support@migflares.co.zm
              </p>
              <p className="flex items-center gap-2">
                <MessageSquarePlus className="size-4 text-orange-400" /> +260 977 000 001
              </p>
            </div>
            <Badge className="mt-4 bg-white/10 text-white">Version 1.3.0 · Enterprise</Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <Play className="size-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">Video tutorials</h3>
            </div>
            <div className="mt-4 space-y-2.5">
              {["Getting started", "Recording a wash", "Managing inventory", "Monthly reports"].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:border-orange-200"
                  onClick={() => toast.info("Video tutorials are placeholders in demo mode")}
                >
                  <Play className="size-3.5 text-primary" /> {v}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Keyboard className="size-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">Keyboard shortcuts</h3>
            </div>
            <div className="mt-4 space-y-2.5">
              {SHORTCUTS.map((s) => (
                <div key={s.action} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{s.action}</span>
                  <kbd className="rounded-lg border border-border/70 bg-background px-2 py-0.5 font-mono text-xs text-foreground">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
                <Command className="size-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">About</h3>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{BRAND.fullName}</span> — professional car wash
                management system.
              </p>
              <p>Version 1.3.0 (Phase 3)</p>
              <p>License: Commercial · Single branch</p>
              <p>© {new Date().getFullYear()} {BRAND.fullName}, Lusaka.</p>
            </div>
          </motion.div>
        </div>

        {/* Main content */}
        <div className="space-y-5 lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Rocket className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Quick start guide</h3>
                  <p className="text-xs text-muted-foreground">Four steps to a running wash bay.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {QUICK_START.map((s) => (
                  <div key={s.step} className="flex gap-3 rounded-xl border border-border/60 bg-background/60 p-4">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-orange-50 text-xs font-bold text-orange-600">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <HelpCircle className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Frequently asked questions</h3>
                  <p className="text-xs text-muted-foreground">Answers to the questions we hear most.</p>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {FAQS.map((faq, i) => (
                  <div key={i}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span className="text-sm font-medium text-foreground">{faq.q}</span>
                      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", openFaq === i && "rotate-180")} />
                    </button>
                    {openFaq === i ? (
                      <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <Lightbulb className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Send us a message</h3>
                  <p className="text-xs text-muted-foreground">Feedback, bug reports and feature requests.</p>
                </div>
              </div>

              <Tabs value={feedbackType} onValueChange={(v) => setFeedbackType(v as typeof feedbackType)}>
                <TabsList className="mb-5">
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  <TabsTrigger value="bug">Bug report</TabsTrigger>
                  <TabsTrigger value="feature">Feature request</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Your email</Label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{feedbackType === "bug" ? "Describe the bug" : "Your message"}</Label>
                  <Textarea
                    rows={4}
                    placeholder={
                      feedbackType === "bug"
                        ? "What were you doing, what happened, and what did you expect?"
                        : feedbackType === "feature"
                          ? "What would make the system better for your team?"
                          : "Tell us what's working well or what we could improve…"
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setMessage(""); setEmail(""); }}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={send} disabled={sending}>
                    <Send className="size-4" /> {sending ? "Sending…" : "Send message"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
