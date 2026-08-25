"use client";

import { useEffect, useRef } from "react";

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js error boundary component name
export default function Error({
  error: err,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = err.digest ?? err.message;
    if (key !== loggedRef.current) {
      loggedRef.current = key;
      console.error("[change-order] Error:", err);
    }
  }, [err]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {err.message || "Failed to load the change order page. Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Try again
      </button>
    </main>
  );
}
