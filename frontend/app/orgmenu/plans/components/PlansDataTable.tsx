"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Building2, DollarSign } from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
};

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
          Create Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Professional" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Plan description..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Price (USD)</Label>
              <Input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (USD)</Label>
              <Input type="number" value={priceYearly} onChange={(e) => setPriceYearly(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !name}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({ plan, onUpdated }: { plan: Plan; onUpdated: () => void }) {
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
        body: JSON.stringify({ name, description, priceMonthly, priceYearly, status }),
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Price (USD)</Label>
              <Input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (USD)</Label>
              <Input type="number" value={priceYearly} onChange={(e) => setPriceYearly(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Current Limits */}
          {plan.limits && plan.limits.length > 0 && (
            <div className="space-y-2">
              <Label>Current Limits</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {plan.limits.map((limit) => (
                  <div key={limit.key} className="flex justify-between p-2 bg-muted rounded">
                    <span>{limit.label}</span>
                    <span className="font-medium">{String(limit.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Features */}
          {plan.features && plan.features.length > 0 && (
            <div className="space-y-2">
              <Label>Current Features</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {plan.features.map((feature) => (
                  <div key={feature.key} className="flex justify-between p-2 bg-muted rounded">
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
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PlansDataTable({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [search, setSearch] = useState("");

  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data || []);
      }
    } catch {}
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to archive this plan?")) return;
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      if (res.ok) handleRefresh();
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter(p => p.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.reduce((sum, p) => sum + (p.activeSubscriptions || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.reduce((sum, p) => sum + (p.totalOrganizations || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <CreatePlanDialog onCreated={handleRefresh} />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Yearly</TableHead>
              <TableHead className="text-right">Subscriptions</TableHead>
              <TableHead className="text-right">Organizations</TableHead>
              <TableHead className="text-right">Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No plans found. Create your first plan to get started.
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
                    <Badge className={STATUS_COLORS[plan.status] || ""}>
                      {plan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${plan.priceMonthly.toLocaleString()}/mo
                  </TableCell>
                  <TableCell className="text-right">
                    ${plan.priceYearly.toLocaleString()}/yr
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
  );
}
