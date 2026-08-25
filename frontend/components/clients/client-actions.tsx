"use client";
import { useEffect, useState } from "react";
import {
  type ClientValues,
  EditClientFormFields,
  EMPTY_VALUES,
  payloadFromValues,
  valuesFromClient,
} from "@/app/clients/client-form-fields";
import type { Client } from "@/app/clients/columns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import { AlertCircle, Loader2, X } from "@/lib/icons";

type ClientEditDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated: (client: Client) => void;
  members: string[];
};

export function ClientEditDialog({
  client,
  open,
  onOpenChange,
  onClientUpdated,
  members,
}: ClientEditDialogProps) {
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
      setEditApiError(
        result.fields && Object.keys(result.fields).length > 0
          ? "Please correct the errors below"
          : result.error || "Failed to update client",
      );
    }
    setEditSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseEdit}>
      <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full">
          <DialogTitle>Edit Client{client ? ` — ${client.name}` : ""}</DialogTitle>
          <DialogDescription>
            Update the details below. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        {editApiError && (
          <div className="px-6">
            <div className="flex items-start gap-3 rounded-sm border-2 border-red-300 bg-gradient-to-r from-red-50 to-amber-50 p-4 shadow-sm">
              <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">{editApiError}</p>
                {Object.keys(editErrors).length > 0 && (
                  <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                    {Object.entries(editErrors).map(([key, msg]) => (
                      <li key={key}>
                        {key}: {msg}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setEditApiError("")}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <EditClientFormFields
              v={editValues}
              set={setEdit}
              errors={editErrors}
              members={members}
            />
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => handleCloseEdit(false)}>
            Cancel
          </Button>
          <Button disabled={editSaving} onClick={handleEditSubmit}>
            {editSaving ? (
              <>
                <Loader2 className="mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
