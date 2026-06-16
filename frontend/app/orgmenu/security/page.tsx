import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldIcon } from "lucide-react";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Security</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="size-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Password Policy", value: "Strong", color: "text-emerald-500" },
              { label: "MFA Status", value: "Enabled", color: "text-emerald-500" },
              { label: "Active Sessions", value: "3", color: "text-blue-500" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
