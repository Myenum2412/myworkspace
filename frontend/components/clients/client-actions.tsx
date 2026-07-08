"use client"
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FolderIcon from "@mui/icons-material/Folder";
import { Loader2, AlertCircle, X, Trash2, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  EditClientFormFields,
  valuesFromClient,
  EMPTY_VALUES,
  payloadFromValues,
  type ClientValues,
} from "@/app/clients/client-form-fields";
import type { Client } from "@/app/clients/columns";

type ClientEditDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated: (client: Client) => void;
  members: string[];
};

export function ClientEditDialog({ client, open, onOpenChange, onClientUpdated, members }: ClientEditDialogProps) {
  const [editValues, setEditValues] = useState<ClientValues>(EMPTY_VALUES);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editApiError, setEditApiError] = useState("");

  const setEdit = (key: string, value: string) =>
    setEditValues((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (client) {
      setEditValues(valuesFromClient(client as unknown as Record<string, unknown>));
      setEditErrors({});
      setEditApiError("");
    }
  }, [client]);

  function handleCloseEdit(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setEditValues(EMPTY_VALUES);
      setEditErrors({});
      setEditApiError("");
    }
  }

  async function handleEditSubmit() {
    if (!client) return;
    setEditSaving(true);
    setEditApiError("");
    setEditErrors({});
    const res = await apiFetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromValues(editValues)),
    });
    const result = await res.json().catch(() => ({}));
    if (res.ok) {
      const updated = result.data || result;
      onClientUpdated({ ...client, ...updated });
      handleCloseEdit(false);
    } else {
      if (result.fields) setEditErrors(result.fields);
      setEditApiError(result.fields && Object.keys(result.fields).length > 0 ? "Please correct the errors below" : (result.error || "Failed to update client"));
    }
    setEditSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseEdit}>
      <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full">
          <DialogTitle>Edit Client{client ? ` — ${client.name}` : ""}</DialogTitle>
          <DialogDescription>Update the details below. Changes are saved immediately.</DialogDescription>
        </DialogHeader>

        {editApiError && (
          <div className="px-6">
            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{editApiError}</p>
                {Object.keys(editErrors).length > 0 && (
                  <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                    {Object.entries(editErrors).map(([key, msg]) => (
                      <li key={key}>{key}: {msg}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setEditApiError("")} className="shrink-0 text-destructive hover:text-destructive">
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <EditClientFormFields v={editValues} set={setEdit} errors={editErrors} members={members} />
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => handleCloseEdit(false)}>Cancel</Button>
          <Button disabled={editSaving} onClick={handleEditSubmit}>
            {editSaving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ClientDeleteDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientDeleted: (id: string) => void;
};

export function ClientDeleteDialog({ client, open, onOpenChange, onClientDeleted }: ClientDeleteDialogProps) {
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (client) setDeleteError("");
  }, [client]);

  async function handleDeleteConfirm() {
    if (!client) return;
    setDeleteError("");
    const res = await apiFetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const result = await res.json().catch(() => ({}));
      const deletedId = result?.id || client.id;
      onClientDeleted(deletedId);
      onOpenChange(false);
    } else {
      const result = await res.json().catch(() => ({}));
      setDeleteError(result.error || "Failed to delete client");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-red-500/10 via-background to-background p-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100/80 ring-8 ring-red-50 mb-6 dark:bg-red-500/20 dark:ring-red-500/10">
            <Trash2 className="size-7 text-red-600 dark:text-red-400" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold tracking-tight">Delete Client</DialogTitle>
            <DialogDescription className="text-center pt-2 text-base">
              {client ? (
                <>Are you sure you want to permanently remove <strong className="text-foreground">{client.name}</strong> ({client.company})?</>
              ) : "Are you sure you want to permanently remove this client?"}
            </DialogDescription>
          </DialogHeader>

          {client && (
            <div className="mt-6 space-y-3 rounded-xl border border-border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                  <FolderIcon className="size-4 text-primary" />
                </div>
                <div className="text-sm font-medium">All associated projects</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="text-sm font-medium">Files and documents</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-red-500/10">
                  <AlertCircle className="size-4 text-red-600" />
                </div>
                <div className="text-sm font-medium text-red-600">Client-user access revoked</div>
              </div>
            </div>
          )}

          {deleteError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="size-4" />
              {deleteError}
            </div>
          )}
        </div>

        <DialogFooter className="bg-muted/50 p-4 flex sm:justify-between border-t border-border/50 gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto hover:bg-background">Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteConfirm} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all active:scale-95 bg-gradient-to-r from-blue-300 to-blue-400 hover:from-blue-400 hover:to-blue-500">
            <Trash2 className="mr-2 size-4" />
            Yes, delete client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
