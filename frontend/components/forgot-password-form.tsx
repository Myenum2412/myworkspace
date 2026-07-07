import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { ArrowLeftIcon, MailIcon } from "lucide-react";

export function ForgotPasswordForm({ className, searchParams, ...props }: React.ComponentProps<"div"> & { searchParams: Record<string, string> }) {
  const success = searchParams.success;

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6 text-center", className)} {...props}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailIcon className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              {success}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive an email?{" "}
          <Link href="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
            Try again
          </Link>
        </p>
        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form action={forgotPasswordAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-email">Email address</Label>
          <Input id="reset-email" name="email" type="email" required autoComplete="email" className="h-10" />
        </div>
        <Button type="submit" className="w-full font-semibold h-11">
          Send reset link
        </Button>
      </form>

      <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeftIcon className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
