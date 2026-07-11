"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, ShieldOff, KeyRound, Copy, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { apiUrl } from "@/lib/api";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

export default function TwoFactorSetup() {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "enabled">("idle");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      const data = await res.json();
      if (data.success && data.data) {
        setTwoFactorEnabled(!!data.data.twoFactorEnabled);
        if (data.data.twoFactorEnabled) {
          setStep("enabled");
        }
      }
    } catch {}
  }

  async function handleSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/two-factor/setup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Setup failed");
        return;
      }
      setSecret(data.data.secret);
      setOtpauthUrl(data.data.otpauth_url);
      setStep("setup");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (token.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/two-factor/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Verification failed");
        return;
      }
      setTwoFactorEnabled(true);
      setStep("enabled");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    if (token.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/two-factor/disable"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to disable 2FA");
        return;
      }
      setTwoFactorEnabled(false);
      setSecret("");
      setOtpauthUrl("");
      setToken("");
      setStep("idle");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "enabled") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-green-600" />
            <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>Your account is protected with 2FA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">2FA is enabled</p>
              <p className="text-xs text-green-700 mt-0.5">
                An authentication code is required when signing in from a new device.
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2 text-destructive">Disable Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground mb-3">
              Enter a code from your authenticator app to disable 2FA.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="disable-token" className="text-xs">Authentication Code</Label>
                <Input
                  id="disable-token"
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center tracking-widest"
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={loading || token.length !== 6}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4 mr-1" />}
                Disable
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="size-3" /> {error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "setup") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <CardTitle className="text-lg">Set Up Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>Scan the QR code with your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <img
              src={`${QR_API}?size=200x200&data=${encodeURIComponent(otpauthUrl)}`}
              alt="QR Code for authenticator app"
              className="rounded-lg border"
              width={200}
              height={200}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Or enter this key manually:</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono tracking-wider select-all">
                {secret}
              </code>
              <Button variant="outline" size="icon" onClick={copySecret} className="shrink-0">
                {copied ? <CheckCircle2 className="size-4 text-green-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="verify-token">Enter the 6-digit code from your authenticator app</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id="verify-token"
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest h-12"
                />
              </div>
              <Button onClick={handleVerify} disabled={loading || token.length !== 6}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify & Enable
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3" /> {error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-muted-foreground" />
          <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security to your account by requiring a verification code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            When enabled, you&apos;ll need to enter a 6-digit code from your authenticator app
            (like Google Authenticator, Authy, or Microsoft Authenticator) when signing in.
          </p>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3" /> {error}
          </p>
        )}
        <Button onClick={handleSetup} disabled={loading}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Shield className="mr-2 size-4" />}
          Set Up Two-Factor Authentication
        </Button>
      </CardContent>
    </Card>
  );
}
