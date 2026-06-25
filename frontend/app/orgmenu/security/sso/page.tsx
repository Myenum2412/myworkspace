import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon } from "lucide-react";

export const metadata = { title: "SSO" };

export default function SsoPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SSO</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5" />
            Single Sign-On
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure SAML or OIDC identity providers for single sign-on access.
          </p>
          <div className="space-y-3">
            {[
              { provider: "SAML 2.0", status: "Not configured", color: "bg-gray-1000" },
              { provider: "OIDC", status: "Not configured", color: "bg-gray-1000" },
            ].map((item) => (
              <div key={item.provider} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{item.provider}</p>
                  <Badge variant="secondary" className="mt-1">{item.status}</Badge>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
