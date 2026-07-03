"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "lucide-react";
import { getSocketIO } from "@/lib/socketio-client";
import type { Client } from "@/app/clients/columns";
import type { Credentials } from "@/components/clients/client-types";
import { ClientList } from "@/components/clients/client-list";
import { ClientForm } from "@/components/clients/client-form";
import { ClientSuccessDialog } from "@/components/clients/client-details";
import { ClientEditDialog, ClientDeleteDialog } from "@/components/clients/client-actions";

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

export default function Clients({ initialClients, user: sessionUser }: ClientsProps) {
  const [user, setUser] = useState(sessionUser);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [loading] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

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

  useEffect(() => {
    let alive = true;
    const sock: any = getSocketIO();
    sock.on("client:created", (d: any) => {
      const c = d?.payload ?? d;
      setClients((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    });
    sock.on("client:updated", (d: any) => {
      const c = d?.payload ?? d;
      setClients((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...c } : x)));
    });
    sock.on("client:deleted", (d: any) => {
      const { id } = d?.payload ?? d;
      setClients((prev) => prev.filter((x) => x.id !== id));
    });
    return () => {
      alive = false;
      if (sock) {
        sock.off("client:created");
        sock.off("client:updated");
        sock.off("client:deleted");
      }
    };
  }, []);

  function handleClientCreated(_client: Client, creds?: Credentials) {
    setClients((prev) => [...prev, _client]);
    if (creds) {
      setCredentials(creds);
      setShowSuccess(true);
    }
  }

  function handleClientUpdated(client: Client) {
    setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
  }

  function handleClientDeleted(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setDeletingClient(null);
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Client
          </Button>
        </div>

        <ClientList
          clients={clients}
          onEdit={(client) => setEditingClient(client)}
          onDelete={(client) => { setDeletingClient(client); }}
        />
      </main>

      <ClientForm
        open={showForm}
        onOpenChange={setShowForm}
        onClientCreated={handleClientCreated}
        members={members}
      />

      <ClientSuccessDialog
        open={showSuccess}
        onOpenChange={setShowSuccess}
        credentials={credentials}
      />

      <ClientEditDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => { if (!open) setEditingClient(null); }}
        onClientUpdated={handleClientUpdated}
        members={members}
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
