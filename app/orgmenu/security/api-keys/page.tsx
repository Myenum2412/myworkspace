import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyIcon, PlusIcon } from "lucide-react";

export const metadata = { title: "API Keys" };

export default function ApiKeysPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Button size="sm"><PlusIcon className="size-4 mr-1" /> Create key</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="size-5" />
            Manage Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Create and revoke API keys for programmatic access to the MyWorkSpace API.
          </p>
          <div className="rounded-lg border p-8 text-center">
            <KeyIcon className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No API keys created yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
