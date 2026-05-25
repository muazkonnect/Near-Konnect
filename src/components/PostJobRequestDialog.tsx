import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useCreateJobRequest } from "@/hooks/useJobRequests";
import { useMyVerification } from "@/hooks/useVerification";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useAppSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import { Briefcase, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Props { children: ReactNode; }

const PostJobRequestDialog = ({ children }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [main, setMain] = useState<string>("");
  const [sub, setSub] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const { mainCategories, getSubCategories } = useCategories();
  const { coords } = useRealtimeLocation();
  const create = useCreateJobRequest();
  const { data: verification } = useMyVerification(user?.id);
  const requireVerified = Boolean(useAppSetting("job_requests_require_verified_client" as any) ?? true);

  const subs = useMemo(() => (main ? getSubCategories(main) : []), [main, getSubCategories]);
  const isVerified = verification?.status === "approved" || !!verification?.verified_at;

  const submit = async () => {
    if (!user) { toast.error("Please sign in"); navigate("/login"); return; }
    if (requireVerified && !isVerified) { toast.error("Only verified clients can post job requests"); return; }
    if (!main || !sub) { toast.error("Pick a category and subcategory"); return; }
    if (!coords) { toast.error("Location required to post a nearby job"); return; }
    try {
      await create.mutateAsync({
        main_category: main,
        sub_category: sub,
        note: note.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      toast.success(`Posted: Need a ${sub}`);
      setOpen(false);
      setMain(""); setSub(""); setNote("");
    } catch (e: any) {
      toast.error(e?.message || "Could not post request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Post a quick job</DialogTitle>
          <DialogDescription>Pick a service you need. Premium providers nearby (within radius) will see it instantly.</DialogDescription>
        </DialogHeader>

        {requireVerified && !isVerified && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Only verified clients can post job requests.{" "}
              <button type="button" className="underline" onClick={() => { setOpen(false); navigate("/dashboard"); }}>Get verified</button>
            </div>
          </div>
        )}

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Main category</Label>
            <Select value={main} onValueChange={(v) => { setMain(v); setSub(""); }}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {mainCategories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Sub category</Label>
            <Select value={sub} onValueChange={setSub} disabled={!main}>
              <SelectTrigger><SelectValue placeholder={main ? "Choose subcategory" : "Pick a main category first"} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {subs.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Note (optional)</Label>
            <Textarea value={note} maxLength={200} placeholder="Short description (optional)" onChange={(e) => setNote(e.target.value)} />
          </div>

          <p className="text-[11px] text-muted-foreground">Free for now • Auto-expires after 2 hours</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending || (requireVerified && !isVerified)}>
            {create.isPending ? "Posting…" : "Post job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostJobRequestDialog;
