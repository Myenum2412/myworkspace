"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Smartphone,
  KeyRound,
  Laptop,
  History,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, apiUrl } from "@/lib/api";

type MfaStatus = {
  enabled: boolean;
  method: string;
  pendingVerification: boolean;
  enabledAt: string | null;
  lastVerifiedAt: string | null;
  backupCodesGeneratedAt: string | null;
};

type TrustedDevice = {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  lastUsedAt: string;
  createdAt: string;
};

type RecoveryCodeStatus = {
  total: number;
  used: number;
  remaining: number;
  generatedAt: string | null;
};

type ActivityEntry = {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
};

type SetupData = {
  secret: string;
  otpauth_url: string;
  qr_code: string;
};

const STEP_SETUP = 1;
const STEP_VERIFY = 2;
const STEP_RECOVERY = 3;
const STEP_DONE = 4;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleString();
}

export default function AuthenticatorSettings() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [step, setStep] = useState(STEP_SETUP);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);
  const [codesStored, setCodesStored] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [recoveryCodeStatus, setRecoveryCodeStatus] = useState<RecoveryCodeStatus | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "devices" | "recovery" | "activity">("overview");
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([]);
  const [newCodesLoading, setNewCodesLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [disableRecoveryCode, setDisableRecoveryCode] = useState("");
  const [disableMethod, setDisableMethod] = useState<"totp" | "recovery">("totp");
  const [disableLoading, setDisableLoading] = useState(false);
  const [deleteDeviceLoading, setDeleteDeviceLoading] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(apiUrl("/api/two-factor/status"));
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrustedDevices = useCallback(async () => {
    try {
      const res = await apiFetch(apiUrl("/api/two-factor/trusted-devices"));
      const data = await res.json();
      if (data.success) setTrustedDevices(data.data);
    } catch {}
  }, []);

  const fetchRecoveryCodeStatus = useCallback(async () => {
    try {
      const res = await apiFetch(apiUrl("/api/two-factor/recovery-codes/status"));
      const data = await res.json();
      if (data.success) setRecoveryCodeStatus(data.data);
    } catch {}
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await apiFetch(apiUrl("/api/two-factor/activity"));
      const data = await res.json();
      if (data.success) setActivities(data.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchTrustedDevices();
    fetchRecoveryCodeStatus();
    fetchActivities();
  }, [fetchStatus, fetchTrustedDevices, fetchRecoveryCodeStatus, fetchActivities]);

  useEffect(() => {
    if (status?.pendingVerification && !status.enabled && !setupData) {
      callSetup();
    }
  }, [status?.pendingVerification, status?.enabled]);

  async function callSetup() {
    setLoading(true);
    try {
      const res = await apiFetch(apiUrl("/api/two-factor/setup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSetupData(data.data);
        setStep(STEP_VERIFY);
        setVerifyCode("");
        setVerifyError("");
        setStatus((prev) => prev ? { ...prev, pendingVerification: true } : prev);
      } else {
        toast.error(data.error || "Failed to start setup");
      }
    } catch {
      toast.error("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  const handleSetup = callSetup;

  const handleVerify = async () => {
    if (verifyCode.length !== 6) return;
    setVerifyLoading(true);
    setVerifyError("");

    try {
      const res = await apiFetch(apiUrl("/api/two-factor/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        setRecoveryCodes(data.data.recoveryCodes);
        setStep(STEP_RECOVERY);
      } else {
        setVerifyError(data.error || "Invalid code");
      }
    } catch {
      setVerifyError("Unable to connect to server");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDone = () => {
    setStep(STEP_DONE);
    fetchStatus();
    fetchRecoveryCodeStatus();
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 3000);
  };

  const handleRegenerateCodes = async () => {
    setNewCodesLoading(true);
    try {
      const res = await apiFetch(apiUrl("/api/two-factor/recovery-codes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setNewRecoveryCodes(data.data.recoveryCodes);
        setShowRecoveryCodes(true);
        fetchRecoveryCodeStatus();
        toast.success("New recovery codes generated");
      } else {
        toast.error(data.error || "Failed to generate codes");
      }
    } catch {
      toast.error("Unable to connect to server");
    } finally {
      setNewCodesLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error("Password is required");
      return;
    }
    setDisableLoading(true);
    try {
      const body: Record<string, string> = { password: disablePassword };
      if (disableMethod === "totp" && disableToken) {
        body.token = disableToken;
      } else if (disableMethod === "recovery" && disableRecoveryCode) {
        body.recoveryCode = disableRecoveryCode;
      } else {
        toast.error("Provide a TOTP code or recovery code");
        setDisableLoading(false);
        return;
      }

      const res = await apiFetch(apiUrl("/api/two-factor/disable"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Two-factor authentication disabled");
        setStatus((prev) => prev ? { ...prev, enabled: false, method: "none", pendingVerification: false, enabledAt: null, lastVerifiedAt: null } : prev);
        setDisablePassword("");
        setDisableToken("");
        setDisableRecoveryCode("");
        setTrustedDevices([]);
      } else {
        toast.error(data.error || "Failed to disable");
      }
    } catch {
      toast.error("Unable to connect to server");
    } finally {
      setDisableLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setDeleteDeviceLoading(deviceId);
    try {
      const res = await apiFetch(apiUrl(`/api/two-factor/trusted-devices/${deviceId}`), {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId));
        toast.success("Trusted device removed");
      } else {
        toast.error(data.error || "Failed to remove device");
      }
    } catch {
      toast.error("Unable to connect to server");
    } finally {
      setDeleteDeviceLoading(null);
    }
  };

  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      "twoFactor.setup_started": "Setup started",
      "twoFactor.enabled": "MFA enabled",
      "twoFactor.disabled": "MFA disabled",
      "twoFactor.verification_success": "Verification success",
      "twoFactor.verification_failure": "Verification failed",
      "twoFactor.recovery_code_used": "Recovery code used",
      "twoFactor.recovery_codes_generated": "Recovery codes regenerated",
      "twoFactor.trust_device": "Device trusted",
      "twoFactor.remove_trusted_device": "Device removed",
      "twoFactor.admin_reset": "Admin reset",
    };
    return map[action] || action.replace("twoFactor.", "");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (status && !status.enabled && !status.pendingVerification) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-sm bg-muted p-2">
              <ShieldOff className="size-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-sm border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                Two-factor authentication is currently <strong>disabled</strong>. 
                Enabling 2FA adds an extra layer of security by requiring a 
                verification code from your authenticator app when signing in.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Status</span>
              <Badge variant="outline" className="ml-2">Disabled</Badge>
            </div>
            <Button onClick={handleSetup} disabled={loading}>
              {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShieldCheck className="size-4 mr-2" />}
              Enable Two-Factor Auth
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status && status.pendingVerification && !status.enabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-sm bg-amber-500/10 p-2">
              <ShieldAlert className="size-6 text-amber-500" />
            </div>
            <div>
              <CardTitle>Complete Setup</CardTitle>
              <CardDescription>
                Verify your authenticator app to enable two-factor authentication
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {setupData ? (
                <>
                  <div className="flex flex-col items-center gap-4 p-4 bg-muted/30 rounded-sm">
                    {setupData.qr_code && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={setupData.qr_code}
                        alt="QR Code"
                        className="rounded-sm border"
                        width={200}
                        height={200}
                      />
                    )}
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
                      <p className="text-xs text-muted-foreground">
                        Compatible with Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden, and more
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Or enter this key manually</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 rounded-sm border bg-muted px-3 py-2 text-xs font-mono break-all">
                        {setupData.secret}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(setupData.secret);
                          toast.success("Secret key copied");
                        }}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-sm">
                  <p className="text-sm text-muted-foreground text-center">
                    You have a pending setup. Click below to view your QR code and secret key, then enter the code from your authenticator app.
                  </p>
                  <Button onClick={handleSetup} disabled={loading}>
                    {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                    Show Setup Details
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="verify-code" className="text-sm font-medium">
                  Enter the 6-digit code from your authenticator app
                </Label>
                {verifyError && (
                  <div className="rounded-sm bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {verifyError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest h-12 font-mono flex-1"
                    maxLength={6}
                    autoFocus
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={verifyCode.length !== 6 || verifyLoading}
                  >
                    {verifyLoading ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === STEP_RECOVERY && (
            <div className="space-y-6">
              <div className="rounded-sm border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-800">Save your recovery codes</p>
                    <p className="text-xs text-amber-700">
                      These codes can be used to access your account if you lose access to your authenticator app.
                      Each code can only be used once. Store them somewhere safe.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, i) => (
                    <code key={i} className="rounded-sm border bg-muted px-3 py-2 text-xs font-mono text-center">
                      {code}
                    </code>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={handleCopyCodes}>
                    {codesCopied ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
                    {codesCopied ? "Copied" : "Copy Codes"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCodesStored(true)}>
                    <Check className="size-3 mr-1" />
                    I&apos;ve Saved Them
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Confirm that you have saved your recovery codes before proceeding
                </p>
                <Button onClick={handleDone} disabled={!codesStored}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === STEP_DONE && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-sm bg-green-500/10 p-3">
                <CheckCircle2 className="size-8 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Two-factor authentication enabled</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is now protected with an additional layer of security.
                </p>
              </div>
              <Button onClick={fetchStatus}>Done</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-sm bg-green-500/10 p-2">
                <ShieldCheck className="size-6 text-green-500" />
              </div>
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Manage your account security settings
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
              <CheckCircle2 className="size-3 mr-1" />
              Enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-sm border p-3">
              <Label className="text-xs text-muted-foreground">Method</Label>
              <p className="text-sm font-medium mt-1 capitalize">{status?.method === "totp" ? "Authenticator App" : status?.method}</p>
            </div>
            <div className="rounded-sm border p-3">
              <Label className="text-xs text-muted-foreground">Enabled Since</Label>
              <p className="text-sm font-medium mt-1">{formatDate(status?.enabledAt)}</p>
            </div>
            <div className="rounded-sm border p-3">
              <Label className="text-xs text-muted-foreground">Last Verified</Label>
              <p className="text-sm font-medium mt-1">{formatDate(status?.lastVerifiedAt)}</p>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex gap-2 border-b">
              <button
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "devices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => { setActiveTab("devices"); fetchTrustedDevices(); }}
              >
                Trusted Devices
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "recovery" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => { setActiveTab("recovery"); fetchRecoveryCodeStatus(); }}
              >
                Recovery Codes
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => { setActiveTab("activity"); fetchActivities(); }}
              >
                Activity
              </button>
            </div>

            <div className="pt-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-sm border border-green-100 bg-green-50 p-3 text-sm text-green-800">
                    Your account is protected with two-factor authentication. 
                    You will need to enter a code from your authenticator app each time you sign in.
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <ShieldOff className="size-4 mr-2" />
                        Disable Two-Factor Auth
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the extra security layer from your account. 
                          You must confirm your password and provide a verification code.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-3 py-2">
                        <div>
                          <Label htmlFor="disable-password">Password</Label>
                          <Input
                            id="disable-password"
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Enter your password"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={disableMethod === "totp" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDisableMethod("totp")}
                          >
                            TOTP Code
                          </Button>
                          <Button
                            variant={disableMethod === "recovery" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDisableMethod("recovery")}
                          >
                            Recovery Code
                          </Button>
                        </div>
                        {disableMethod === "totp" ? (
                          <div>
                            <Label htmlFor="disable-totp">Authenticator Code</Label>
                            <Input
                              id="disable-totp"
                              type="text"
                              inputMode="numeric"
                              placeholder="000000"
                              value={disableToken}
                              onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              maxLength={6}
                            />
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="disable-recovery">Recovery Code</Label>
                            <Input
                              id="disable-recovery"
                              value={disableRecoveryCode}
                              onChange={(e) => setDisableRecoveryCode(e.target.value)}
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                            />
                          </div>
                        )}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            variant="destructive"
                            onClick={handleDisable}
                            disabled={disableLoading || !disablePassword}
                          >
                            {disableLoading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                            Disable
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {activeTab === "devices" && (
                <div className="space-y-3">
                  {trustedDevices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No trusted devices. Devices become trusted when you check "Trust this device" during login.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {trustedDevices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between rounded-sm border p-3">
                          <div className="flex items-center gap-3">
                            <Laptop className="size-8 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{device.deviceName}</p>
                              <p className="text-xs text-muted-foreground">
                                Trusted until {formatDate(device.expiresAt)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id)}
                            disabled={deleteDeviceLoading === device.id}
                          >
                            {deleteDeviceLoading === device.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "recovery" && (
                <div className="space-y-4">
                  {recoveryCodeStatus && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-sm border p-3 text-center">
                        <p className="text-2xl font-bold">{recoveryCodeStatus.total}</p>
                        <p className="text-xs text-muted-foreground">Total Generated</p>
                      </div>
                      <div className="rounded-sm border p-3 text-center">
                        <p className="text-2xl font-bold">{recoveryCodeStatus.used}</p>
                        <p className="text-xs text-muted-foreground">Used</p>
                      </div>
                      <div className="rounded-sm border p-3 text-center">
                        <p className="text-2xl font-bold">{recoveryCodeStatus.remaining}</p>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                      </div>
                    </div>
                  )}

                  {recoveryCodeStatus && recoveryCodeStatus.remaining <= 2 && recoveryCodeStatus.remaining > 0 && (
                    <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <AlertTriangle className="size-4 inline mr-1" />
                      You are running low on recovery codes. Generate new ones.
                    </div>
                  )}

                  {showRecoveryCodes && newRecoveryCodes.length > 0 && (
                    <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">New Recovery Codes</p>
                          <p className="text-xs text-amber-700">
                            These codes replace your old ones. Save them somewhere safe.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {newRecoveryCodes.map((code, i) => (
                          <code key={i} className="rounded-sm border bg-white px-3 py-2 text-xs font-mono text-center">
                            {code}
                          </code>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(newRecoveryCodes.join("\n"));
                            toast.success("Codes copied");
                          }}
                        >
                          <Copy className="size-3 mr-1" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowRecoveryCodes(false)}>
                          <EyeOff className="size-3 mr-1" /> Hide
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleRegenerateCodes}
                    disabled={newCodesLoading}
                  >
                    {newCodesLoading ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4 mr-2" />
                    )}
                    Generate New Recovery Codes
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Generating new codes will invalidate all previous recovery codes.
                  </p>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-2">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No recent MFA activity
                    </p>
                  ) : (
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2">
                        {activities.map((entry) => (
                          <div key={entry._id} className="flex items-start gap-3 rounded-sm border p-3">
                            <div className="mt-0.5">
                              {entry.success ? (
                                <CheckCircle2 className="size-4 text-green-500" />
                              ) : (
                                <XCircle className="size-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{actionLabel(entry.action)}</p>
                              <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                                {entry.ipAddress && (
                                  <span className="text-xs text-muted-foreground">from {entry.ipAddress}</span>
                                )}
                              </div>
                            </div>
                            <Badge variant={entry.success ? "default" : "destructive"} className="shrink-0">
                              {entry.success ? "Success" : "Failed"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
