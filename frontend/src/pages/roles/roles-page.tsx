import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Ban,
  Check,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSION_CATALOG, ROLE_META } from "@/constants";
import { usePermission } from "@/context/permission-context";
import { rolesService, type RoleInput, type UserInput } from "@/services/roles.service";
import { Avatar } from "@/components/ui/avatar";
import type { PermissionDef, Role, SystemUser } from "@/types";
import { cn } from "@/utils/cn";

export default function RolesPage() {
  const { hasPermission } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "role-attendant",
  });

  const canManage = hasPermission("users:manage");

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([rolesService.listRoles(), rolesService.listPermissions(), rolesService.listUsers()])
      .then(([r, p, u]) => {
        setRoles(r);
        setPermissions(p);
        setUsers(u);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const permissionKeys = useMemo(() => new Set(permissions.map((p) => p.key)), [permissions]);

  const toggleRole = async (role: Role) => {
    if (!canManage) return;
    try {
      const updated = await rolesService.toggle(role.id, !role.isActive);
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(`${ROLE_META[updated.name].label} ${updated.isActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Could not update role");
    }
  };

  const assignUserRole = async (userId: string, roleId: string) => {
    if (!canManage) return;
    try {
      const updated = await rolesService.setUserRole(userId, roleId);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success("User role updated");
    } catch {
      toast.error("Could not update user role");
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      roleId: roles.find((r) => r.name === "ATTENDANT")?.id ?? "role-attendant",
    });
    setUserDialogOpen(true);
  };

  const openEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email ?? "",
      phone: u.phone ?? "",
      password: "",
      roleId: u.roleId,
    });
    setUserDialogOpen(true);
  };

  const toggleUserStatus = async (u: SystemUser) => {
    if (!canManage) return;
    try {
      const updated = await rolesService.setUserStatus(u.id, !u.isActive);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(updated.isActive ? `${updated.fullName} activated` : `${updated.fullName} suspended`);
    } catch {
      toast.error("Could not update user status");
    }
  };

  const saveUser = async () => {
    if (!canManage || !userForm.username.trim() || !userForm.fullName.trim()) {
      toast.error("Username and full name are required");
      return;
    }
    if (!editingUser && userForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSavingUser(true);
    try {
      if (editingUser) {
        const input: Partial<UserInput> = {
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim() || null,
          phone: userForm.phone.trim() || null,
          roleId: userForm.roleId,
          ...(userForm.password ? { password: userForm.password } : {}),
        };
        const updated = await rolesService.updateUser(editingUser.id, input);
        setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast.success("User updated");
      } else {
        const input: UserInput = {
          username: userForm.username.trim(),
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim() || null,
          phone: userForm.phone.trim() || null,
          password: userForm.password,
          roleId: userForm.roleId,
        };
        const created = await rolesService.createUser(input);
        setUsers((prev) => [...prev, created]);
        toast.success(`${created.fullName} created with ${ROLE_META[created.roleName].label} access`);
      }
      setUserDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save user");
    } finally {
      setSavingUser(false);
    }
  };

  const openCreate = () => {
    setCreating(true);
    setEditingRole(null);
    setRoleName("MANAGER");
    setRoleDescription("");
    setDraftPermissions([]);
  };

  const openEdit = (role: Role) => {
    setCreating(false);
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description ?? "");
    setDraftPermissions([...role.permissions]);
  };

  const toggleDraftPermission = (key: string) => {
    setDraftPermissions((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const saveRole = async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      const input: RoleInput = {
        name: roleName as Role["name"],
        description: roleDescription || null,
        permissionKeys: draftPermissions,
        ...(editingRole ? { isActive: editingRole.isActive } : {}),
      };
      if (editingRole) {
        const updated = await rolesService.update(editingRole.id, input);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success("Role updated");
      } else {
        const created = await rolesService.create(input);
        setRoles((prev) => [...prev, created]);
        toast.success("Role created");
      }
      setEditingRole(null);
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save role");
    } finally {
      setSaving(false);
    }
  };

  const manageCount = draftPermissions.length;

  if (loading) return <LoadingState label="Loading roles & permissions…" />;
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users & Roles" description="Roles, permissions and user assignment." />
        <ErrorState message="Could not load roles and permissions." onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Control what each team member can see and do.">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openCreateUser} disabled={!canManage}>
            <Plus /> New user
          </Button>
          <Button size="sm" onClick={openCreate} disabled={!canManage}>
            <Plus /> New role
          </Button>
        </div>
      </PageHeader>

      {/* Role matrix */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((role, i) => {
          const meta = ROLE_META[role.name];
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all",
                !role.isActive ? "opacity-60" : "border-border/70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={cn("grid size-10 place-items-center rounded-xl", meta.className)}>
                  <ShieldCheck className="size-5" />
                </div>
                {role.name === "OWNER" ? <Lock className="size-4 text-muted-foreground/50" /> : null}
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">{meta.label}</h3>
              <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                {role.description}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {role.userCount} user{role.userCount === 1 ? "" : "s"}
                <span className="text-muted-foreground/50">·</span>
                {role.permissions.length} permissions
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
                {role.name === "OWNER" ? (
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">System role</span>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Switch
                      checked={role.isActive}
                      disabled={!canManage}
                      onCheckedChange={() => void toggleRole(role)}
                    />
                    {role.isActive ? "Active" : "Inactive"}
                  </label>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={!canManage || role.name === "OWNER"}
                  onClick={() => openEdit(role)}
                >
                  Edit
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Permission matrix */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-orange-50 text-orange-600">
                <UserCog className="size-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Permission matrix</h3>
                <p className="text-xs text-muted-foreground">Which roles can access each module.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Module
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className={cn("inline-block rounded-full px-2 py-0.5", ROLE_META[role.name].className)}>
                        {ROLE_META[role.name].label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_CATALOG.map((module) => {
                  return (
                    <tr key={module.module} className="border-b border-border/40">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{module.moduleLabel}</p>
                      </td>
                      {roles.map((role) => {
                        const granted = module.permissions.filter((p) => role.permissions.includes(p.key)).length;
                        const total = module.permissions.length;
                        const full = granted === total;
                        const partial = granted > 0 && granted < total;
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            {full ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                <Check className="size-3" /> All
                              </span>
                            ) : partial ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                {granted}/{total}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 text-xs text-muted-foreground">
            Dash (–) means no access. Partial access shows granted / total permissions.
          </div>
        </div>
      </motion.div>

      {/* Team members */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Team members</h3>
              <p className="text-xs text-muted-foreground">Create staff accounts and grant roles — including other admins.</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={openCreateUser} disabled={!canManage}>
              <Plus className="size-3.5" /> Add user
            </Button>
          </div>
          <div className="divide-y divide-border/40">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={u.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {u.fullName}
                      {u.roleName === "OWNER" ? (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                          Admin
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username}
                      {u.email ? ` · ${u.email}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={u.roleId}
                    disabled={!canManage}
                    onValueChange={(v) => void assignUserRole(u.id, v)}
                  >
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id} disabled={!r.isActive}>
                          {ROLE_META[r.name].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    title="Edit user"
                    disabled={!canManage}
                    onClick={() => openEditUser(u)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  {u.roleName !== "OWNER" ? (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      title={u.isActive ? "Suspend user" : "Activate user"}
                      disabled={!canManage}
                      onClick={() => void toggleUserStatus(u)}
                    >
                      {u.isActive ? <Ban className="size-3.5 text-amber-600" /> : <Check className="size-3.5 text-emerald-600" />}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {users.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No users found.</p>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* User dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? `Edit ${editingUser.fullName}` : "Create a user"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update profile details, role or password."
                : "Add a staff login. Choose a role — Owner grants full admin access."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={userForm.fullName}
                onChange={(e) => setUserForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="e.g. Chanda Mulenga"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="username"
                  disabled={Boolean(editingUser)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={userForm.roleId} onValueChange={(v) => setUserForm((f) => ({ ...f, roleId: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} disabled={!r.isActive}>
                        {ROLE_META[r.name].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@migflares.co.zm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+260 ..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                {editingUser ? "New password" : "Password"}
                {!editingUser ? <span className="text-muted-foreground">(min 6 characters)</span> : null}
              </Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
              />
            </div>
            {!editingUser ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-orange-200/70 bg-orange-50/60 p-3 text-xs leading-relaxed text-orange-900">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-orange-600" />
                <span>
                  Choosing <strong>Owner</strong> creates another administrator with full system access, including
                  user and role management.
                </span>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveUser()} disabled={savingUser || !canManage}>
              {savingUser ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {editingUser ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role editor dialog */}
      <Dialog open={creating || Boolean(editingRole)} onOpenChange={(open) => { if (!open) { setCreating(false); setEditingRole(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? `Edit ${ROLE_META[editingRole.name].label}` : "Create a new role"}</DialogTitle>
            <DialogDescription>
              Choose the permissions this role can access. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role name</Label>
                <Select value={roleName} onValueChange={setRoleName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["MANAGER", "CASHIER", "ATTENDANT"] as const).map((n) => (
                      <SelectItem key={n} value={n}>
                        {ROLE_META[n].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex h-9.5 items-center gap-2 rounded-xl border border-border/70 bg-background px-3 text-sm">
                  <Switch
                    checked={editingRole?.isActive ?? true}
                    onCheckedChange={(v) => setEditingRole((prev) => (prev ? { ...prev, isActive: v } : prev))}
                  />
                  <span className="text-muted-foreground">{editingRole?.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} placeholder="What does this role do?" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Permissions</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDraftPermissions(permissionKeys ? [...permissionKeys] : [])}>
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDraftPermissions([])}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-border/60 p-3">
                {PERMISSION_CATALOG.map((module) => (
                  <div key={module.module}>
                    <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {module.moduleLabel}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {module.permissions.map((p) => {
                        const enabled = draftPermissions.includes(p.key);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => toggleDraftPermission(p.key)}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                              enabled
                                ? "border-orange-200 bg-orange-50/60 text-foreground"
                                : "border-border/60 text-muted-foreground hover:border-orange-200",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                enabled ? "border-primary bg-primary text-white" : "border-border bg-background",
                              )}
                            >
                              {enabled ? <Check className="size-3" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-medium">{p.name}</span>
                              <span className="block text-[10px] leading-snug text-muted-foreground">{p.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {manageCount} of {permissions.length} permissions selected.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditingRole(null); }}>
              Cancel
            </Button>
            <Button onClick={() => void saveRole()} disabled={saving || !canManage}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {editingRole ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
