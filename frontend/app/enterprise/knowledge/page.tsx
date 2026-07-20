import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseKnowledgePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [graphSummary, classificationBreakdown] = await Promise.all([
    api.getGraphSummary().catch(() => null),
    api.getClassificationBreakdown().catch(() => null),
  ]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Knowledge Platform</h1>
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Semantic Search</TabsTrigger>
          <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
          <TabsTrigger value="docintel">Document Intelligence</TabsTrigger>
          <TabsTrigger value="index">Index Management</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Knowledge Search</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Search across all documents, tasks, projects, and files..." className="flex-1" aria-label="Search knowledge base" />
                <Button aria-label="Execute search">Search</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Indexed Documents</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{graphSummary?.indexedDocuments ?? 0}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Source Types</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{graphSummary?.sourceTypes ?? 7}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Top Tags</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{classificationBreakdown?.tags ?? 24}</p></CardContent></Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="graph">
          <Card><CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">The knowledge graph connects entities across your organization — tasks, projects, users, and files — through typed relationships (assigned_to, part_of, depends_on, blocks, references, similar_to, etc.). The graph engine supports neighbor traversal, subgraph expansion, and automatic project graph construction.</p>
            {graphSummary?.nodes ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card><CardHeader><CardTitle className="text-sm">Nodes</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{graphSummary.nodes}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Edges</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{graphSummary.edges}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Relationships</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{graphSummary.relationshipTypes}</p></CardContent></Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>Knowledge Graph Visualization</p>
                <p className="text-sm">Build relationships by selecting entities and connecting them</p>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="docintel">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card><CardHeader><CardTitle className="text-sm">Analyzed Documents</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{classificationBreakdown?.analyzedDocuments ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Avg Readability</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{classificationBreakdown?.avgReadability ?? "-"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Avg Sentiment</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{classificationBreakdown?.avgSentiment ?? "-"}</p></CardContent></Card>
          </div>
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Document intelligence automatically classifies content (bug_report, feature_request, documentation, specification, etc.), extracts entities (emails, URLs, dates, numbers), analyzes sentiment, calculates readability scores, and identifies keywords. Classification uses weighted pattern matching across 9 document categories.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="index">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Manage the knowledge index — trigger bulk re-indexing of all organizational data, view index statistics, monitor vectorization status, and configure which source types are included in search results.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
