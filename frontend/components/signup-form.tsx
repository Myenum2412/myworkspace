"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signupAction } from "@/lib/auth/actions";
import { PasswordInput } from "@/components/password-input";
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

function GitHubIcon() {
  return (
    <svg role="img" viewBox="0 0 24 24" className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg role="img" viewBox="0 0 24 24" className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2" />
    </svg>
  );
}

export function SignupForm({ className, error, plan, ...props }: React.ComponentProps<"div"> & { error?: string; plan?: string }) {
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

      <form action={signupAction} className="flex flex-col gap-4">
        {plan && <input type="hidden" name="selectedPlan" value={plan} />}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">Full name</Label>
          <Input id="signup-name" name="name" type="text" required autoComplete="name" className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-company">Company name</Label>
          <Input id="signup-company" name="company" type="text" autoComplete="organization" className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email address</Label>
          <Input id="signup-email" name="email" type="email" required autoComplete="email" className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput id="signup-password" name="password" required autoComplete="new-password" placeholder="Min. 8 characters" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <PasswordInput id="signup-confirm" name="confirm" required autoComplete="new-password" placeholder="Re-enter your password" />
        </div>
        <Button type="submit" className="w-full mt-1 font-semibold h-11">
          Create account
        </Button>
      </form>

      <div className="relative flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">or sign up with</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" type="button" className="flex items-center justify-center size-12 rounded-full sm:rounded-xl sm:size-auto sm:h-20 sm:flex-col sm:gap-1.5 text-sm font-medium mx-auto sm:mx-0" aria-label="Sign up with Google" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}><GoogleIcon /><span className="hidden sm:inline">Google</span></Button>
        <Button variant="outline" type="button" className="flex items-center justify-center size-12 rounded-full sm:rounded-xl sm:size-auto sm:h-20 sm:flex-col sm:gap-1.5 text-sm font-medium mx-auto sm:mx-0" aria-label="Sign up with GitHub" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}><GitHubIcon /><span className="hidden sm:inline">GitHub</span></Button>
        <Button variant="outline" type="button" className="flex items-center justify-center size-12 rounded-full sm:rounded-xl sm:size-auto sm:h-20 sm:flex-col sm:gap-1.5 text-sm font-medium mx-auto sm:mx-0" aria-label="Sign up with LinkedIn" onClick={() => signIn("linkedin", { callbackUrl: "/dashboard" })}><LinkedInIcon /><span className="hidden sm:inline">LinkedIn</span></Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
