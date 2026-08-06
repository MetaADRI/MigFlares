import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Cloud, Loader2, ReceiptText, RotateCcw, Save, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { settingsService } from "@/services/settings.service";
import { usePermission } from "@/context/permission-context";
import type { SettingsMap } from "@/types";

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
      <div className="mb-5">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("settings:manage");

  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    settingsService
      .get()
      .then(setSettings)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const set = (key: string, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async (keys: string[]) => {
    if (!settings) return;
    setSaving(true);
    try {
      const values: Record<string, string> = {};
      keys.forEach((k) => (values[k] = settings[k]));
      const updated = await settingsService.update(values);
      setSettings(updated);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Business configuration and system preferences." />
        <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-card" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Business configuration and system preferences." />
        <ErrorState message="Could not load settings." onRetry={load} />
      </div>
    );
  }

  const saveIcon = saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Business information, receipts, preferences and security.">
        {canManage ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void settingsService.reset().then(setSettings).then(() => toast.success("Settings reset to defaults"));
            }}
          >
            <RotateCcw /> Reset defaults
          </Button>
        ) : null}
      </PageHeader>

      {!canManage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          <ShieldCheck className="size-4 shrink-0" />
          You have read-only access to settings. Only the Owner can change business configuration.
        </div>
      ) : null}

      <Tabs defaultValue="business">
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl border border-border/60 bg-card p-1 sm:w-auto">
          <TabsTrigger value="business">
            <Building2 /> Business
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <ReceiptText /> Receipts
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings2 /> Preferences
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-5 space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SettingsSection title="Business information" description="Shown on receipts, reports and the login screen.">
              <fieldset disabled={!canManage} className="contents">
                <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Company name">
                  <Input value={settings["business.name"]} onChange={(e) => set("business.name", e.target.value)} />
                </SettingsField>
                <SettingsField label="Phone" hint="Displayed to customers">
                  <Input value={settings["business.phone"]} onChange={(e) => set("business.phone", e.target.value)} />
                </SettingsField>
                <SettingsField label="Email">
                  <Input value={settings["business.email"]} onChange={(e) => set("business.email", e.target.value)} />
                </SettingsField>
                <SettingsField label="Tax number (TPIN)">
                  <Input value={settings["business.taxNumber"]} onChange={(e) => set("business.taxNumber", e.target.value)} />
                </SettingsField>
                <SettingsField label="Currency">
                  <Input value={settings["business.currency"]} onChange={(e) => set("business.currency", e.target.value)} />
                </SettingsField>
                <SettingsField label="Timezone">
                  <Input value={settings["business.timezone"]} onChange={(e) => set("business.timezone", e.target.value)} />
                </SettingsField>
                <div className="sm:col-span-2">
                  <SettingsField label="Address">
                    <Textarea value={settings["business.address"]} onChange={(e) => set("business.address", e.target.value)} rows={2} />
                  </SettingsField>
                </div>
                <div className="sm:col-span-2">
                  <SettingsField label="Business hours">
                    <Input value={settings["business.hours"]} onChange={(e) => set("business.hours", e.target.value)} />
                  </SettingsField>
                </div>
                </div>
              </fieldset>
              {canManage ? (
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => void save(["business.name", "business.phone", "business.email", "business.taxNumber", "business.currency", "business.timezone", "business.address", "business.hours"])}>
                    {saveIcon} Save business info
                  </Button>
                </div>
              ) : null}
            </SettingsSection>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
            <SettingsSection title="Logo" description="Your brand mark appears on receipts and reports.">
              <div className="flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/40 text-muted-foreground">
                  <Cloud className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Cloudinary upload is configured — logo assets go here.
                  </p>
                  <p className="text-xs text-muted-foreground/70">PNG or SVG, max 2 MB.</p>
                </div>
              </div>
            </SettingsSection>
          </motion.div>
        </TabsContent>

        <TabsContent value="receipts" className="mt-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SettingsSection title="Receipt settings" description="How receipts are numbered and presented.">
              <fieldset disabled={!canManage} className="contents">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Receipt prefix" hint="e.g. RCP">
                    <Input value={settings["receipt.prefix"]} onChange={(e) => set("receipt.prefix", e.target.value)} />
                  </SettingsField>
                  <SettingsField label="Number format" hint="Supports {date} and {seq:N} placeholders">
                    <Input value={settings["receipt.numberFormat"]} onChange={(e) => set("receipt.numberFormat", e.target.value)} />
                  </SettingsField>
                  <div className="sm:col-span-2">
                    <SettingsField label="Receipt footer">
                      <Textarea value={settings["receipt.footer"]} onChange={(e) => set("receipt.footer", e.target.value)} rows={2} />
                    </SettingsField>
                  </div>
                  <SettingsField label="Show tax on receipts">
                    <select
                      value={settings["receipt.showTax"]}
                      onChange={(e) => set("receipt.showTax", e.target.value)}
                      className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="true">Yes — show tax lines</option>
                      <option value="false">No — hide tax lines</option>
                    </select>
                  </SettingsField>
                </div>
              </fieldset>
              {canManage ? (
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => void save(["receipt.prefix", "receipt.numberFormat", "receipt.footer", "receipt.showTax"])}>
                    {saveIcon} Save receipt settings
                  </Button>
                </div>
              ) : null}
            </SettingsSection>
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SettingsSection title="System preferences" description="Theme, language and data management.">
              <fieldset disabled={!canManage} className="contents">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Theme">
                    <select
                      value={settings["prefs.theme"]}
                      onChange={(e) => set("prefs.theme", e.target.value)}
                      className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </SettingsField>
                  <SettingsField label="Language">
                    <select
                      value={settings["prefs.language"]}
                      onChange={(e) => set("prefs.language", e.target.value)}
                      className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="en">English</option>
                      <option value="ny">Nyanja</option>
                      <option value="bem">Bemba</option>
                    </select>
                  </SettingsField>
                  <SettingsField label="Date format">
                    <Input value={settings["prefs.dateFormat"]} onChange={(e) => set("prefs.dateFormat", e.target.value)} />
                  </SettingsField>
                  <SettingsField label="Backup frequency">
                    <select
                      value={settings["prefs.backupFrequency"]}
                      onChange={(e) => set("prefs.backupFrequency", e.target.value)}
                      className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </SettingsField>
                </div>
              </fieldset>
              {canManage ? (
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => void save(["prefs.theme", "prefs.language", "prefs.dateFormat", "prefs.backupFrequency"])}>
                    {saveIcon} Save preferences
                  </Button>
                </div>
              ) : null}
            </SettingsSection>
          </motion.div>
        </TabsContent>

        <TabsContent value="security" className="mt-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SettingsSection title="Security settings" description="Password policy, sessions and two-factor authentication.">
              <fieldset disabled={!canManage} className="contents">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Password policy">
                    <select
                      value={settings["security.passwordPolicy"]}
                      onChange={(e) => set("security.passwordPolicy", e.target.value)}
                      className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="basic">Basic — 6+ characters</option>
                      <option value="medium">Medium — 8+ characters, letters & numbers</option>
                      <option value="strong">Strong — 10+ characters, symbols required</option>
                    </select>
                  </SettingsField>
                  <SettingsField label="Session timeout (minutes)">
                    <Input type="number" value={settings["security.sessionTimeout"]} onChange={(e) => set("security.sessionTimeout", e.target.value)} />
                  </SettingsField>
                  <div className="sm:col-span-2">
                    <SettingsField label="Two-factor authentication" hint="Coming in a future release">
                      <select
                        value={settings["security.twoFactorEnabled"]}
                        onChange={(e) => set("security.twoFactorEnabled", e.target.value)}
                        className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                      >
                        <option value="false">Disabled (placeholder)</option>
                        <option value="true">Enabled (placeholder)</option>
                      </select>
                    </SettingsField>
                  </div>
                </div>
              </fieldset>
              {canManage ? (
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => void save(["security.passwordPolicy", "security.sessionTimeout", "security.twoFactorEnabled"])}>
                    {saveIcon} Save security settings
                  </Button>
                </div>
              ) : null}
            </SettingsSection>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
