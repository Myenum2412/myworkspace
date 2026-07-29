"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, X, FileText, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";
import { toast } from "sonner";

type LineItem = {
  id: string;
  details: string;
  description: string;
  quantity: number;
  rate: number;
};

type Client = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  rate: number;
  unit: string;
  status: string;
};

export default function NewInvoicePageClient() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", details: "", description: "", quantity: 1, rate: 0 },
  ]);

  useEffect(() => {
    const last = parseInt(localStorage.getItem("lastInvoiceNum") || "0", 10);
    const next = last + 1;
    localStorage.setItem("lastInvoiceNum", String(next));
    setInvoiceNumber(`INV-${String(next).padStart(6, "0")}`);

    Promise.all([
      fetch("/api/clients", { credentials: "include" }).then(r => r.json()),
      fetch("/api/projects-list", { credentials: "include" }).then(r => r.json()),
      fetch("/api/billing/services", { credentials: "include" }).then(r => r.json()),
    ]).then(([clientsData, projectsData, servicesData]) => {
      if (clientsData.success && clientsData.data) setClients(clientsData.data);
      else if (clientsData.initialClients) setClients(clientsData.initialClients);
      else if (Array.isArray(clientsData)) setClients(clientsData);

      const list = projectsData.data || projectsData || [];
      setProjects(Array.isArray(list) ? list : []);

      setServices(servicesData.data || []);
    }).catch(() => {});
  }, []);

  const serviceOptions = services
    .filter(s => s.status === "Active")
    .map(s => `${s.name} - ${s.description}`);

  function addRow() {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), details: "", description: "", quantity: 1, rate: 0 },
    ]);
  }

  function removeRow(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItems((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function deleteSelected() {
    setItems((prev) => prev.filter((i) => !selectedItems.has(i.id)));
    setSelectedItems(new Set());
  }

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }

  function handleServiceSelect(id: string, val: string) {
    const service = services.find(s => `${s.name} - ${s.description}` === val);
    if (service) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, details: val, description: service.description, rate: service.rate } : i
        )
      );
    }
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);

  function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(n);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const profileRes = await fetch("/api/user/profile");
      if (!profileRes.ok) { toast.error("Failed to load profile"); return; }
      const profileData = await profileRes.json();
      const orgId = profileData?.data?.org?.id;
      if (!orgId) { toast.error("No organization found"); return; }

      const customerName = clients.find((c) => c.id === selectedClient)?.name || "";

      const payload = {
        customerId: selectedClient,
        customerName,
        projectId: selectedProject,
        number: invoiceNumber,
        items: items.filter((i) => i.rate > 0),
        subTotal: subtotal,
        total: subtotal,
      };

      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Invoice created");
        router.push("/billing/invoices");
      } else {
        toast.error("Failed to create invoice");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const allSelected = items.length > 0 && selectedItems.size === items.length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">New Invoice</h1>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/billing/invoices">
            <X className="size-5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Customer</Label>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="font-mono"
          />
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col rounded-lg">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 700 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="size-4 accent-blue-600" />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white-800">Service</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-24">
                  <span className="text-white-800">Qty</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-28">
                  <span className="text-white-800">Rate</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-28">
                  <span className="text-white-800">Amount</span>
                </th>
                <th className="text-center font-semibold px-4 py-3.5 whitespace-nowrap w-16">
                  <span className="text-gray-800">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
                        <FileText className="size-6 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No items yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Click 'Add Row' to get started</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const amount = item.quantity * item.rate;
                  return (
                    <tr key={item.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 w-10">
                        <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelect(item.id)} className="size-4 accent-blue-600" />
                      </td>
                      <td className="px-4 py-3 min-w-[250px]">
                        <SearchableSelect
                          placeholder="Select service"
                          value={item.details}
                          onValueChange={(val) => handleServiceSelect(item.id, val)}
                          options={serviceOptions}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="text-right h-9"
                          min={1}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                          className="text-right h-9"
                          min={0}
                          step={0.01}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">
                        {fmt(amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {items.length > 1 && (
                            <button onClick={() => removeRow(item.id)} className="p-1 text-red-400 hover:text-red-600">
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-sm overflow-hidden bg-gray-50 border border-gray-200">
          <Button variant="ghost" size="sm" onClick={addRow} className="text-blue-600 gap-1.5 px-3 hover:bg-gray-100 font-medium text-sm">
            <PlusCircle className="size-4" />
            Add Row
          </Button>
        </div>
        {selectedItems.size > 0 && (
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            <Trash2 className="mr-1.5 size-4" />
            Delete ({selectedItems.size})
          </Button>
        )}
      </div>

      <div className="flex justify-end border-t pt-4">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold tabular-nums">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/billing/invoices">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Create Invoice"}
        </Button>
      </div>
    </div>
  );
}
