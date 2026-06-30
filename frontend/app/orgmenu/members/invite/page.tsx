import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberFormInteractive } from "./invite-form-interactive";

export const metadata = { title: "Invite Members" };

export default function InvitePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invite Members</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Send Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteMemberFormInteractive />
        </CardContent>
      </Card>
    </div>
  );
}
