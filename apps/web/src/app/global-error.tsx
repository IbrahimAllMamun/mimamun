"use client";

/**
 * Last-resort boundary when the root layout itself fails. It replaces the
 * whole document, so it carries its own minimal markup and inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#f4f2ec",
          color: "#17201b",
        }}
      >
        <main style={{ maxWidth: "40rem", margin: "0 auto", padding: "6rem 1.5rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#5c655f",
            }}
          >
            Error
          </p>
          <h1 style={{ fontSize: "2rem", fontWeight: 500, margin: "0.5rem 0 1rem" }}>
            The site could not be displayed.
          </h1>
          <p style={{ lineHeight: 1.6 }}>
            Please try again in a moment.
            {error.digest ? ` Reference: ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "2.75rem",
              padding: "0 1rem",
              border: 0,
              borderRadius: 4,
              background: "#1f5a44",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
