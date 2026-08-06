"use client";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, ChevronLeftIcon, SearchIcon, XIcon, BriefcaseIcon } from "@/lib/icons";
import { PageHeader } from "@/components/page-header";
import { ContractorList } from "@/components/contractors/contractor-list";
import { ContractorForm } from "@/components/contractors/contractor-form";
import { ContractorViewDialog } from "@/components/contractors/contractor-view-dialog";
import { ContractorEditDialog } from "@/components/contractors/contractor-actions";
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

  async function handleDelete(contractor: Contractor) {
    const res = await fetch(`/api/contractors/${contractor.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setContractors((prev) => prev.filter((c) => c.id !== contractor.id));
    }
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
          <div className="w-full py-6 bg-white my-6">
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
        <PageHeader
          icon={<BriefcaseIcon className="size-6" />}
          title={<h1>Contractors</h1>}
          subtitle={<p>{filteredContractors.length} {filteredContractors.length === 1 ? "contractor" : "contractors"}</p>}
          search={
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search contractors..."
                value={externalSearchQuery || ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-9 h-9"
              />
              {externalSearchQuery && (
                <button onClick={() => onSearchChange?.("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          }
          actions={
            <Button onClick={() => setPageView("add")} className="shrink-0 touch-target">
              <PlusIcon className="size-4" />
              Add Contractor
            </Button>
          }
        />

        <ContractorList
          contractors={filteredContractors}
          onView={(c) => setViewingContractor(c)}
          onEdit={(c) => setEditingContractor(c)}
          onDelete={handleDelete}
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
    </>
  );
}
