import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellIcon } from "lucide-react";

export const metadata = { title: "Notifications" };

const categories = [
  {
    name: "Task Updates",
    settings: [
      { label: "Task assigned to me", enabled: true },
      { label: "Task status changes", enabled: true },
      { label: "Task comments", enabled: false },
      { label: "Due date reminders", enabled: true },
    ],
  },
  {
    name: "Team Activity",
    settings: [
      { label: "Member joins or leaves", enabled: true },
      { label: "Team mentions", enabled: true },
      { label: "Project updates", enabled: false },
    ],
  },
  {
    name: "System",
    settings: [
      { label: "Security alerts", enabled: true },
      { label: "Billing updates", enabled: true },
      { label: "Feature announcements", enabled: false },
    ],
  },
];

export default function NotificationsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Configure email, push, and in-app notification settings.
          </p>
          {categories.map((category) => (
            <div key={category.name} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold mb-3">{category.name}</h3>
              <div className="space-y-3">
                {category.settings.map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between">
                    <span className="text-sm">{setting.label}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${setting.enabled ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}`}>
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
