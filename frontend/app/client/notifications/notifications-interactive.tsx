"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bell } from "lucide-react";

export default function NotificationsInteractive() {
  const router = useRouter();
  return (
    <div className="max-w-4xl mx-auto w-full space-y-4">
      <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Bell className="size-5 text-primary" />
              </div>
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Notifications will appear here.
            </p>
          </CardContent>
        </Card>
    </div>
  );
}
