import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, Plus, Search, Shield, Trash2, UserPlus, X } from "lucide-react";

type AppRole = "admin" | "manager" | "ads_manager" | "moderator" | "worker" | "customer";

const ROLE_META: Record<AppRole, { label: string; tone: string; icon: string }> = {
  admin: { label: "Admin", tone: "bg-primary text-primary-foreground", icon: "👑" },
  manager: { label: "Manager", tone: "bg-accent text-accent-foreground", icon: "🛡️" },
  ads_manager: { label: "Ads Manager", tone: "bg-secondary text-secondary-foreground", icon: "📣" },
  moderator: { label: "Moderator", tone: "bg-muted text-foreground", icon: "🧰" },
  worker: { label: "Worker", tone: "bg-muted text-muted-foreground", icon: "🔧" },
  customer: { label: "Customer", tone: "bg-muted text-muted-foreground", icon: "👤" },
};

const ASSIGNABLE_ROLES: AppRole[] = ["admin", "manager", "ads_manager", "moderator", "worker", "customer"];

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Props {
  profiles: Profile[];
  userRoles: { user_id: string; role: string }[];
}

export default function UsersManagementTab({ profiles, userRoles }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<AppRole | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"invite" | "create">("invite");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("manager");
  const [busy, setBusy] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const rolesByUser = useMemo(() => {
    const m = new Map<string, AppRole[]>();
    for (const r of userRoles) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      m.set(r.user_id, arr);
    }
    return m;
  }, [userRoles]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      const roles = rolesByUser.get(p.user_id) ?? [];
      if (filterRole !== "all" && !roles.includes(filterRole)) return false;
      if (!q) return true;
      return (
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        p.user_id.toLowerCase().includes(q)
      );
    });
  }, [profiles, rolesByUser, search, filterRole]);

  const callAdmin = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin_user_roles"] });
    qc.invalidateQueries({ queryKey: ["admin_profiles"] });
    qc.invalidateQueries({ queryKey: ["admin_workers"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
  };

  // Mutations for real-time updates
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: AppRole; action: "assign_role" | "remove_role" }) => {
      setUpdatingUserId(userId);
      return callAdmin(action, { userId, role });
    },
    onSuccess: (_, variables) => {
      const actionLabel = variables.action === "assign_role" ? "Assigned" : "Removed";
      toast.success(`${actionLabel} ${ROLE_META[variables.role].label}`);
      refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    },
    onSettled: () => {
      setUpdatingUserId(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      setUpdatingUserId(userId);
      return callAdmin("delete_user", { userId });
    },
    onSuccess: () => {
      toast.success("User deleted");
      refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    },
    onSettled: () => {
      setUpdatingUserId(null);
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return toast.error("Email required");
    if (inviteMode === "create" && invitePassword.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }
    setBusy(true);
    try {
      await callAdmin(inviteMode, {
        email: inviteEmail.trim(),
        fullName: inviteName.trim() || null,
        password: inviteMode === "create" ? invitePassword : undefined,
        role: inviteRole,
        redirectTo: `${window.location.origin}/login`,
      });
      toast.success(inviteMode === "invite" ? "Invitation sent" : "User created");
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const assignRole = (userId: string, role: AppRole) => {
    roleMutation.mutate({ userId, role, action: "assign_role" });
  };

  const removeRole = (userId: string, role: AppRole) => {
    roleMutation.mutate({ userId, role, action: "remove_role" });
  };

  const deleteUser = (userId: string) => {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    deleteUserMutation.mutate(userId);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Shield className="h-5 w-5 text-primary" /> Users & Roles
          </h2>
          <p className="text-sm text-muted-foreground">
            Invite team members and assign roles like Admin, Manager, Ads Manager, or Moderator.
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Add user
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add a new user</DialogTitle>
              <DialogDescription>
                Invite via email or create directly with a temporary password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2 rounded-xl bg-muted p-1">
                <button
                  onClick={() => setInviteMode("invite")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    inviteMode === "invite" ? "bg-background shadow" : "text-muted-foreground"
                  }`}
                >
                  Invite by email
                </button>
                <button
                  onClick={() => setInviteMode("create")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    inviteMode === "create" ? "bg-background shadow" : "text-muted-foreground"
                  }`}
                >
                  Create directly
                </button>
              </div>
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              {inviteMode === "create" && (
                <div className="space-y-2">
                  <Label>Temporary password *</Label>
                  <Input
                    type="text"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_META[r].icon} {ROLE_META[r].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={busy} className="gap-1">
                {busy ? "Working…" : inviteMode === "invite" ? "Send invite" : "Create user"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or user ID…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={filterRole === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilterRole("all")}
          >
            All
          </Badge>
          {ASSIGNABLE_ROLES.map((r) => (
            <Badge
              key={r}
              variant={filterRole === r ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterRole(r)}
            >
              {ROLE_META[r].label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {visible.map((p) => {
          const roles = rolesByUser.get(p.user_id) ?? [];
          const availableToAdd = ASSIGNABLE_ROLES.filter((r) => !roles.includes(r));
          const isUpdating = updatingUserId === p.user_id;

          return (
            <div
              key={p.user_id}
              className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-opacity sm:flex-row sm:items-center ${isUpdating ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="relative">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-sm font-bold text-accent-foreground">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (p.full_name ?? "??").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  {isUpdating && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/40">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-card-foreground">{p.full_name || "Unnamed"}</p>
                    {roles.includes("admin") && (
                      <Crown className="h-3.5 w-3.5 text-primary" aria-label="Admin" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{p.phone || "No phone"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {roles.length === 0 && (
                      <span className="text-[10px] text-muted-foreground">No roles assigned</span>
                    )}
                    {roles.map((r) => (
                      <span
                        key={r}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_META[r as AppRole]?.tone ?? "bg-muted"}`}
                      >
                        {ROLE_META[r as AppRole]?.icon} {ROLE_META[r as AppRole]?.label ?? r}
                        <button
                          onClick={() => removeRole(p.user_id, r as AppRole)}
                          className="ml-0.5 opacity-70 hover:opacity-100 disabled:cursor-not-allowed"
                          disabled={isUpdating}
                          aria-label={`Remove ${r}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                {availableToAdd.length > 0 && (
                  <Select
                    onValueChange={(v) => assignRole(p.user_id, v as AppRole)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-full min-w-0 sm:w-[150px]">
                      <Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
                      <SelectValue placeholder="Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_META[r].icon} {ROLE_META[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteUser(p.user_id)}
                  disabled={isUpdating}
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No users match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
