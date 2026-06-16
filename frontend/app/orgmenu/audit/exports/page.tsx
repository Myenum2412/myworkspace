import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileTextIcon } from "lucide-react";

export const metadata = { title: "Audit Exports" };

export default function AuditExportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Exports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Download exported audit log archives.</p>
          <div className="space-y-3">
            {["January 2026", "February 2026", "March 2026"].map((month) => (
              <div key={month} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileTextIcon className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{month} Audit Log</p>
                    <p className="text-xs text-muted-foreground">CSV &middot; 2.4 MB</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <DownloadIcon className="size-4 mr-1" /> Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
