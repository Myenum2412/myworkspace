import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type Task = {
  _id: string;
  title: string;
  status: string;
  dueDate?: string;
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return <CalendarView tasks={[]} />;
  }

  const raw = await db.collection(collections.tasks)
    .find({ orgId, dueDate: { $ne: null } })
    .sort({ dueDate: 1 })
    .toArray();

  const tasks: Task[] = (raw as unknown as Record<string, unknown>[]).map((t) => ({
    _id: (t._id as { toString: () => string }).toString(),
    title: (t.title as string) || "",
    status: (t.status as string) || "",
    dueDate: (t.dueDate as string) || undefined,
  }));

  return <CalendarView tasks={tasks} />;
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeek = tasks.filter((t) => {
    const d = new Date(t.dueDate!);
    return d >= today && d <= new Date(today.getTime() + 7 * 86400000);
  });
  const overdue = tasks.filter((t) => new Date(t.dueDate!) < today && t.status !== "done");
  const later = tasks.filter((t) => new Date(t.dueDate!) > new Date(today.getTime() + 7 * 86400000));

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-6" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Overdue</CardTitle></CardHeader>
          <CardContent>
            {overdue.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
              <div className="space-y-2">{overdue.map((t) => (
                <div key={t._id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="text-xs">{new Date(t.dueDate!).toLocaleDateString()}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-400">This Week</CardTitle></CardHeader>
          <CardContent>
            {thisWeek.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
              <div className="space-y-2">{thisWeek.map((t) => (
                <div key={t._id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="text-xs">{new Date(t.dueDate!).toLocaleDateString()}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Upcoming</CardTitle></CardHeader>
          <CardContent>
            {later.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
              <div className="space-y-2">{later.map((t) => (
                <div key={t._id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="text-xs">{new Date(t.dueDate!).toLocaleDateString()}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
