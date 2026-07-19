"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronLeftIcon } from "lucide-react";
import { ContractorList } from "@/components/contractors/contractor-list";
import { ContractorForm } from "@/components/contractors/contractor-form";
import { ContractorViewDialog } from "@/components/contractors/contractor-view-dialog";
import { ContractorEditDialog, ContractorDeleteDialog } from "@/components/contractors/contractor-actions";
import type { Contractor } from "@/app/contractors/columns";

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [pageView, setPageView] = useState<"list" | "add">("list");
  const [viewingContractor, setViewingContractor] = useState<Contractor | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [deletingContractor, setDeletingContractor] = useState<Contractor | null>(null);

  function fetchContractors() {
    fetch("/api/contractors", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = data.data || data || [];
        setContractors(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchContractors();
  }, []);

  function handleContractorAdded() {
    fetchContractors();
    setPageView("list");
  }

  function handleContractorUpdated(contractor: Contractor) {
    setContractors((prev) => prev.map((c) => (c.id === contractor.id ? contractor : c)));
  }

  function handleContractorDeleted(id: string) {
    setContractors((prev) => prev.filter((c) => c.id !== id));
    setDeletingContractor(null);
  }

  if (pageView === "add") {
    return (
      <div className="flex flex-1 flex-col h-full min-w-0 max-w-full">
        <div className="flex items-center gap-3 px-3 sm:px-4 md:px-6 py-4 border-b sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setPageView("list")} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold">Add New Contractor</h1>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="w-full py-6 my-6">
            <ContractorForm
              onCancel={() => setPageView("list")}
              onContractorAdded={handleContractorAdded}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Contractors</h1>
        <Button onClick={() => setPageView("add")}>
          <PlusIcon className="mr-2 size-4" />
          Add Contractor
        </Button>
      </div>

      <ContractorList
        contractors={contractors}
        onView={(c) => setViewingContractor(c)}
        onEdit={(c) => setEditingContractor(c)}
        onDelete={(c) => setDeletingContractor(c)}
      />

      <ContractorViewDialog
        contractor={viewingContractor}
        open={!!viewingContractor}
        onOpenChange={(open) => { if (!open) setViewingContractor(null); }}
      />

      <ContractorEditDialog
        contractor={editingContractor}
        open={!!editingContractor}
        onOpenChange={(open) => { if (!open) setEditingContractor(null); }}
        onContractorUpdated={handleContractorUpdated}
      />

      <ContractorDeleteDialog
        contractor={deletingContractor}
        open={!!deletingContractor}
        onOpenChange={(open) => { if (!open) setDeletingContractor(null); }}
        onContractorDeleted={handleContractorDeleted}
      />
    </>
  );
}
