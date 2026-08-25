import type { Metadata } from "next";
import { SecurityContent } from "./security-content.client";

export const metadata: Metadata = {
  title: "Security Policy | MyWorkSpace",
  description:
    "Learn about how MyWorkSpace secures your structural detailing files, drawing assets, database endpoints, and team communications.",
};

export default function SecurityPage() {
  return <SecurityContent />;
}
