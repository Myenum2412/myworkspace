import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseDeveloperPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const devDashboard = await api.getDeveloperDashboard().catch(() => null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Developer Portal</h1>
      <Tabs defaultValue="apikeys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="sdk">SDK Generation</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="apikeys" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Total Keys</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{devDashboard?.totalKeys ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Active Keys</CardTitle></CardHeader><CardContent><p className={`text-3xl font-bold ${(devDashboard?.activeKeys ?? 0) > 0 ? "text-green-500" : ""}`}>{devDashboard?.activeKeys ?? 0}</p></CardContent></Card>
          </div>
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">API keys are SHA-256 hashed, scoped to specific permissions (read, write, admin), optionally IP-whitelisted, and expiring. Keys are shown once at creation time and never stored in plaintext. Create keys for automated access, CI/CD pipelines, and third-party tool integration.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="webhooks">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Webhook endpoints deliver real-time event notifications to external services. Each webhook has a unique HMAC signing secret, configurable retry count (with exponential backoff), and timeout settings. Events include task creation, file uploads, project changes, and more. Delivery status and failure history are tracked.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="endpoints">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">The API endpoint registry catalogs all available REST endpoints with their methods, paths, request/response schemas, parameters, authentication requirements, and tags. Endpoints are searchable and filterable. This registry powers the auto-generated SDK clients.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="sdk">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Auto-generate SDK clients in TypeScript, Python, and curl from the API endpoint registry. Generated clients include full TypeScript types, JSDoc comments, and ready-to-use fetch/request wrappers. SDKs are versioned and regenerated on demand as your API evolves.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="integrations">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">The integration registry manages third-party connections including webhook receivers, OAuth providers, and custom integrations. Each integration stores configuration, connection status, last sync timestamp, and error history. Monitor all active integrations from a single dashboard.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
