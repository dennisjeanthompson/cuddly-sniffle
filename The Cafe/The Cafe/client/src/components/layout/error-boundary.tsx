import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    // eslint-disable-next-line no-console
    console.error("Shift Trading crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 520, padding: 24 }}>
            <h1 style={{ marginBottom: 8 }}>Something went wrong.</h1>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              The page failed to render. Try refreshing, or go back to the dashboard.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => location.reload()} style={{ padding: "8px 12px" }}>Reload</button>
              <a href="/" style={{ padding: "8px 12px", border: "1px solid #ccc" }}>Go to Dashboard</a>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre style={{ marginTop: 16, background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 8, overflow: "auto" }}>
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
