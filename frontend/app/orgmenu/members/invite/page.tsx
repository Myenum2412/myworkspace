"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberFormInteractive } from "./invite-form-interactive";

export default function InviteMemberPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Invite Members</h1>
        <p className="text-sm text-muted-foreground">Send invitations to new team members.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invite by Email</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteMemberFormInteractive />
        </CardContent>
      </Card>
    </main>
  );
}
