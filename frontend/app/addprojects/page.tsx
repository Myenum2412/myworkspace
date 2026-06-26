"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { getProjects } from "@/actions/projects";

const colors = [
  "#93c5fd", "#fca5a5", "#86efac", "#fcd34d", "#c4b5fd",
  "#f9a8d4", "#67e8f9", "#fdba74", "#6ee7b7", "#a5b4fc",
];

export default function AddProjectPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState("#93c5fd");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [clientList, setClientList] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) setOrgId(id);
      })
      .catch((error) => {
        console.error("[ADDPROJECTS] Failed to fetch profile:", error);
      });
  }, []);

  useEffect(() => {
    getProjects().then((projects) => {
      const unique = [...new Set(projects.map((p) => p.client).filter(Boolean))] as string[];
      setClientList(unique);
    }).catch((error) => {
      console.error("[ADDPROJECTS] Failed to fetch projects:", error);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !client || !orgId) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          name,
          client,
          description,
          deadline: deadline || null,
          color,
          access: "Public",
          status: "Active",
        }),
      });
      const d = await res.json();
      if (d.success) {
        router.push("/projects");
      } else {
        setError(d.error || "Failed to create project");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold">Add Project</h1>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Enter the details for the new project</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" placeholder="Enter project name" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client">Client</Label>
                  <select
                    id="client"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    required
                    disabled={submitting}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a client</option>
                    {clientList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Project description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={submitting} />
                </div>

                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          disabled={submitting}
                          className={`size-7 rounded-full ring-offset-2 ring-offset-background transition-all ${
                            color === c ? "ring-2 ring-foreground scale-110" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      disabled={submitting}
                      className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => router.push("/projects")} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!name || !client || submitting}>
                    {submitting ? <Loader2Icon className="size-4 animate-spin" /> : "Create Project"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      );
}
