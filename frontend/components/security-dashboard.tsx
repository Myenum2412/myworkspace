"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecurityDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Security Dashboard</CardTitle>
            <CardDescription>Security overview and status</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Security monitoring is available in the admin panel.</p>
        </CardContent>
      </Card>
    </div>
  );
}
