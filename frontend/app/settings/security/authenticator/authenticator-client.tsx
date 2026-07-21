"use client";

import AuthenticatorSettings from "@/components/authenticator-settings";

export default function AuthenticatorClient() {
  return (
    <div className="min-h-svh w-full text-foreground p-6">
      <div className="flex w-full flex-col gap-8 max-w-3xl mx-auto">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account security and two-factor authentication.
          </p>
        </header>
        <AuthenticatorSettings />
      </div>
    </div>
  );
}
