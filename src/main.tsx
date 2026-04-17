import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

const renderStartupFallback = (message: string) => {
  root.render(
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Unable to load app</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Reload App
        </button>
      </div>
    </div>
  );
};

void import("./App.tsx")
  .then(({ default: App }) => {
    root.render(<App />);
  })
  .catch((error) => {
    console.error("Failed to bootstrap app", error);
    renderStartupFallback(
      error instanceof Error ? error.message : "An unexpected startup error occurred.",
    );
  });
