import type { Metadata } from "next";
import { TermsContent } from "./terms-content.client";

export const metadata: Metadata = {
  title: "Terms of Service | MyWorkSpace",
  description:
    "Review the Terms and Conditions governing the use of the MyWorkSpace platform, subscriptions, content ownership, and service level agreements.",
};

export default function TermsPage() {
  return <TermsContent />;
}
