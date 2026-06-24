"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HardDriveIcon, UsersIcon, FolderIcon } from "lucide-react";

type Limits = {
  storageLimit: number;
  memberLimit: number;
  projectLimit: number;
};

export function OrgLimitsEditor() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [draft, setDraft] = useState<Limits>({ storageLimit: 0, memberLimit: 0, projectLimit: 0 });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/org/limits")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => {
        setLimits(d);
        setDraft(d);
      })
      .catch(() => {});
  }, []);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const res = await fetch("/api/org/limits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const d = await res.json();
      setLimits({ storageLimit: d.storageLimit, memberLimit: d.memberLimit, projectLimit: d.projectLimit });
      setSavedAt(Date.now());
    }
    setSaving(false);
  }

  const dirty =
    draft.storageLimit !== limits?.storageLimit ||
    draft.memberLimit !== limits?.memberLimit ||
    draft.projectLimit !== limits?.projectLimit;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDriveIcon className="size-4" />
          Usage Limits
        </CardTitle>
        <CardDescription>Real-time organization resource caps</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <HardDriveIcon className="size-3.5 text-muted-foreground" />
              Storage Limit (GB)
            </Label>
            <Input
              type="number"
              min={0}
              value={draft.storageLimit}
              onChange={(e) => setDraft({ ...draft, storageLimit: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <UsersIcon className="size-3.5 text-muted-foreground" />
              Member Limit
            </Label>
            <Input
              type="number"
              min={0}
              value={draft.memberLimit}
              onChange={(e) => setDraft({ ...draft, memberLimit: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <FolderIcon className="size-3.5 text-muted-foreground" />
              Project Limit
            </Label>
            <Input
              type="number"
              min={0}
              value={draft.projectLimit}
              onChange={(e) => setDraft({ ...draft, projectLimit: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {savedAt && dirty === false ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : dirty ? "Unsaved changes" : ""}
          </p>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save Limits"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
