"use client"
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function StaffsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[StaffsPage] Unhandled error:", error);
    toast.error(error?.message || "Something went wrong loading the staff panel");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center min-h-[50vh]">
      <h2 className="text-lg font-semibold">This page couldn&apos;t load</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        A server error occurred. This may be a temporary issue.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/login")}>
          Go to Login
        </Button>
      </div>
    </div>
  );
}
