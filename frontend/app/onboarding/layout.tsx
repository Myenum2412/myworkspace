import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Complete your account setup",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
