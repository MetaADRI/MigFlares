import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BellRing,
  Camera,
  Check,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  LockKeyhole,
  type LucideIcon,
  Mail,
  MapPin,
  MonitorSmartphone,
  Phone,
  Pin,
  Save,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_META } from "@/constants";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";
import { uploadImage } from "@/services/upload.service";
import type { LoginHistoryResult } from "@/types";
import { formatDateTime } from "@/utils/format";

/** Developer contact shown in the "contact developer" dialog. */
const DEVELOPER_CONTACT = {
  email: "adrianmange00@gmail.com",
  phone: "+260 96274 6692",
} as const;

interface ProtectionOption {
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Account protection options offered by the developer on request. */
const PROTECTION_OPTIONS: ProtectionOption[] = [
  {
    title: "Two-factor authentication (TOTP)",
    description:
      "Add an extra layer of security with time-based one-time passwords (TOTP, RFC 6238). Can be implemented upon request.",
    icon: ShieldCheck,
  },
  {
    title: "Active sessions",
    description:
      "Sign out of other devices you're currently logged in on. Can be implemented upon request.",
    icon: MonitorSmartphone,
  },
  {
    title: "Account lockout",
    description:
      "Temporarily lock the account after repeated failed sign-in attempts. Can be implemented upon request.",
    icon: LockKeyhole,
  },
  {
    title: "Login alerts",
    description:
      "Get notified when your account signs in from a new device. Can be implemented upon request.",
    icon: BellRing,
  },
  {
    title: "Sensitive-action PIN",
    description:
      "Require a PIN before refunds, discounts or record deletions are approved. Can be implemented upon request.",
    icon: Pin,
  },
  {
    title: "Session timeout",
    description:
      "Automatically sign you out after a period of inactivity. Can be implemented upon request.",
    icon: Timer,
  },
];

/** Plain selectable contact value with a copy button (not a link). */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="select-all truncate font-mono text-sm text-foreground">{value}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logins, setLogins] = useState<LoginHistoryResult | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void profileService.loginHistory().then(setLogins).catch(() => undefined);
  }, []);

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await profileService.update({ fullName, email: email || null, phone: phone || null });
      updateUser(updated);
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const updated = await profileService.update({ avatarUrl: url });
      updateUser(updated);
      toast.success("Profile picture updated");
    } catch {
      toast.error("Could not upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChanging(true);
    try {
      await profileService.changePassword(currentPassword, newPassword);
      toast.success("Password changed — you will need to sign in again on other devices");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setChanging(false);
    }
  };

  const roleMeta = ROLE_META[user.role];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account, activity and security settings." />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]"
        >
          <div className="h-24 bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-amber-100/30" />
          <div className="-mt-10 flex flex-col items-center px-6 pb-6">
            <div className="relative">
              <Avatar name={user.fullName} src={user.avatarUrl} size="lg" />
              <button
                type="button"
                aria-label="Change photo"
                title="Upload profile picture"
                className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-110 disabled:opacity-60"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              </button>
            </div>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-primary transition-colors hover:underline disabled:opacity-60"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void uploadAvatar(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <h2 className="mt-3 font-display text-lg font-bold text-foreground">{user.fullName}</h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <Badge variant="secondary" className={`mt-2 ${roleMeta.className}`}>
              {roleMeta.label}
            </Badge>
            <div className="mt-5 w-full space-y-2.5 text-sm">
              <p className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="size-4 text-primary" /> {user.email ?? "No email set"}
              </p>
              <p className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="size-4 text-primary" /> {user.phone ?? "No phone set"}
              </p>
              <p className="flex items-center gap-2.5 text-muted-foreground">
                <MapPin className="size-4 text-primary" /> Nkoloma Stadium, Lusaka
              </p>
              <p className="flex items-center gap-2.5 text-muted-foreground">
                <Clock className="size-4 text-primary" /> Last sign-in {formatDateTime(user.lastLoginAt)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Forms */}
        <div className="space-y-5 lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <UserRound className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Profile details</h3>
                  <p className="text-xs text-muted-foreground">Update the information shown on your account.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button size="sm" onClick={() => void saveProfile()} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <KeyRound className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Change password</h3>
                  <p className="text-xs text-muted-foreground">Choose a strong password you don't use elsewhere.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Current password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => void changePassword()} disabled={changing}>
                  {changing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Update password
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Security + recent logins */}
      <div className="grid gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="size-4.5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Security</h3>
                <p className="text-xs text-muted-foreground">Account protection options.</p>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {PROTECTION_OPTIONS.map((option) => (
                <div key={option.title} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground">
                      <option.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{option.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setContactOpen(true)}
                  >
                    Contact developer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
                <Clock className="size-4.5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Recent logins</h3>
                <p className="text-xs text-muted-foreground">Sign-in activity today — resets at midnight.</p>
              </div>
            </div>
            {logins ? (
              <>
                <div className="mb-3 flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm">
                  <span className="text-muted-foreground">Sign-ins today</span>
                  <span className="font-display text-base font-bold text-foreground">{logins.total}</span>
                </div>
                {logins.data.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No logins recorded today.</p>
                ) : (
                  <div className="space-y-2.5">
                    {logins.data.map((login, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm">
                        <span className="font-medium text-foreground">{formatDateTime(login.createdAt)}</span>
                        <span className="font-mono text-xs text-muted-foreground">{login.ipAddress ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </div>

      {/* Contact developer dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact the developer</DialogTitle>
            <DialogDescription>
              These features can be implemented upon request. Reach out to the developer to discuss setup
              and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5">
            <CopyField label="Email" value={DEVELOPER_CONTACT.email} />
            <CopyField label="Phone / WhatsApp" value={DEVELOPER_CONTACT.phone} />
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
            Copy the details above and send a message — the developer will get back to you.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
