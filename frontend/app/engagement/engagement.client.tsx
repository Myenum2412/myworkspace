"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "lucide-react";
import type { Engagement } from "@/app/engagement/columns";
import { DataTable } from "@/app/engagement/data-table";
import { columns, makeActionsCell } from "@/app/engagement/columns";
import { EngagementForm } from "@/app/engagement/engagement-form";
import Stats07 from "@/components/stats-07";

type EngagementPageProps = {
  initialEngagements: Engagement[];
};

export default function EngagementPage({ initialEngagements }: EngagementPageProps) {
  const [engagements, setEngagements] = useState<Engagement[]>(initialEngagements);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<Engagement | null>(null);
  const [viewingEngagement, setViewingEngagement] = useState<Engagement | null>(null);
  const [deletingEngagement, setDeletingEngagement] = useState<Engagement | null>(null);

  async function refreshEngagements() {
    setLoading(true);
    try {
      const res = await fetch("/api/engagements", { credentials: "include" });
      const data = await res.json();
      const list = data.data || [];
      setEngagements(Array.isArray(list) ? list : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshEngagements();
  }, []);

  async function handleSave(formData: Omit<Engagement, "id">) {
    try {
      if (editingEngagement) {
        await fetch(`/api/engagements?id=${editingEngagement.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
      }
      await refreshEngagements();
      setShowForm(false);
      setEditingEngagement(null);
    } catch {
    }
  }

  async function handleDelete() {
    if (!deletingEngagement) return;
    try {
      await fetch(`/api/engagements?id=${deletingEngagement.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await refreshEngagements();
      setDeletingEngagement(null);
    } catch {
    }
  }

  const handleView = useCallback((engagement: Engagement) => setViewingEngagement(engagement), []);
  const handleEdit = useCallback((engagement: Engagement) => {
    setEditingEngagement(engagement);
    setShowForm(true);
  }, []);
  const handleDeleteClick = useCallback((engagement: Engagement) => setDeletingEngagement(engagement), []);

  // Stats summary
  const stats = useMemo(() => {
    const total = engagements.length;
    const won = engagements.filter((e) => e.status === "Won").length;
    const newCount = engagements.filter((e) => e.status === "New").length;
    const pending = engagements.filter((e) => e.status === "Pending").length;
    const followUp = engagements.filter((e) => e.status === "Follow-up").length;
    const lost = engagements.filter((e) => e.status === "Lost").length;
    return { total, won, newCount, pending, followUp, lost };
  }, [engagements]);

  if (loading && engagements.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  const total = engagements.length;
  const won = engagements.filter((e) => e.status === "Won").length;
  const newCount = engagements.filter((e) => e.status === "New").length;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Interaction Followups</h1>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Interaction Followup
          </Button>
        </div>

        {/* Stats Overview */}
        <Stats07
          items={[
            { name: 'Total', value: stats.total, subtitle: 'All interactions' },
            { name: 'New', value: stats.newCount, subtitle: 'New leads' },
            { name: 'Won', value: stats.won, subtitle: 'Closed deals' },
            { name: 'Pending', value: stats.pending, subtitle: 'Awaiting response' },
            { name: 'Follow-up', value: stats.followUp, subtitle: 'Need follow-up' },
            { name: 'Lost', value: stats.lost, subtitle: 'Lost deals' },
          ]}
        />

        <div className="flex-1">
          <DataTable
            columns={[...columns, makeActionsCell(handleView, handleEdit, handleDeleteClick)]}
            data={engagements}
            onRowClick={handleView}
          />
        </div>
      </main>

      {viewingEngagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewingEngagement(null)}>
          <div className="bg-background rounded-sm shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Interaction Followup Details</h2>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-medium text-muted-foreground">Date:</span> {viewingEngagement.date}</div>
                <div><span className="font-medium text-muted-foreground">Customer:</span> {viewingEngagement.customerName}</div>
                <div><span className="font-medium text-muted-foreground">Contact:</span> {viewingEngagement.contact || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Source:</span> {viewingEngagement.source || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Status:</span> {viewingEngagement.status || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Assigned To:</span> {viewingEngagement.assignedTo || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Follow-up Date:</span> {viewingEngagement.followUpDate || "—"}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Remarks:</span>
                <p className="mt-1 text-muted-foreground">{viewingEngagement.remarks || "No remarks."}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); setEditingEngagement(null); }}>
          <div className="bg-background rounded-sm shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingEngagement ? "Edit Interaction Followup" : "Add Interaction Followup"}</h2>
            </div>
            <div className="p-6">
              <EngagementForm
                engagement={editingEngagement}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditingEngagement(null); }}
              />
            </div>
          </div>
        </div>
      )}

      {deletingEngagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingEngagement(null)}>
          <div className="bg-background rounded-sm shadow-lg w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Delete Interaction Followup</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete this interaction followup for <strong>{deletingEngagement?.customerName}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeletingEngagement(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
