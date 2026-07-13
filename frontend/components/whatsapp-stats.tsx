"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export function WhatsAppStats() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <CardTitle className="text-lg">WhatsApp</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">WhatsApp integration is configured.</p>
      </CardContent>
    </Card>
  );
}
