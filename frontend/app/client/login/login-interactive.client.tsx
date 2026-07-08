"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";

export default function LoginInteractive() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newClient, setNewClient] = useState(false);

  useEffect(() => {
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam);
    if (params.get("newClient") === "true") setNewClient(true);
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/client-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("client_token", data.data.token);
      localStorage.setItem("client_user", JSON.stringify(data.data.user));

      if (data.data.user.mustChangePassword) {
        localStorage.setItem("must_change_password", "true");
      }

      // Also create NextAuth session so useSession() works on dashboard
      const signInResult = await signIn("credentials", {
        email,
        password,
        loginSource: "client",
        redirect: false,
      });

      if (signInResult?.error) {
        console.warn("[client-login] NextAuth signIn warning:", signInResult.error);
      }

      router.push("/client/dashboard");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="size-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Client Portal</CardTitle>
          <CardDescription>Sign in to access your client dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {newClient && (
            <div className="rounded-lg bg-green-50 border border-green-300 p-3 flex items-start gap-2">
                <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                Your client workspace has been created. Use the credentials sent to your email to sign in.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
