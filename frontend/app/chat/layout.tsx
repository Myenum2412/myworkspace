import type { Metadata } from "next";
import { getChatMetadata } from "@/lib/seo/seo-config";

export const metadata: Metadata = getChatMetadata();

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
