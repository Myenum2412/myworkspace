import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3Icon, DownloadIcon } from "lucide-react";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3Icon className="size-5 text-muted-foreground" />
              <CardTitle>Monthly Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Overview of team performance for the current month.</p>
            <Button variant="outline" size="sm"><DownloadIcon className="size-4 mr-1" /> Download PDF</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3Icon className="size-5 text-muted-foreground" />
              <CardTitle>Task Completion</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Detailed breakdown of task completion rates.</p>
            <Button variant="outline" size="sm"><DownloadIcon className="size-4 mr-1" /> Download CSV</Button>
          </CardContent>
        </Card>
      </div>
      <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <p className="text-muted-foreground">Report visualizations</p>
      </div>
    </div>
  );
}
