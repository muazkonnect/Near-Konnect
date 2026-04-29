import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const Maintenance = () => {
  return (
    <div className="min-h-[100dvh] bg-hero text-hero-foreground flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
          <Wrench className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Scheduled maintenance
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">We'll be right back</h1>
          <p className="text-sm text-hero-muted">
            Near Konnect is getting a quick upgrade. Thanks for your patience — we'll be back
            online shortly.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="w-full rounded-2xl"
          size="lg"
        >
          Check again
        </Button>
      </div>
    </div>
  );
};

export default Maintenance;
