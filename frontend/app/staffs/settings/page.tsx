"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { SettingsIcon } from "lucide-react";

export default function StaffSettingsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Staff Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">General staff configuration</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/staffs/settings/roles">
          <Card className="hover:shadow-sm transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <SettingsIcon className="size-4" />
                Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Manage staff roles</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
