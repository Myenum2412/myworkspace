import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign Up (MongoDB)",
  description: "Create your free MyWorkSpace account.",
}

export default function SignupMongoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
