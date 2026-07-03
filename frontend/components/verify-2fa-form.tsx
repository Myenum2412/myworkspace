"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";
import { signIn } from "next-auth/react";
import { apiUrl } from "@/lib/api";

export default function Verify2FAForm({ email }: { email: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || token.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiUrl("/api/two-factor/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Verification failed");
        return;
      }

      await signIn("credentials", {
        email,
        twoFactorToken: token,
        redirect: false,
      });

      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldAlert className="size-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to complete sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="token">Authentication Code</Label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className="text-center text-2xl tracking-widest h-12"
                maxLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || token.length !== 6}>
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Verifying...</> : "Verify & Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
