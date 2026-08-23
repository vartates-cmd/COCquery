"use client";

/**
 * Last resort: catches failures in the root layout itself, where the normal
 * error boundary has no shell to render into. It must supply its own <html>
 * and <body>, and cannot rely on the app's stylesheet having loaded, so the
 * styling here is inline on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "1rem",
            padding: "1.5rem",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", margin: 0 }}>
            The application could not start
          </h1>
          <p
            style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.6 }}
          >
            Something failed before the page could be built. Please try again,
            and contact the office if this continues.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginTop: "1.5rem",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
