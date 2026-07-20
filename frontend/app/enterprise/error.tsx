"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function EnterpriseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred while loading this page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.href = "/enterprise"}>
            Go to Enterprise Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
