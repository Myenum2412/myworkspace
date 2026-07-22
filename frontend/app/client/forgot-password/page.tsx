import Link from "next/link";
import { ClientForgotPasswordForm } from "./form";

export const metadata = { title: "Forgot Password - Client Portal" };
export const dynamic = "force-dynamic";

export default async function ClientForgotPasswordPage(props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = await props.searchParams;
  const success = searchParams.success;

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="flex size-14 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-6">{success}</p>
          <Link href="/client/login" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return <ClientForgotPasswordForm />;
}
