import { ClientResetPasswordForm } from "./form";

export const metadata = { title: "Reset Password - Client Portal" };
export const dynamic = "force-dynamic";

export default async function ClientResetPasswordPage(props: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token, email } = await props.searchParams;
  return <ClientResetPasswordForm token={token} email={email} />;
}
