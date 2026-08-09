import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "@/lib/icons";

const AUTH_ERRORS: Record<string, string> = {
  Configuration: "Server configuration error. Please contact support.",
  AccessDenied: "You don't have permission to access this resource.",
  Verification: "The verification link is invalid or has already been used.",
  Default: "Authentication failed. Please try again.",
};

export default async function AuthNotFoundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const error = params.error || "Default";
  const message = AUTH_ERRORS[error] || AUTH_ERRORS.Default;

  return (
    <main
      className="relative min-h-dvh overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #03045E 0%, #0077B6 7.5%, #00B4D8 15%, #90E0EF 22.5%, #CAF0F8 27%, #ffffff 35%, #ffffff 100%)",
      }}
    >
      <div className="relative z-10 flex flex-col min-h-dvh p-4 sm:p-6 md:p-10 safe-paddings">
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground"
            aria-label="MyWorkSpace — Go to homepage"
          >
            <Image
              src="/logo.jpeg"
              alt="MyWorkSpace Logo"
              width={32}
              height={32}
              className="size-7 sm:size-8 rounded-full object-cover shadow-sm"
              priority
            />
            <span className="text-sm sm:text-base tracking-tight text-white">MyWorkSpace</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-4 sm:py-0">
          <div className="w-full max-w-sm px-2 sm:px-0">
            <div className="flex flex-col gap-6 bg-background p-6 sm:p-8 rounded-lg shadow-md border border-border">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="size-6 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    Sign-In Error
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-md hover:shadow-lg"
                >
                  Back to Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Link>
                <Link
                  href="/"
                  className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Go to homepage
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground safe-bottom">
          &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
        </p>
      </div>
    </main>
  );
}
