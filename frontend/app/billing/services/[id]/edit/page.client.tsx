"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditServicePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [rate, setRate] = useState(0);
  const [unit, setUnit] = useState("Hour");
  const [status, setStatus] = useState("Active");

  const handleSave = () => {
    // TODO: persist to backend
    router.push("/billing/services");
  };

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
              <Label className="text-red-500 font-medium">Service Name*</Label>
            </div>
            <div>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="" />
            </div>

            <div className="pt-2">
              <Label className="text-gray-700 font-medium">Description</Label>
            </div>
            <div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[80px] resize-y" placeholder="" />
            </div>

            <div className="pt-2">
              <Label className="text-gray-700 font-medium">Category</Label>
            </div>
            <div>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full" placeholder="" />
            </div>

            <div className="pt-2">
              <Label className="text-gray-700 font-medium">Rate*</Label>
            </div>
            <div>
              <Input type="number" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="w-full" />
            </div>

            <div className="pt-2">
              <Label className="text-gray-700 font-medium">Unit</Label>
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
              <Label className="text-gray-700 font-medium">Status</Label>
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
            <Button onClick={handleSave} className="px-6">Save Changes</Button>
            <Button variant="outline" className="px-6" asChild>
              <Link href="/billing/services">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
