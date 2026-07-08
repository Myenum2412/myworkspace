import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthNotFoundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-background">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Image
              src="/logo.jpeg"
              alt="MyWorkSpace Logo"
              width={32}
              height={32}
              className="size-8 rounded-lg object-cover shadow-sm"
            />
            <span className="text-base tracking-tight">MyWorkSpace</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Sign Up Required</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We checked your ID and it is not stored in our database.
                Please create an account to get started.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-md hover:shadow-lg"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-8 py-3 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
        </p>
      </div>

      <div className="relative hidden lg:block overflow-hidden bg-gray-800">
        <Image
          src="/login-bg.png"
          alt="Background"
          fill
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-transparent to-gray-800/60" />
        <div className="absolute inset-0 flex flex-col items-start justify-end p-12">
          <blockquote className="space-y-3">
            <p className="text-xl font-medium text-black leading-relaxed max-w-xs">
              &ldquo;The platform that transformed how our team collaborates and ships.&rdquo;
            </p>
            <footer className="text-sm text-black/70 font-medium">
              Team MyWorkSpace
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
