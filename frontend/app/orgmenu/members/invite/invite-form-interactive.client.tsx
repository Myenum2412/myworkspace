"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon, MailIcon, PlusIcon, XIcon } from "lucide-react";

export function InviteMemberFormInteractive() {
  const [emails, setEmails] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
    const validEmails = emails.filter((e) => e.trim());
    if (validEmails.length === 0) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/organizations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: validEmails }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send invitations" }));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      setSending(false);
      setSent(true);
    } catch (err: any) {
      toast.error(err?.message === "Validation failed" ? "Please provide valid email addresses." : (err?.message || "Failed to send invitations"));
      const msg = err?.message === "Validation failed" ? "Please provide valid email addresses." : (err?.message || "Failed to send invitations. Please try again.");
      setError(msg);
      setSending(false);
    }
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
              placeholder=""
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
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="pt-2">
        <Button type="submit" disabled={sending || emails.every((e) => !e)}>
          {sending ? <Loader2Icon className="size-4 animate-spin mr-1" /> : null}
          {sending ? "Sending..." : "Send invitations"}
        </Button>
      </div>
    </form>
  );
}
