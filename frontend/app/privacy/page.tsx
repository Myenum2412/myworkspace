import type { Metadata } from "next";
import { PrivacyContent } from "./privacy-content.client";

export const metadata: Metadata = {
  title: "Privacy Policy | MyWorkSpace",
  description:
    "Learn about how MyWorkSpace protects and manages your personal data, workspace uploads, and drawings in compliance with international privacy standards.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
