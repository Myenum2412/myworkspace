"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { addEmployeeAction } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddEmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await addEmployeeAction(form);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      onOpenChange(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-5" />
            </button>

            <h2 className="mb-6 text-lg font-semibold">Add Employee</h2>

            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input name="name" required placeholder="" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input name="email" type="email" required placeholder="" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Input name="role" required placeholder="" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Department</Label>
                <select name="department" required className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm">
                  <option value="">Select department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Creative">Creative</option>
                  <option value="Operations">Operations</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select name="status" required className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm">
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Adding..." : "Add Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
