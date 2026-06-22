import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3Icon, DownloadIcon, FileTextIcon, ClockIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

const getReportData = cache(async (orgId: string) => {
  const totalTasks = await db.collection(collections.tasks).countDocuments({ orgId });
  const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });
  const totalMembers = await db.collection(collections.orgMembers).countDocuments({ orgId });
  const totalActivities = await db.collection(collections.activityLogs).countDocuments({ orgId });
  const totalFiles = await db.collection(collections.fileAttachments).countDocuments({ orgId });
  const totalTimeEntries = await db.collection(collections.timeEntries).countDocuments({ orgId });
  return { totalTasks, completedTasks, totalMembers, totalActivities, totalFiles, totalTimeEntries };
});

const getAllReportData = cache(async () => {
  const totalTasks = await db.collection(collections.tasks).countDocuments({});
  const completedTasks = await db.collection(collections.tasks).countDocuments({ status: "done" });
  const totalMembers = await db.collection(collections.orgMembers).countDocuments({});
  const totalActivities = await db.collection(collections.activityLogs).countDocuments({});
  const totalFiles = await db.collection(collections.fileAttachments).countDocuments({});
  const totalTimeEntries = await db.collection(collections.timeEntries).countDocuments({});
  return { totalTasks, completedTasks, totalMembers, totalActivities, totalFiles, totalTimeEntries };
});

export default async function ReportsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const data = isSuperAdmin ? await getAllReportData() : await getReportData(orgId || "null");

  const reports = [
    { title: "Task Summary", description: `${data.totalTasks} total tasks, ${data.completedTasks} completed`, icon: BarChart3Icon, format: "PDF" },
    { title: "Member Activity", description: `${data.totalMembers} members, ${data.totalActivities} activities`, icon: FileTextIcon, format: "CSV" },
    { title: "File Usage", description: `${data.totalFiles} files uploaded`, icon: FileTextIcon, format: "CSV" },
    { title: "Time Tracking", description: `${data.totalTimeEntries} time entries logged`, icon: ClockIcon, format: "CSV" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? "Reports across all organizations" : "Download organization reports"}
          </p>
        </div>
      </div>
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <report.icon className="size-5 text-muted-foreground" />
                <CardTitle>{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
              <Button variant="outline" size="sm"><DownloadIcon className="size-4 mr-1" /> Download {report.format}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <p className="text-muted-foreground">Report visualizations</p>
      </div>
    </div>
  );
}
