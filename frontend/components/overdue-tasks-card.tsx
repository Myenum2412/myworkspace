import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircleIcon } from "lucide-react";

export type OverdueTask = {
  _id?: string;
  id?: string;
  title: string;
  dueDate: string | null;
};

export function OverdueTasksCard({ tasks }: { tasks: OverdueTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-red-700">
          <AlertCircleIcon className="size-4" />
          Overdue Tasks ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {tasks.slice(0, 5).map((t) => (
            <li key={t._id || t.id || t.title} className="text-sm text-red-600 flex items-center gap-2">
              <span className="truncate flex-1">{t.title}</span>
              {t.dueDate && (
                <span className="text-xs text-red-400 shrink-0">
                  {new Date(t.dueDate).toLocaleDateString()}
                </span>
              )}
            </li>
          ))}
          {tasks.length > 5 && (
            <li className="text-xs text-red-400">+{tasks.length - 5} more</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
