import type { Metadata } from "next";
import { getLoginMetadata } from "@/lib/seo/seo-config";

export const metadata: Metadata = getLoginMetadata();

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
