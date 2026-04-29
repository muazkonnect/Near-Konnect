import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error?: Error | null;
  onRetry?: () => void;
}

const ServerError = ({ error, onRetry }: Props) => {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center ring-8 ring-destructive/5">
          <AlertTriangle className="h-11 w-11 text-destructive" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-destructive">
            Error 500
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            We hit a snag while loading this page. Our team has been notified — please try again
            in a moment.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-muted-foreground/70 px-3 py-2 rounded-lg bg-muted/60 break-words">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="w-full rounded-2xl"
            size="lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="w-full rounded-2xl"
            size="lg"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
