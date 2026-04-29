import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto h-32 w-32">
          <div className="absolute inset-0 rounded-full bg-primary/10 ring-8 ring-primary/5 flex items-center justify-center">
            <Compass className="h-14 w-14 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {t("notFound.title")}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {t("notFound.subtitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            The page <span className="font-mono text-foreground/70">{location.pathname}</span>{" "}
            doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => (window.location.href = "/")}
            className="w-full rounded-2xl"
            size="lg"
          >
            <Home className="h-4 w-4 mr-2" />
            {t("notFound.returnHome")}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full rounded-2xl"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
