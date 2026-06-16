"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, MailIcon, PlusIcon, XIcon } from "lucide-react";

export function InviteMemberForm() {
  const [emails, setEmails] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function addEmail() {
    setEmails((prev) => [...prev, ""]);
  }

  function removeEmail(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEmail(index: number, value: string) {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // Simulate sending invites
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <MailIcon className="size-8 text-primary mx-auto mb-2" />
        <p className="font-medium">Invitations sent!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Invitations have been sent to the provided email addresses.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => { setSent(false); setEmails([""]); }}>
          Send more invites
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter email addresses to invite new members to your organization.
      </p>
      {emails.map((email, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor={`email-${index}`} className="sr-only">Email address</Label>
            <Input
              id={`email-${index}`}
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => updateEmail(index, e.target.value)}
              required
            />
          </div>
          {emails.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addEmail}>
        <PlusIcon className="size-4 mr-1" /> Add another
      </Button>
      <div className="pt-2">
        <Button type="submit" disabled={sending || emails.every((e) => !e)}>
          {sending ? <Loader2Icon className="size-4 animate-spin mr-1" /> : null}
          {sending ? "Sending..." : "Send invitations"}
        </Button>
      </div>
    </form>
  );
}
