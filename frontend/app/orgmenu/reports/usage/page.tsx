import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3Icon } from "lucide-react";

export const metadata = { title: "Usage Reports" };

export default function UsageReportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usage Reports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="size-5" />
            Resource Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Monitor storage, API calls, and resource utilization across your organization.
          </p>
        </CardContent>
      </Card>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Storage</p>
        </div>
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">API Usage</p>
        </div>
        <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Seats</p>
        </div>
      </div>
    </div>
  );
}
