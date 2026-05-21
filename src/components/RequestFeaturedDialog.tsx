import { useState } from "react";
import { Star, Loader2, Clock, CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const sb = supabase as any;

interface Props {
  workerId: string;
}

const RequestFeaturedDialog = ({ workerId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["featured_requests", workerId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("featured_requests")
        .select("id, status, message, created_at, decided_at")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workerId,
  });

  const { data: featured } = useQuery({
    queryKey: ["worker_is_featured", workerId],
    queryFn: async () => {
      const { data } = await sb
        .from("featured_services")
        .select("id, ends_at")
        .eq("service_id", workerId)
        .eq("is_active", true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!workerId,
  });

  const isFeatured = !!featured;
  const pending = requests.find((r: any) => r.status === "pending");

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await sb
      .from("featured_requests")
      .insert({ worker_id: workerId, user_id: user.id, message: message || null });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit request");
      return;
    }
    toast.success("Featured request submitted! Admins will review it soon.");
    setMessage("");
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["featured_requests", workerId] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-star/40 text-star hover:bg-star/10 hover:text-star"
        >
          <Star className={`h-4 w-4 ${isFeatured ? "fill-star" : ""}`} />
          {isFeatured ? "Featured" : pending ? "Request Pending" : "Request Featured"}
        </Button>
      </DialogTrigger>
      <DialogContent
        onPointerDownOutside={() => setOpen(false)}
        onInteractOutside={() => setOpen(false)}
        className="relative sm:max-w-md [&>button.absolute]:hidden"
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-star text-star" />
            Featured Listing
          </DialogTitle>
          <DialogDescription>
            Get pinned to the top of search results and shown in the Featured Services carousel.
          </DialogDescription>
        </DialogHeader>

        {isFeatured ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> You're currently featured
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {featured?.ends_at
                ? `Until ${new Date(featured.ends_at).toLocaleDateString()}`
                : "No end date set."}
            </p>
          </div>
        ) : pending ? (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Clock className="h-4 w-4" /> Request pending
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {new Date(pending.created_at).toLocaleDateString()}. Admins will review shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Tell admins why you'd like to be featured (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">{message.length}/500</p>
          </div>
        )}

        {requests.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">History</p>
            <div className="max-h-32 space-y-1.5 overflow-auto">
              {requests.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card px-2.5 py-1.5 text-xs">
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "approved"
                        ? "border-success text-success"
                        : r.status === "denied"
                        ? "border-destructive text-destructive"
                        : "border-warning text-foreground"
                    }
                  >
                    {r.status === "approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {r.status === "denied" && <XCircle className="mr-1 h-3 w-3" />}
                    {r.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isFeatured && !pending && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequestFeaturedDialog;
