import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, ClockIcon } from "lucide-react";

export const metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Policies</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-muted-foreground" />
              <CardTitle>Password Policy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Minimum length</span>
              <Badge variant="secondary">8 characters</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require special characters</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require numbers</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Password expiry</span>
              <Badge variant="secondary">90 days</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClockIcon className="size-5 text-muted-foreground" />
              <CardTitle>Session Policy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Session timeout</span>
              <Badge variant="secondary">30 minutes</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Max concurrent sessions</span>
              <Badge variant="secondary">5</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Remember me duration</span>
              <Badge variant="secondary">30 days</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
