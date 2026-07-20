import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  message?: string;
}

/** Catches render errors so a single broken view never blanks the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    // In production this would report to an error tracker (Sentry, etc.).
    console.error("Render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[60vh] place-items-center p-6">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-danger/15 text-danger">
              <AlertTriangle className="size-7" />
            </div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.message || "An unexpected error occurred while rendering this view."}
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
