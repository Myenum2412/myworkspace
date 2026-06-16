import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PuzzleIcon } from "lucide-react";

export const metadata = { title: "Integrations" };

const integrations = [
  { name: "Slack", description: "Connect Slack workspace for notifications.", status: "Disconnected", icon: "S" },
  { name: "GitHub", description: "Link repositories and sync activity.", status: "Disconnected", icon: "G" },
  { name: "Jira", description: "Sync issues and track progress.", status: "Disconnected", icon: "J" },
  { name: "GitLab", description: "Connect GitLab repositories.", status: "Coming Soon", icon: "G" },
  { name: "Asana", description: "Sync tasks and projects.", status: "Coming Soon", icon: "A" },
  { name: "Notion", description: "Link documentation and wikis.", status: "Coming Soon", icon: "N" },
];

export default function IntegrationsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Integrations</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg border font-bold text-sm">
                  {integration.icon}
                </div>
                <Badge variant={integration.status === "Connected" ? "default" : "secondary"}>
                  {integration.status}
                </Badge>
              </div>
              <CardTitle className="mt-3">{integration.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled={integration.status === "Coming Soon"}>
                {integration.status === "Coming Soon" ? "Coming soon" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
