"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldAlert, KeyRound, Smartphone } from "lucide-react";
import { signIn } from "next-auth/react";
import { apiUrl, apiFetch } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem("device_fingerprint");
  if (stored) return stored;
  const fp = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}`;
  const encoded = btoa(encodeURIComponent(fp)).slice(0, 64);
  localStorage.setItem("device_fingerprint", encoded);
  return encoded;
}

export default function Verify2FAForm({ email }: { email: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const deviceFingerprint = trustDevice ? getDeviceFingerprint() : undefined;

      if (useRecovery) {
        if (!recoveryCode) {
          setError("Please enter a recovery code");
          setLoading(false);
          return;
        }

        const res = await apiFetch(apiUrl("/api/two-factor/login-recovery"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            recoveryCode,
            deviceFingerprint,
            trustDevice,
          }),
        });
        const data = await res.json();

        if (!data.success) {
          setError(data.error || "Verification failed");
          return;
        }

        await signIn("credentials", {
          email,
          twoFactorToken: token || "recovery",
          redirect: false,
        });

        router.push("/dashboard");
        return;
      }

      if (!token || token.length !== 6) {
        setError("Please enter a valid 6-digit code");
        setLoading(false);
        return;
      }

      const res = await apiFetch(apiUrl("/api/two-factor/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          deviceFingerprint,
          trustDevice,
        }),
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
            <div className="rounded-sm bg-primary/10 p-3">
              <ShieldAlert className="size-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useRecovery
              ? "Enter one of your recovery codes to sign in."
              : "Enter the 6-digit code from your authenticator app to complete sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!useRecovery ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Authentication Code</Label>
                <Input
                  id="token"
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="text-center text-2xl tracking-widest h-12"
                  maxLength={6}
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Recovery Code</Label>
                <Input
                  id="recovery-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  required
                  className="text-center text-lg tracking-wider h-12 font-mono"
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="trust-device"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
              />
              <Label htmlFor="trust-device" className="text-xs text-muted-foreground cursor-pointer">
                Trust this device for 30 days
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading || (useRecovery ? !recoveryCode : token.length !== 6)}>
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Verifying...</> : "Verify & Sign In"}
            </Button>

            <Separator />

            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setError("");
                setToken("");
                setRecoveryCode("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {useRecovery ? (
                <span className="flex items-center justify-center gap-1">
                  <Smartphone className="size-3" /> Use authenticator code instead
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <KeyRound className="size-3" /> Use a recovery code instead
                </span>
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
