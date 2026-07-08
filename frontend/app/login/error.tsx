"use client"
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LoginPage] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center bg-background">
      <h2 className="text-lg font-semibold">This page couldn&apos;t load</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Something went wrong loading the sign-in page. This may be a temporary issue.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}