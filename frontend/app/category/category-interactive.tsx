"use client";

import InfoIcon from "@mui/icons-material/Info";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function CategoryPageClient() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl sm:text-2xl font-bold">Category</h1>
      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Doctor Kit
            <InfoIcon className="size-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <Button>Install</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
