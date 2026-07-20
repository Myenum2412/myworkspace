import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import { signupPageJsonLd } from "@/lib/seo/seo-config";

export const metadata: Metadata = {
  title: "Create Free Account — MyWorkSpace",
  description: "Create your free MyWorkSpace account and start managing projects, collaborating with your team, and automating your business workflows today.",
  keywords: ["free signup", "create account", "workspace management", "project management", "team collaboration"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Create Free Account — MyWorkSpace",
    description: "Start your free workspace management account today.",
    type: "website",
  },
};

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

      <main
        className="relative min-h-dvh overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #03045E 0%, #0077B6 7.5%, #00B4D8 15%, #90E0EF 22.5%, #CAF0F8 27%, #ffffff 35%, #ffffff 100%)",
        }}
        role="main"
      >
        <div className="relative z-10 flex flex-col min-h-dvh p-4 sm:p-6 md:p-10 safe-paddings">
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
              aria-label="MyWorkSpace — Go to homepage"
            >
              <Image
                src="/logo.jpeg"
                alt="MyWorkSpace Logo"
                width={32}
                height={32}
                className="size-7 sm:size-8 rounded-lg object-cover shadow-sm"
                priority
              />
              <span className="text-sm sm:text-base tracking-tight text-white">MyWorkSpace</span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-4 sm:py-0">
            <div className="w-full max-w-sm px-2 sm:px-0">
              <h1 className="sr-only">Create Your Free MyWorkSpace Account</h1>
              <SignupForm
                error={(await props.searchParams).error}
                plan={(await props.searchParams).plan}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground safe-bottom">
            &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
          </p>
        </div>
      </main>
    </>
  );
}
