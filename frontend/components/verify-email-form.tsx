import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/lib/auth/actions";
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

export function VerifyEmailForm({ className, searchParams, ...props }: React.ComponentProps<"div"> & { searchParams: Record<string, string> }) {
  const token = searchParams.token;
  const email = searchParams.email;
  const error = searchParams.error;

  if (error) {
    return (
      <div className={cn("flex flex-col gap-6 text-center", className)} {...props}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircleIcon className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Verification failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/login" className="font-medium text-sm text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!token || !email) {
    return (
      <div className={cn("flex flex-col gap-6 text-center", className)} {...props}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <XCircleIcon className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Invalid link</h1>
            <p className="text-sm text-muted-foreground">
              This verification link is missing required information. Please check the link and try again.
            </p>
          </div>
        </div>
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
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
          <CheckCircleIcon className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          Click the button below to verify <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <form action={verifyEmailAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        <Button type="submit" className="w-full font-semibold h-11">
          Verify email address
        </Button>
      </form>

      <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeftIcon className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
