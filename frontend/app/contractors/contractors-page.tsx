"use client";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, ChevronLeftIcon, SearchIcon } from "lucide-react";
import { ContractorList } from "@/components/contractors/contractor-list";
import { ContractorForm } from "@/components/contractors/contractor-form";
import { ContractorViewDialog } from "@/components/contractors/contractor-view-dialog";
import { ContractorEditDialog, ContractorDeleteDialog } from "@/components/contractors/contractor-actions";
import type { Contractor } from "@/app/contractors/columns";

type ContractorsPageProps = {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
};

export default function ContractorsPage({ searchQuery: externalSearchQuery, onSearchChange }: ContractorsPageProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [pageView, setPageView] = useState<"list" | "add">("list");
  const [viewingContractor, setViewingContractor] = useState<Contractor | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [deletingContractor, setDeletingContractor] = useState<Contractor | null>(null);

  const filteredContractors = useMemo(() => {
    if (!externalSearchQuery) return contractors;
    const q = externalSearchQuery.toLowerCase();
    return contractors.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.emailAddress.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.mainTrade.toLowerCase().includes(q)
    );
  }, [contractors, externalSearchQuery]);

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
      <main className="flex flex-1 flex-col h-full bg-white min-w-0 max-w-full">
        <div className="flex items-center gap-3 px-3 sm:px-4 md:px-6 py-4 border-b bg-white sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setPageView("list")} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold text-black">Add New Contractor</h1>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-5xl mx-auto py-6 bg-white my-6">
            <ContractorForm
              onCancel={() => setPageView("list")}
              onContractorAdded={handleContractorAdded}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold shrink-0">Contractors</h1>
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search contractors..."
                value={externalSearchQuery || ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
          </div>
          <Button onClick={() => setPageView("add")} className="shrink-0">
            <PlusIcon className="mr-2 size-4" />
            Add Contractor
          </Button>
        </div>

        <ContractorList
          contractors={filteredContractors}
          onView={(c) => setViewingContractor(c)}
          onEdit={(c) => setEditingContractor(c)}
          onDelete={(c) => setDeletingContractor(c)}
        />
      </main>

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
