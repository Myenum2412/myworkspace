import type { Metadata } from "next";
import { getSignupMetadata } from "@/lib/seo/seo-config";

export const metadata: Metadata = getSignupMetadata();

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
