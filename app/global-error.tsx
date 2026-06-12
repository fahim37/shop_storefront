"use client";

import "./globals.css";

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
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f5f7fb",
          color: "#0f1b33",
          margin: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "26rem",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e3e8f0",
            borderRadius: "1rem",
            padding: "3rem 1.5rem",
            boxShadow: "0 10px 30px -12px rgba(15,27,51,0.18)",
          }}
        >
          <p style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>
            Something went wrong
          </p>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.9rem",
              color: "#54607a",
              lineHeight: 1.6,
            }}
          >
            A critical error occurred. Please try reloading the page.
          </p>
          {error?.digest ? (
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.72rem",
                color: "#8b94a8",
              }}
            >
              Error ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.75rem",
              padding: "0 1.5rem",
              borderRadius: "10px",
              border: "none",
              background: "#1d4ed8",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
