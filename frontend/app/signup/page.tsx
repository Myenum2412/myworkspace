import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import { signupPageJsonLd } from "@/lib/seo/seo-config";

export default async function SignupPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const jsonLd = signupPageJsonLd();

  return (
    <>
      {jsonLd.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <main className="grid min-h-svh lg:grid-cols-2" role="main">
        <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-10 bg-background">
          <div className="flex justify-center gap-2 md:justify-start">
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
                className="size-8 rounded-lg object-cover shadow-sm"
                priority
              />
              <span className="text-base tracking-tight">MyWorkSpace</span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm">
              <h1 className="sr-only">
                Create Your Free MyWorkSpace Account
              </h1>
              <SignupForm
                error={(await props.searchParams).error}
                plan={(await props.searchParams).plan}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
          </p>
        </div>

        <div
          className="relative hidden lg:block overflow-hidden bg-gray-800"
          aria-hidden="true"
        >
          <Image
            src="/login-bg.png"
            alt=""
            fill
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            sizes="50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-transparent to-gray-800/60" />
          <div className="absolute inset-0 flex flex-col items-start justify-end p-12">
            <blockquote className="space-y-3">
              <p className="text-xl font-medium text-black leading-relaxed max-w-xs">
                &ldquo;The platform that transformed how our team collaborates
                and ships.&rdquo;
              </p>
              <footer className="text-sm text-black/70 font-medium">
                Team MyWorkSpace
              </footer>
            </blockquote>
          </div>
        </div>
      </main>
    </>
  );
}
