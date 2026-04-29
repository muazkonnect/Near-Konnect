import { Component, ErrorInfo, ReactNode } from "react";
import ServerError from "@/pages/ServerError";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const isChunkLoadError = (error: Error | null) => {
  if (!error) return false;
  const msg = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
};

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App error caught by ErrorBoundary:", error, errorInfo);
    if (isChunkLoadError(error)) {
      // Stale deploy: force a full reload (once) to fetch fresh chunks.
      try {
        const key = "__chunk_reload_at";
        const last = Number(sessionStorage.getItem(key) || "0");
        const now = Date.now();
        if (now - last > 10000) {
          sessionStorage.setItem(key, String(now));
          const url = new URL(window.location.href);
          url.searchParams.set("_r", String(now));
          setTimeout(() => window.location.replace(url.toString()), 50);
        }
      } catch {
        setTimeout(() => window.location.reload(), 50);
      }
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <ServerError
          error={this.state.error}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
