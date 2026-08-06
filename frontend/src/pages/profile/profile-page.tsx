import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Clock, KeyRound, Loader2, Lock, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROLE_META } from "@/constants";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";
import type { LoginRecord } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logins, setLogins] = useState<LoginRecord[]>([]);

  useEffect(() => {
    void profileService.loginHistory().then(setLogins).catch(() => undefined);
  }, []);

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      await profileService.update({ fullName, email: email || null, phone: phone || null });
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
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
              <Avatar name={user.fullName} size="lg" />
              <button
                type="button"
                aria-label="Change photo"
                className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-110"
                onClick={() => toast.info("Cloudinary avatar upload coming soon")}
              >
                <Camera className="size-4" />
              </button>
            </div>
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
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security (coming soon).</p>
                </div>
                <Badge variant="secondary">Placeholder</Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active sessions</p>
                  <p className="text-xs text-muted-foreground">Sign out of other devices (placeholder).</p>
                </div>
                <Badge variant="secondary">Placeholder</Badge>
              </div>
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
                <p className="text-xs text-muted-foreground">Your latest sign-in activity.</p>
              </div>
            </div>
            {logins.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent logins recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {logins.map((login, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm">
                    <span className="font-medium text-foreground">{formatDateTime(login.createdAt)}</span>
                    <span className="font-mono text-xs text-muted-foreground">{login.ipAddress ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
