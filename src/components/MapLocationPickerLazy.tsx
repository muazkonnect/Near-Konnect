import { lazy, Suspense } from "react";
import type { Coords } from "@/lib/geolocation";

const MapLocationPicker = lazy(() => import("./MapLocationPicker"));

interface Props {
  value: Coords | null;
  onChange: (coords: Coords) => void;
}

const Fallback = () => (
  <div className="space-y-2">
    <div className="h-56 w-full animate-pulse rounded-lg border bg-muted" />
  </div>
);

const MapLocationPickerLazy = (props: Props) => (
  <Suspense fallback={<Fallback />}>
    <MapLocationPicker {...props} />
  </Suspense>
);

export default MapLocationPickerLazy;
