"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentDialog } from "./PaymentDialog";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Building2,
  DollarSign,
  Check,
  Star,
  ArrowRight,
  RefreshCw,
  Zap,
  Shield,
  Clock,
  ExternalLink,
  CreditCard,
} from "lucide-react";

// ── Types ──

interface Plan {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  version: number;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: Array<{ key: string; value: number | string | boolean; label: string }>;
  features: Array<{ key: string; enabled: boolean; label: string }>;
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
}

interface DefaultPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  period: string;
  popular: boolean;
  limits: Array<{ key: string; value: number | string | boolean; label: string }>;
  features: Array<{ key: string; enabled: boolean; label: string }>;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus?: string;
}

interface Subscription {
  _id: string;
  id: string;
  orgId: string;
  planId: string;
  planSlug: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  orgName?: string;
  planName?: string;
}

interface PlansDataTableProps {
  initialPlans: Plan[];
  defaultPlans: DefaultPlan[];
  organizations: Organization[];
  subscriptions: Subscription[];
}

// ── Assign Plan Dialog ──

function AssignPlanDialog({
  plan,
  organizations,
  onAssigned,
}: {
  plan: DefaultPlan | Plan;
  organizations: Organization[];
  onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [reason, setReason] = useState("");

  const isCustomPlan = "price" in plan;
  const planId = isCustomPlan ? plan.id : plan.id;
  const planName = plan.name;

  const handleAssign = async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: selectedOrgId,
          billingCycle,
          reason: reason || `Plan "${planName}" assigned by SuperAdmin`,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setSelectedOrgId("");
        setReason("");
        onAssigned();
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter out orgs that already have this plan
  const availableOrgs = organizations.filter(
    (org) => org.plan !== plan.slug || org.subscriptionStatus !== "active"
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Plan: {planName}</DialogTitle>
          <DialogDescription>
            Select an organization to assign this plan to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Organization *</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {availableOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                    {org.plan && org.plan !== "free" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (current: {org.plan})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableOrgs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                All organizations are already on this plan.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Billing Cycle</Label>
            <div className="flex gap-2">
              <Button
                variant={billingCycle === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("monthly")}
                className="flex-1"
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "yearly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("yearly")}
                className="flex-1"
              >
                Yearly
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Upgrade request from sales team"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={loading || !selectedOrgId}
            >
              {loading ? "Assigning..." : "Assign Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Plan Card ──

function PlanCard({
  plan,
  organizations,
  onAssigned,
  onPay,
}: {
  plan: DefaultPlan;
  organizations: Organization[];
  onAssigned: () => void;
  onPay: (plan: DefaultPlan) => void;
}) {
  const orgsOnPlan = organizations.filter((org) => org.plan === plan.slug);

  return (
    <Card className={`relative ${plan.popular ? "border-primary shadow-md" : ""}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className={plan.popular ? "pt-8" : ""}>
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {plan.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
        </div>

        <div className="space-y-2">
          {plan.limits.map((limit) => (
            <div key={limit.key} className="flex items-center text-sm">
              <Check className="h-4 w-4 text-green-500 mr-2 shrink-0" />
              <span className="text-muted-foreground">{limit.label}:</span>
              <span className="ml-1 font-medium">{String(limit.value)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 pt-2 border-t">
          {plan.features.map((feature) => (
            <div key={feature.key} className="flex items-center text-sm">
              <Check className="h-4 w-4 text-green-500 mr-2 shrink-0" />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">
            {orgsOnPlan.length} organization{orgsOnPlan.length !== 1 ? "s" : ""} on this plan
          </p>
          {plan.priceMonthly > 0 ? (
            <Button onClick={() => onPay(plan)} className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Assign & Pay
            </Button>
          ) : (
            <AssignPlanDialog
              plan={plan}
              organizations={organizations}
              onAssigned={onAssigned}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create Plan Dialog ──

function CreatePlanDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceYearly, setPriceYearly] = useState(0);

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, priceMonthly, priceYearly }),
      });
      if (res.ok) {
        setOpen(false);
        setName("");
        setDescription("");
        setPriceMonthly(0);
        setPriceYearly(0);
        onCreated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
          <DialogDescription>
            Create a custom plan for specific needs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Professional"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Plan description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Price (INR)</Label>
              <Input
                type="number"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (INR)</Label>
              <Input
                type="number"
                value={priceYearly}
                onChange={(e) => setPriceYearly(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !name}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Plan Dialog ──

function EditPlanDialog({
  plan,
  onUpdated,
}: {
  plan: Plan;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly);
  const [priceYearly, setPriceYearly] = useState(plan.priceYearly);
  const [status, setStatus] = useState(plan.status);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          priceMonthly,
          priceYearly,
          status,
        }),
      });
      if (res.ok) {
        setOpen(false);
        onUpdated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Plan: {plan.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Price (INR)</Label>
              <Input
                type="number"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (INR)</Label>
              <Input
                type="number"
                value={priceYearly}
                onChange={(e) => setPriceYearly(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-sm px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {plan.limits && plan.limits.length > 0 && (
            <div className="space-y-2">
              <Label>Limits</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {plan.limits.map((limit) => (
                  <div
                    key={limit.key}
                    className="flex justify-between p-2 bg-muted rounded-sm"
                  >
                    <span>{limit.label}</span>
                    <span className="font-medium">{String(limit.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.features && plan.features.length > 0 && (
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {plan.features.map((feature) => (
                  <div
                    key={feature.key}
                    className="flex justify-between p-2 bg-muted rounded-sm"
                  >
                    <span>{feature.label}</span>
                    <Badge variant={feature.enabled ? "default" : "secondary"}>
                      {feature.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Status Badge ──

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  trialing: "bg-blue-100 text-blue-800",
  past_due: "bg-yellow-100 text-yellow-800",
  canceled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  pending_change: "bg-orange-100 text-orange-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

// ── Main Component ──

export function PlansDataTable({
  initialPlans,
  defaultPlans,
  organizations,
  subscriptions,
}: PlansDataTableProps) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pricing" | "custom" | "subscriptions">("pricing");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<DefaultPlan | null>(null);

  const handleRefresh = async () => {
    window.location.reload();
  };

  const handlePay = (plan: DefaultPlan) => {
    setSelectedPlanForPayment(plan);
    setPaymentDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to archive this plan?")) return;
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      if (res.ok) handleRefresh();
    } catch {}
  };

  const filteredPlans = plans.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("pricing")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pricing"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4 mr-1 inline" />
          Pricing Plans
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "custom"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4 mr-1 inline" />
          Custom Plans
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "subscriptions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 mr-1 inline" />
          Active Subscriptions
          {subscriptions.length > 0 && (
            <Badge className="ml-2 px-1.5 py-0.5 text-xs">{subscriptions.length}</Badge>
          )}
        </button>
      </div>

      {/* Pricing Plans Tab */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Standard Plans</h2>
              <p className="text-sm text-muted-foreground">
                Plans based on{" "}
                <a
                  href="https://myworkspace.myenum.in/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center"
                >
                  myworkspace.myenum.in/pricing
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {defaultPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                organizations={organizations}
                onAssigned={handleRefresh}
                onPay={handlePay}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Plans Tab */}
      {activeTab === "custom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Custom Plans</h2>
              <p className="text-sm text-muted-foreground">
                Create and manage custom plans for specific needs
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 bg-white"
              />
              <CreatePlanDialog onCreated={handleRefresh} />
            </div>
          </div>

          <div className="border rounded-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Yearly</TableHead>
                  <TableHead className="text-right">Subscriptions</TableHead>
                  <TableHead className="text-right">Orgs</TableHead>
                  <TableHead className="text-right">Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No custom plans found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {plan.description || plan.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={plan.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{plan.priceMonthly.toLocaleString()}/mo
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{plan.priceYearly.toLocaleString()}/yr
                      </TableCell>
                      <TableCell className="text-right">
                        {plan.activeSubscriptions || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {plan.totalOrganizations || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        v{plan.version}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AssignPlanDialog
                            plan={plan}
                            organizations={organizations}
                            onAssigned={handleRefresh}
                          />
                          <EditPlanDialog plan={plan} onUpdated={handleRefresh} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={handleRefresh}>
                                Refresh
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(plan.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Active Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Active Subscriptions</h2>
              <p className="text-sm text-muted-foreground">
                {subscriptions.length} active subscription{subscriptions.length !== 1 ? "s" : ""} across all organizations
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plans.length + defaultPlans.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans.filter((p) => p.status === "active").length + defaultPlans.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subscriptions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{organizations.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Subscriptions Table */}
          <div className="border rounded-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No active subscriptions found. Assign a plan to an organization to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{sub.orgName}</div>
                            <div className="text-xs text-muted-foreground">{sub.orgId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.planName}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                      <TableCell>
                        {new Date(sub.currentPeriodStart).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleRefresh}>
                              Refresh
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {selectedPlanForPayment && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          plan={selectedPlanForPayment}
          organizations={organizations}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
