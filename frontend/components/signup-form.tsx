"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { sendSignupOtpAction, verifySignupOtpAction } from "@/lib/auth/actions";
import { signIn } from "next-auth/react";

function GoogleIcon() {
  return (
    <svg role="img" viewBox="0 0 48 48" className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function SignupForm({ className, error: _error, plan, ...props }: React.ComponentProps<"div"> & { error?: string; plan?: string }) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData();
    form.set("name", name);
    form.set("email", email);
    form.set("company", company);
    if (plan) form.set("selectedPlan", plan);

    const result = await sendSignupOtpAction(form);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setStep("otp");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData();
    form.set("email", email);
    form.set("otp", otp);

    await verifySignupOtpAction(form);
  }

  if (step === "otp") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification code to <strong className="text-foreground">{email}</strong>
          </p>
        </div>

        <form ref={formRef} onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Verification code</Label>
            <Input
              id="signup-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit code"
              required
              className="text-center text-lg tracking-[0.5em] font-mono"
              maxLength={6}
            />
          </div>
          <Button type="submit" className="w-full mt-1 font-semibold" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify & Create Account"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => { setStep("details"); setError(""); }}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
          >
            Back to sign up
          </button>
        </div>

        <div className="relative flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">or sign up with</span>
          <Separator className="flex-1" />
        </div>

        <Button variant="outline" type="button" className="flex items-center justify-center text-sm font-medium gap-2" aria-label="Sign up with Google" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}><GoogleIcon /><span>Google</span></Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Join MyWorkSpace and start collaborating</p>
        {plan && (
          <p className="text-xs font-medium text-brand-600 capitalize">
            Selected plan: {plan}
          </p>
        )}
      </div>

      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        {plan && <input type="hidden" name="selectedPlan" value={plan} />}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Full name</Label>
          <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} type="text" required autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Company name</Label>
          <Input id="signup-company" value={company} onChange={(e) => setCompany(e.target.value)} type="text" autoComplete="organization" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Email address</Label>
          <Input id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" />
        </div>
        <Button type="submit" className="w-full mt-1 font-semibold" disabled={loading}>
          {loading ? "Sending..." : "Send verification code"}
        </Button>
      </form>

      <div className="relative flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">or sign up with</span>
        <Separator className="flex-1" />
      </div>

      <Button variant="outline" type="button" className="flex items-center justify-center text-sm font-medium gap-2" aria-label="Sign up with Google" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}><GoogleIcon /><span>Google</span></Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
