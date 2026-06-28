import { ResetPasswordForm } from "./form";

export const metadata = { title: "Reset Password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage(props: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token, email } = await props.searchParams;
  return <ResetPasswordForm token={token} email={email} />;
}
