import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Brain, Workflow, Shield, BookOpen, Code2, Building2, Puzzle, Activity, Star, CreditCard, Users } from "lucide-react";
import Link from "next/link";

const enterpriseModules = [
  { title: "Business Intelligence", href: "/enterprise/bi", icon: BarChart3, color: "text-blue-500", desc: "Dashboards, KPIs, reports, health scoring" },
  { title: "AI Decision Intelligence", href: "/enterprise/ai", icon: Brain, color: "text-purple-500", desc: "Insights, predictions, executive summaries" },
  { title: "Workflow Automation", href: "/enterprise/automation", icon: Workflow, color: "text-green-500", desc: "SLA, approvals, triggers, actions" },
  { title: "Governance & Compliance", href: "/enterprise/governance", icon: Shield, color: "text-red-500", desc: "Legal hold, retention, compliance checks" },
  { title: "Knowledge Platform", href: "/enterprise/knowledge", icon: BookOpen, color: "text-amber-500", desc: "Semantic search, graphs, document AI" },
  { title: "Developer Portal", href: "/enterprise/developer", icon: Code2, color: "text-cyan-500", desc: "API keys, webhooks, SDK generation" },
  { title: "Tenant Administration", href: "/enterprise/admin", icon: Building2, color: "text-indigo-500", desc: "Tenant config, usage, lifecycle" },
  { title: "Integration Marketplace", href: "/enterprise/marketplace", icon: Puzzle, color: "text-pink-500", desc: "Discover, install, manage integrations" },
  { title: "Operations Center", href: "/enterprise/operations", icon: Activity, color: "text-orange-500", desc: "Health, incidents, alerts" },
  { title: "Customer Success", href: "/enterprise/success", icon: Star, color: "text-yellow-500", desc: "Onboarding, health scoring, adoption" },
  { title: "Billing & Subscriptions", href: "/enterprise/billing", icon: CreditCard, color: "text-emerald-500", desc: "Plans, invoices, payment methods" },
  { title: "Collaboration", href: "/enterprise/collaboration", icon: Users, color: "text-violet-500", desc: "Workspaces, presence, activity feeds" },
];

export default async function EnterprisePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Enterprise Platform</h1>
        <p className="text-muted-foreground mt-2">Complete suite of enterprise capabilities</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {enterpriseModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${mod.color}`} />
                    <CardTitle className="text-lg">{mod.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{mod.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
