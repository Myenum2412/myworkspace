"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  rate: number;
  unit: string;
  status: string;
}

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [rate, setRate] = useState(0);
  const [unit, setUnit] = useState("Hour");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    fetchService();
  }, [id]);

  async function fetchService() {
    try {
      const res = await fetch("/api/billing/services");
      if (res.ok) {
        const data = await res.json();
        const service = data.data?.find((s: Service) => s.id === id);
        if (service) {
          setName(service.name);
          setDescription(service.description);
          setCategory(service.category);
          setRate(service.rate);
          setUnit(service.unit);
          setStatus(service.status);
        }
      }
    } catch (error) {
      console.error("Failed to fetch service:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/billing/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, rate, unit, status }),
      });
      if (res.ok) {
        router.push("/billing/services");
      }
    } catch (error) {
      console.error("Failed to update service:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-sm font-sans flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-800">Edit Service</h1>
        </div>
        <Button variant="ghost" size="icon" className="text-gray-500" asChild>
          <Link href="/billing/services">
            <X className="size-5" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-2xl p-8">
          <div className="grid grid-cols-[150px_1fr] gap-y-6 items-start">

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Service Name*</Label>
            </div>
            <div>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="" />
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
            </div>
            <div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[80px] resize-y" placeholder="" />
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Category</Label>
            </div>
            <div>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full" placeholder="" />
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Rate*</Label>
            </div>
            <div>
              <Input type="number" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="w-full" />
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Unit</Label>
            </div>
            <div>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hour">Hour</SelectItem>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="Month">Month</SelectItem>
                  <SelectItem value="Year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
            </div>
            <div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="flex items-center gap-3 mt-10">
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="px-6">
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
            <Button variant="outline" className="px-6" asChild>
              <Link href="/billing/services">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}