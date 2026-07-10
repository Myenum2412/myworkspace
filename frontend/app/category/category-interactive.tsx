"use client";

import InfoIcon from "@mui/icons-material/Info";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CategoryPageClient() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl sm:text-2xl font-bold">Category</h1>
      <Card className="max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Doctor Kit</h2>
            <InfoIcon className="size-5 text-muted-foreground" />
          </div>
          <Button className="mt-6 w-full">Install</Button>
        </CardContent>
      </Card>
    </main>
  );
}
