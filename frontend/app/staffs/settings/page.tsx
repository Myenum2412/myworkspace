import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Staff Settings",
};

export default function StaffSettingsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Staff Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">General staff configuration</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Staff settings will be configured here.</p>
        </CardContent>
      </Card>
    </main>
  );
}
