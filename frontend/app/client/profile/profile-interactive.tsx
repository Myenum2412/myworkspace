"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ProfileInteractive() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("client_user");
    if (stored) {
      const u = JSON.parse(stored);
      setName(u.name);
      setEmail(u.email);
    }
  }, []);

  async function handleSave() {
    const token = localStorage.getItem("client_token");
    if (!token) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/client-auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setMessage("Profile updated");
        const user = JSON.parse(localStorage.getItem("client_user") || "{}");
        user.name = name;
        localStorage.setItem("client_user", JSON.stringify(user));
      }
    } catch {
      setMessage("Error saving profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeft className="size-4 mr-1" /> Back to Dashboard
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="text-muted-foreground" />
            </div>
            {message && <p className="text-sm text-red-400">{message}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
