import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Staff Schedule",
};

export default function StaffSchedulePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Shift schedule management</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Shift calendar will be displayed here.</p>
        </CardContent>
      </Card>
    </main>
  );
}
