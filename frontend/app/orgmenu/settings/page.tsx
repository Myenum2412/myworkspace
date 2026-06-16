import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2Icon, PaletteIcon } from "lucide-react";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">General Settings</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2Icon className="size-5 text-muted-foreground" />
              <CardTitle>Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Language</span>
              <span className="text-sm font-medium">English (US)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Timezone</span>
              <span className="text-sm font-medium">UTC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Date format</span>
              <span className="text-sm font-medium">DD/MM/YYYY</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PaletteIcon className="size-5 text-muted-foreground" />
              <CardTitle>Branding</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Customize colors and logo for your organization.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
