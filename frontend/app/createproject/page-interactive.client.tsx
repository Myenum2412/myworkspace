"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CalendarIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
  PaletteIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleDocsEditor } from "@/components/ui/google-docs-editor";

import { createProjectAction } from "@/actions/projects";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const colors = [
  "#93c5fd", "#fca5a5", "#86efac", "#fcd34d", "#c4b5fd",
  "#f9a8d4", "#67e8f9", "#fdba74", "#6ee7b7", "#a5b4fc",
];

function FormField({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function CreateProjectPageInteractive() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [clientList, setClientList] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [color, setColor] = useState("#93c5fd");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients", { credentials: "include" }).then((r) => r.json()).catch(() => []),
    ]).then(([clientsRes]) => {
      const clientArr = Array.isArray(clientsRes) ? clientsRes : clientsRes?.data || [];
      const names = clientArr.map((c: { name?: string }) => c.name).filter(Boolean);
      setClientList(names);
    });
  }, []);

  const resetForm = () => {
    setName("");
    setClient("");
    setDescription("");
    setDeadline(undefined);
    setColor("#93c5fd");
    setFormError("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !client.trim()) {
      setFormError("Please fill in all required fields: Project Name and Client.");
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("client", client.trim());
      formData.append("description", description.trim());
      if (deadline) formData.append("deadline", deadline.toISOString());
      formData.append("color", color);
      formData.append("access", "Public");

      const result = await createProjectAction(formData);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        resetForm();
        router.refresh();
        router.push("/projects");
      } else {
        setFormError(result.error || "Failed to create project");
      }
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { router.back(); }}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Create New Project</h2>
            <p className="text-sm text-muted-foreground">
              Set up a new project for your team
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div className="mx-6 flex items-center gap-2 border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive shrink-0">
          <AlertCircleIcon className="size-3.5 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex-1 grid grid-cols-[32%_68%]">
        <ScrollArea className="h-full border-r px-5 py-4">
          <div className="space-y-6">
            <FormField label="Project Name" required>
              <Input
                placeholder=""
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
              />
            </FormField>

            <FormField label="Client" required>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientList.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">No clients</div>
                  ) : (
                    clientList.map((c) => (
                      <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Deadline">
              <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-sm font-normal">
                    {deadline ? (
                      <span>{deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    ) : (
                      <span className="text-muted-foreground">Pick a date</span>
                    )}
                    <CalendarIcon className="size-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-sm" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={(d) => { setDeadline(d); setDeadlineOpen(false); }} />
                </PopoverContent>
              </Popover>
            </FormField>

            <FormField label="Color">
              <div className="flex items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`size-7 rounded-sm ring-offset-2 ring-offset-background transition-all ${
                        color === c ? "ring-2 ring-foreground scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-8 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
                />
              </div>
            </FormField>

            <Separator />
          </div>
        </ScrollArea>

        <fieldset className="rounded-sm border p-4 space-y-4 flex flex-col h-full">
          <legend className="text-sm font-semibold px-2">Description</legend>
          <div className="flex-1 min-h-0">
            <GoogleDocsEditor
              value={description}
              onChange={setDescription}
            />
          </div>
        </fieldset>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t shrink-0">
        <Button
          variant="ghost"
          onClick={() => { router.back(); }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !client.trim()}
        >
          {isSubmitting ? (
            <><Loader2 className="size-3.5 animate-spin mr-1.5" />Creating...</>
          ) : (
            "Create Project"
          )}
        </Button>
      </div>
    </>
  );
}
