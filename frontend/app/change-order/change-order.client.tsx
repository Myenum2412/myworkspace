"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChangeOrderForm } from "@/app/change-order/change-order-form";
import type { ChangeOrder } from "@/app/change-order/columns";
import { columns, makeActionsCell } from "@/app/change-order/columns";
import { DataTable } from "@/app/change-order/data-table";
import { PageHeader } from "@/components/page-header";
import Stats07 from "@/components/stats-07";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CheckIcon, ClipboardListIcon, FilterIcon, PlusIcon, SearchIcon, XIcon } from "@/lib/icons";

export default function ChangeOrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ChangeOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ChangeOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  async function refreshOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/change-orders", { credentials: "include" });
      const json = await res.json();
      const list = (json.data || []) as Record<string, unknown>[];
      setOrders(
        Array.isArray(list)
          ? list.map((co) => ({
              id: String(co.id || co._id || ""),
              orderNo: String(co.orderNo || co.coNumber || ""),
              title: String(co.title || ""),
              description: String(co.description || ""),
              projectId: co.projectId ? String(co.projectId) : undefined,
              projectName: co.projectName ? String(co.projectName) : undefined,
              amount: Number(co.amount) || 0,
              status: String(co.status || "Pending"),
              requestedBy: co.requestedBy ? String(co.requestedBy) : undefined,
              requestedByName: co.requestedByName ? String(co.requestedByName) : undefined,
              reason: co.reason ? String(co.reason) : undefined,
              createdAt: String(co.createdAt || ""),
              updatedAt: co.updatedAt ? String(co.updatedAt) : undefined,
              coNumber: co.coNumber ? String(co.coNumber) : undefined,
              jobNumber: co.jobNumber ? String(co.jobNumber) : undefined,
              client: co.client ? String(co.client) : undefined,
              substructureRevised: co.substructureRevised
                ? String(co.substructureRevised)
                : undefined,
              contractDrawingReference: co.contractDrawingReference
                ? String(co.contractDrawingReference)
                : undefined,
              placingDrawingReference: co.placingDrawingReference
                ? String(co.placingDrawingReference)
                : undefined,
              responsibleForRevision: co.responsibleForRevision
                ? String(co.responsibleForRevision)
                : undefined,
              revisedFor: co.revisedFor ? String(co.revisedFor) : undefined,
              receivedDate: co.receivedDate
                ? String(co.receivedDate)
                : co.createdAt
                  ? String(co.createdAt)
                  : undefined,
              drawingChanges: Array.isArray(co.drawingChanges) ? co.drawingChanges : undefined,
              weightDifferences: Array.isArray(co.weightDifferences)
                ? co.weightDifferences
                : undefined,
            }))
          : [],
      );
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const handleView = useCallback((order: ChangeOrder) => setViewingOrder(order), []);
  const handleEdit = useCallback((order: ChangeOrder) => {
    setEditingOrder(order);
    setShowForm(true);
  }, []);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "Pending").length;
    const approved = orders.filter((o) => o.status === "Approved").length;
    const rejected = orders.filter((o) => o.status === "Rejected").length;
    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    return { total, pending, approved, rejected, totalAmount };
  }, [orders]);

  const statuses = [...new Set(orders.map((o) => o.status).filter(Boolean))];
  const filteredData =
    statusFilter.length > 0 ? orders.filter((o) => statusFilter.includes(o.status)) : orders;

  const statsItems = useMemo(
    () => [
      { name: "Total Orders", value: stats.total, subtitle: "All change orders" },
      { name: "Pending", value: stats.pending, subtitle: "Awaiting approval" },
      { name: "Approved", value: stats.approved, subtitle: "Approved changes" },
      { name: "Rejected", value: stats.rejected, subtitle: "Rejected changes" },
      { name: "Total Amount", value: stats.totalAmount, subtitle: "Sum of amounts" },
    ],
    [stats],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch once on auth
  useEffect(() => {
    if (status !== "authenticated") return;
    refreshOrders();
  }, [status]);

  if (status === "loading" || (loading && orders.length === 0))
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  if (!session?.user) return null;

  async function handleSave(formData: Omit<ChangeOrder, "id" | "createdAt" | "updatedAt">) {
    try {
      if (editingOrder) {
        await fetch(`/api/change-orders/${encodeURIComponent(editingOrder.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/change-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
      }
      await refreshOrders();
      setShowForm(false);
      setEditingOrder(null);
    } catch {}
  }

  async function handleDelete(order: ChangeOrder) {
    try {
      await fetch(`/api/change-orders/${encodeURIComponent(order.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await refreshOrders();
    } catch {}
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 min-w-0 w-full">
        <PageHeader
          icon={<ClipboardListIcon className="size-6" />}
          title="Change Order"
          search={
            <div className="relative w-full">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search change orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full text-sm bg-white"
              />
            </div>
          }
          actions={
            <>
              {statuses.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <FilterIcon className="size-3.5" />
                      Filter
                      {statusFilter.length > 0 && (
                        <span className="ml-0.5 rounded-sm bg-primary text-primary-foreground text-[10px] font-bold leading-none px-1.5 py-0.5">
                          {statusFilter.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statusFilter.length > 0 && (
                      <>
                        <DropdownMenuCheckboxItem
                          checked={false}
                          onCheckedChange={() => setStatusFilter([])}
                          className="text-xs text-muted-foreground"
                        >
                          <XIcon className="mr-2 size-3" />
                          Clear filters
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {statuses.map((status) => (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={statusFilter.includes(status)}
                        onCheckedChange={(checked) => {
                          setStatusFilter((prev) =>
                            checked ? [...prev, status] : prev.filter((s) => s !== status),
                          );
                        }}
                      >
                        {statusFilter.includes(status) && <CheckIcon className="mr-2 size-3.5" />}
                        {status}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button onClick={() => setShowForm(true)} className="">
                <PlusIcon className="mr-1.5 size-4" />
                Add Change Order
              </Button>
            </>
          }
        />

        <Stats07 items={statsItems} />

        <DataTable
          columns={[...columns, makeActionsCell(handleView, handleEdit, handleDelete)]}
          data={filteredData}
          onRowClick={handleView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hideSearchBar
        />
      </main>

      {viewingOrder && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setViewingOrder(null)}
          role="presentation"
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: dialog container */}
          <div
            className="bg-background rounded-sm shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Change Order Details</h2>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-muted-foreground">Co #:</span>{" "}
                  {viewingOrder.orderNo || viewingOrder.coNumber || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Job #:</span>{" "}
                  {viewingOrder.jobNumber || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Client:</span>{" "}
                  {viewingOrder.client || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Project:</span>{" "}
                  {viewingOrder.projectName || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Status:</span>{" "}
                  {viewingOrder.status || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Revised For:</span>{" "}
                  {viewingOrder.revisedFor || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Substructure Revised:</span>{" "}
                  {viewingOrder.substructureRevised || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Received Date:</span>{" "}
                  {viewingOrder.receivedDate || viewingOrder.createdAt
                    ? new Date(
                        viewingOrder.receivedDate || viewingOrder.createdAt,
                      ).toLocaleDateString()
                    : "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Contract Drawing Reference:
                  </span>{" "}
                  {viewingOrder.contractDrawingReference || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Placing Drawing Reference:
                  </span>{" "}
                  {viewingOrder.placingDrawingReference || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Responsible for Revision:
                  </span>{" "}
                  {viewingOrder.responsibleForRevision || "—"}
                </div>
              </div>

              {Array.isArray(viewingOrder.drawingChanges) &&
                viewingOrder.drawingChanges.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-2">Drawing Changes Details</h3>
                    <table className="table-premium w-full text-xs text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1.5 pr-3 text-muted-foreground">Dwg No</th>
                          <th className="py-1.5 pr-3 text-muted-foreground">Bar No</th>
                          <th className="py-1.5 pr-3 text-muted-foreground">Description</th>
                          <th className="py-1.5 text-muted-foreground">Rev Time (Hrs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingOrder.drawingChanges.map((d) => (
                          <tr key={d.id || d.dwgNo} className="border-b">
                            <td className="py-1.5 pr-3">{d.dwgNo || "—"}</td>
                            <td className="py-1.5 pr-3">{d.barNo || "—"}</td>
                            <td className="py-1.5 pr-3">{d.description || "—"}</td>
                            <td className="py-1.5">{d.revHours || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {Array.isArray(viewingOrder.weightDifferences) &&
                viewingOrder.weightDifferences.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-2">Weight Difference Summary</h3>
                    <table className="table-premium w-full text-xs text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1.5 pr-3 text-muted-foreground">Dwg #</th>
                          <th className="py-1.5 pr-3 text-muted-foreground">Bar #</th>
                          <th className="py-1.5 pr-3 text-muted-foreground">Weight New</th>
                          <th className="py-1.5 pr-3 text-muted-foreground">Weight Old</th>
                          <th className="py-1.5 pr-3 text-muted-foreground">Bar Grade</th>
                          <th className="py-1.5 text-muted-foreground">Total Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingOrder.weightDifferences.map((w) => (
                          <tr key={w.id || w.dwgNo} className="border-b">
                            <td className="py-1.5 pr-3">{w.dwgNo || "—"}</td>
                            <td className="py-1.5 pr-3">{w.barNo || "—"}</td>
                            <td className="py-1.5 pr-3">{w.weightNew || "—"}</td>
                            <td className="py-1.5 pr-3">{w.weightOld || "—"}</td>
                            <td className="py-1.5 pr-3">{w.barGrade || "—"}</td>
                            <td className="py-1.5">{w.totalCount || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {viewingOrder.description && (
                <div className="border-t pt-4">
                  <span className="font-medium text-muted-foreground">Description:</span>{" "}
                  {viewingOrder.description}
                </div>
              )}
              {viewingOrder.reason && (
                <div className="border-t pt-4">
                  <span className="font-medium text-muted-foreground">Reason:</span>{" "}
                  {viewingOrder.reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setShowForm(false);
            setEditingOrder(null);
          }}
          role="presentation"
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: dialog container */}
          <div
            className="bg-background rounded-sm shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingOrder ? "Edit Change Order" : "Add Change Order"}
              </h2>
            </div>
            <div className="p-6">
              <ChangeOrderForm
                order={editingOrder}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditingOrder(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
