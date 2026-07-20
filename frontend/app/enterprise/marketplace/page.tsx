import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseMarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [integrations, installations] = await Promise.all([
    api.getMarketplaceIntegrations().catch(() => null),
    api.getOrgInstallations().catch(() => null),
  ]);

  const installedSet = new Set(
    (installations ?? []).map((i: any) => i.integrationId ?? i.name)
  );

  const featuredIntegrations = integrations?.length
    ? integrations.map((int: any) => ({
        name: int.name,
        category: int.category,
        desc: int.description,
        installed: installedSet.has(int.id) || installedSet.has(int.name),
      }))
    : [
        { name: "Slack", category: "Communication", desc: "Receive notifications and send messages", installed: true },
        { name: "OpenAI", category: "AI", desc: "AI-powered content generation and analysis", installed: false },
        { name: "Google Drive", category: "Storage", desc: "Import files from Google Drive", installed: false },
        { name: "Stripe", category: "Payment", desc: "Payment processing and invoice management", installed: false },
        { name: "GitHub", category: "Automation", desc: "Sync issues and pull requests", installed: true },
        { name: "Sentry", category: "Analytics", desc: "Error tracking and performance monitoring", installed: false },
        { name: "Jira", category: "CRM", desc: "Two-way sync with Jira issues", installed: false },
      ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Integration Marketplace</h1>
      <div className="flex gap-2 mb-6">
        <Input placeholder="Search integrations..." className="max-w-md" aria-label="Search integrations" />
        <Button aria-label="Search">Search</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {featuredIntegrations.map((int: any) => (
          <Card key={int.name} className="relative">
            <CardHeader>
              <CardTitle className="text-base">{int.name}</CardTitle>
              <CardDescription>{int.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{int.desc}</p>
              <Button size="sm" variant={int.installed ? "outline" : "default"} className="w-full" aria-label={int.installed ? `Configure ${int.name}` : `Install ${int.name}`}>
                {int.installed ? "Configure" : "Install"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
