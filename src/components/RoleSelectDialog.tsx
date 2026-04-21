import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, UserRound, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Props {
  children: ReactNode;
  redirect?: string;
}

const RoleSelectDialog = ({ children, redirect }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const choose = (role: "customer" | "worker") => {
    setOpen(false);
    const params = new URLSearchParams({ role });
    if (redirect) params.set("redirect", redirect);
    navigate(`/register?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl border-2 border-dashed border-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">How do you want to join?</DialogTitle>
          <DialogDescription>
            Pick the role that fits you best. You can always change later from your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("customer")}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-foreground bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="inline-flex rounded-2xl bg-primary/10 p-3">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-card-foreground">I'm a Client</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Find and hire trusted local services for any need.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose("worker")}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-foreground bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="inline-flex rounded-2xl bg-accent p-3">
              <Briefcase className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="font-bold text-card-foreground">I'm a Worker</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Offer your services and grow your customer base.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleSelectDialog;
