"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function SettingsInteractive() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcePasswordChange = searchParams.get("forcePasswordChange") === "true";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("client_token");
    if (!token) router.push("/client/login");
  }, []);

  async function handleChangePassword() {
    const token = localStorage.getItem("client_token");
    if (!token) return;
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/client-auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password changed successfully");
        setPasswordChanged(true);
        const user = JSON.parse(localStorage.getItem("client_user") || "{}");
        user.mustChangePassword = false;
        localStorage.setItem("client_user", JSON.stringify(user));
      } else {
        setMessage(data.error || "Failed to change password");
      }
    } catch {
      setMessage("Error changing password");
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

        {forcePasswordChange && !passwordChanged && (
          <div className="rounded-lg bg-gray-100 border-border p-4">
            <p className="text-sm text-gray-700 font-medium">
              You must change your password before accessing the dashboard.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <div className="relative">
                <Input
                  id="new"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>
            {message && (
              <p className={`text-sm ${message.includes("successfully") ? "text-green-600" : "text-red-500"}`}>
                {message}
              </p>
            )}
            {!passwordChanged ? (
              <Button onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
                {saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Updating...</> : "Change Password"}
              </Button>
            ) : (
              <Button onClick={() => router.push("/client/dashboard")}>
                Go to Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
