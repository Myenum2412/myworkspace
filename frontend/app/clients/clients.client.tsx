"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2, ChevronLeftIcon, SaveIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Client } from "@/app/clients/columns";
import type { Credentials } from "@/components/clients/client-types";
import { ClientList } from "@/components/clients/client-list";
import { ClientForm } from "@/components/clients/client-form";
import { ClientSuccessDialog } from "@/components/clients/client-details";
import { ClientDeleteDialog } from "@/components/clients/client-actions";
import { ClientViewDialog } from "@/components/clients/client-view-dialog";
import { EditClientFormFields, EMPTY_VALUES, valuesFromClient, payloadFromValues } from "@/app/clients/client-form-fields.client";

type SessionUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
};

type ClientsProps = {
  initialClients: Client[];
  user: SessionUser;
};

function getCsrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)csrf-token=([^;]*)"));
  const token = match ? decodeURIComponent(match[1]) : undefined;
  if (token) return { "x-csrf-token": token };
  return {};
}
const CSRF_HEADERS = getCsrfHeaders();

export default function Clients({ initialClients, user: sessionUser }: ClientsProps) {
  const [user, setUser] = useState(sessionUser);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [loading] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [pageView, setPageView] = useState<"list" | "add" | "edit">("list");
  const [showSuccess, setShowSuccess] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>(EMPTY_VALUES);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/me", { credentials: "include" })
        .then((r) => r.json())
        .then((u) => setUser({ name: u.name || "User", email: u.email || "", image: u.image || "" }))
        .catch(() => {}),
      fetch("/api/employees", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          const arr = Array.isArray(d) ? d : d.data || [];
          const names = arr.map((e: Record<string, unknown>) => e.name as string).filter(Boolean);
          setMembers(names);
        })
        .catch(() => {}),
    ]).catch(() => {});
  }, []);

  function handleClientCreated(_client: Client, creds?: Credentials) {
    setClients((prev) => [...prev, _client]);
    if (creds) {
      setCredentials(creds);
      setShowSuccess(true);
    }
  }

  function handleClientDeleted(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setDeletingClient(null);
  }

  function handleBack() {
    setPageView("list");
    setEditingClient(null);
    setEditValues(EMPTY_VALUES);
    setEditErrors({});
  }

  function handleEdit(client: Client) {
    setEditingClient(client);
    setEditValues(valuesFromClient(client as unknown as Record<string, unknown>));
    setEditErrors({});
    setPageView("edit");
  }

  function setEdit(key: string, value: string) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEdit() {
    if (!editingClient) return;
    setSaving(true);
    setEditErrors({});
    try {
      const body = payloadFromValues(editValues);
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setEditErrors({ _api: err.error || "Failed to save client" });
        return;
      }
      refreshClients();
      handleBack();
    } catch {
      setEditErrors({ _api: "Unable to connect to server" });
    } finally {
      setSaving(false);
    }
  }

  function refreshClients() {
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = data.data || data || [];
        setClients(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (pageView === "add") {
    return (
      <main className="flex flex-1 flex-col h-full bg-white min-w-0 max-w-full">
        <div className="flex items-center gap-3 px-3 sm:px-4 md:px-6 py-4 border-b bg-white sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold text-black">Add New Customer</h1>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-5xl mx-auto py-6 bg-white my-6">
            <ClientForm
              onCancel={handleBack}
              onClientAdded={() => {
                refreshClients();
                handleBack();
              }}
            />
          </div>
        </div>

        <ClientSuccessDialog
          open={showSuccess}
          onOpenChange={setShowSuccess}
          credentials={credentials}
        />
      </main>
    );
  }

  if (pageView === "edit" && editingClient) {
    return (
      <main className="flex flex-1 flex-col h-full bg-white min-w-0 max-w-full">
        <div className="flex items-center gap-3 px-3 sm:px-4 md:px-6 py-4 border-b bg-white sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold text-black">Edit Client — {editingClient.name}</h1>
        </div>
        {editErrors._api && (
          <div className="px-3 sm:px-4 md:px-6 py-2 bg-destructive/10 text-destructive text-sm">{editErrors._api}</div>
        )}
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-5xl mx-auto py-6 bg-white my-6 px-3 sm:px-4 md:px-6">
            <EditClientFormFields v={editValues} set={setEdit} errors={editErrors} members={members} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-3 sm:px-4 md:px-6 py-4 border-t bg-muted/10 shrink-0">
          <Button variant="ghost" onClick={handleBack} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            Save Changes
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Clients</h1>
          <Button onClick={() => setPageView("add")}>
            <PlusIcon className="mr-2 size-4" />
            Add Client
          </Button>
        </div>

        <ClientList
          clients={clients}
          onView={(client) => setViewingClient(client)}
          onEdit={handleEdit}
          onDelete={(client) => { setDeletingClient(client); }}
        />
      </main>

      <ClientViewDialog
        client={viewingClient}
        open={!!viewingClient}
        onOpenChange={(open) => { if (!open) setViewingClient(null); }}
      />

      <ClientDeleteDialog
        client={deletingClient}
        open={!!deletingClient}
        onOpenChange={(open) => { if (!open) setDeletingClient(null); }}
        onClientDeleted={handleClientDeleted}
      />
    </>
  );
}
