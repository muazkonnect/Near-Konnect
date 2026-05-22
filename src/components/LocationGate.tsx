import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type GateState = "checking" | "prompt" | "requesting" | "denied" | "unsupported" | "error" | "granted";

const LocationGate = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GateState>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("requesting");
    navigator.geolocation.getCurrentPosition(
      () => setState("granted"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setState("denied");
        else {
          setErrorMsg(err.message || "Unable to get your location.");
          setState("error");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    const perms = (navigator as any).permissions;
    if (perms?.query) {
      perms
        .query({ name: "geolocation" as PermissionName })
        .then((status: PermissionStatus) => {
          if (status.state === "granted") {
            setState("granted");
            // Warm up a position fix
            navigator.geolocation.getCurrentPosition(() => {}, () => {});
          } else if (status.state === "denied") {
            setState("denied");
          } else {
            request();
          }
          status.onchange = () => {
            if (status.state === "granted") setState("granted");
            else if (status.state === "denied") setState("denied");
          };
        })
        .catch(() => request());
    } else {
      request();
    }
  }, [request]);

  if (state === "granted") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {state === "checking" || state === "requesting" ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : state === "denied" || state === "unsupported" || state === "error" ? (
            <AlertTriangle className="h-7 w-7 text-primary" />
          ) : (
            <MapPin className="h-7 w-7 text-primary" />
          )}
        </div>

        {state === "checking" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Checking location…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Just a moment.</p>
          </>
        )}

        {state === "requesting" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Allow location access</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please accept the browser prompt to continue.
            </p>
          </>
        )}

        {state === "prompt" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Location required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Near Konnect needs your location to find nearby workers and services.
            </p>
            <Button className="mt-5 w-full" onClick={request}>
              Enable location
            </Button>
          </>
        )}

        {state === "denied" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Location is required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You've blocked location access. Please enable location permission for this site in your
              browser settings, then reload the app.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => window.location.reload()}>Reload app</Button>
              <Button variant="outline" onClick={request}>
                Try again
              </Button>
            </div>
          </>
        )}

        {state === "unsupported" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Location not supported</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your device or browser does not support geolocation, which is required to use Near Konnect.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Couldn't get your location</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorMsg} Please ensure location services are turned on and try again.
            </p>
            <Button className="mt-5 w-full" onClick={request}>
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default LocationGate;
