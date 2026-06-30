"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FolderKanban } from "lucide-react";

export default function ProjectsInteractive() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeft className="size-4 mr-1" /> Back to Dashboard
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <FolderKanban className="size-5 text-primary" />
              </div>
              <CardTitle>Projects & Tasks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Project details and task tracking will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
