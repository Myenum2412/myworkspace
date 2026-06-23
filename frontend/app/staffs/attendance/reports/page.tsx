import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Attendance Reports",
};

export default function StaffAttendanceReportsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Attendance Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Monthly and weekly attendance summaries</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Attendance reports will be generated here.</p>
        </CardContent>
      </Card>
    </main>
  );
}
