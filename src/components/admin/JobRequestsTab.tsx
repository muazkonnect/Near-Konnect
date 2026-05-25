import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { useAppSetting, useUpdateAppSetting, type AppSettingsMap } from "@/hooks/useAppSettings";
import { useJobRequests, useDeleteJobRequest, useCloseJobRequest } from "@/hooks/useJobRequests";

const SettingRow = ({ k, label, type = "number" }: { k: keyof AppSettingsMap; label: string; type?: "number" | "bool" }) => {
  const val = useAppSetting(k as any) as any;
  const update = useUpdateAppSetting();
  const [draft, setDraft] = useState<string>(String(val ?? ""));

  if (type === "bool") {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label className="text-sm">{label}</Label>
        <Switch
          checked={!!val}
          onCheckedChange={async (v) => {
            await update.mutateAsync({ key: k, value: v });
            toast.success("Saved");
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="w-24"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          size="sm"
          onClick={async () => {
            const n = Number(draft);
            if (Number.isNaN(n)) { toast.error("Invalid number"); return; }
            await update.mutateAsync({ key: k, value: n });
            toast.success("Saved");
          }}
        >Save</Button>
      </div>
    </div>
  );
};

const JobRequestsTab = () => {
  const { allJobs, isLoading } = useJobRequests(null, { all: true });
  const del = useDeleteJobRequest();
  const close = useCloseJobRequest();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-bold">Job Request Settings</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <SettingRow k={"job_requests_enabled" as any} label="Feature enabled" type="bool" />
          <SettingRow k={"job_requests_require_verified_client" as any} label="Require verified client to post" type="bool" />
          <SettingRow k={"job_requests_require_premium_worker" as any} label="Require premium/featured worker to claim" type="bool" />
          <SettingRow k={"job_requests_radius_km" as any} label="Visibility radius (km)" />
          <SettingRow k={"job_requests_expiry_minutes" as any} label="Expiry (minutes)" />
          <SettingRow k={"job_requests_client_post_cost" as any} label="Sparks cost to post (client)" />
          <SettingRow k={"job_requests_worker_claim_cost" as any} label="Sparks cost to claim (worker)" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">All Job Requests</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : allJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No job requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Claimed by</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allJobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(j.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs"><div className="font-semibold">{j.sub_category}</div><div className="text-muted-foreground">{j.main_category}</div></TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">{j.note || "—"}</TableCell>
                    <TableCell><Badge variant={j.status === "open" ? "default" : "secondary"}>{j.status}</Badge></TableCell>
                    <TableCell className="text-[10px]">{j.client_user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-[10px]">{j.claimed_by_user_id ? `${j.claimed_by_user_id.slice(0, 8)}…` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(j.expires_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {j.status === "open" && (
                          <Button size="icon" variant="outline" title="Close" onClick={async () => { await close.mutateAsync(j.id); toast.success("Closed"); }}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" title="Delete" onClick={async () => { if (confirm("Delete this job request?")) { await del.mutateAsync(j.id); toast.success("Deleted"); } }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

export default JobRequestsTab;
