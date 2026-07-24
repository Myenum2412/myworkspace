"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Info,
  GripVertical, PlusCircle, ChevronDown, Trash2,
  X, Loader2Icon, Upload, PaperclipIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultServices } from "@/lib/data/services";
import { toast } from "sonner";

export default function QuotationFormPageClient() {
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  const isEditing = quotationId !== "new";

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([
    { id: "1", details: "", description: "", quantity: 1, rate: 0, tax: "" }
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<File[]>([]);

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedItems(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    setAttachments(prev => [...prev, ...validFiles].slice(0, 5));
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  const [clients, setClients] = useState<any[]>([]);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");

  useEffect(() => {
    if (!isEditing) {
      const last = parseInt(localStorage.getItem("lastQuotationNum") || "0", 10);
      const next = last + 1;
      localStorage.setItem("lastQuotationNum", String(next));
      setQuotationNumber(`QUO-${String(next).padStart(6, "0")}`);
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const yyyy = today.getFullYear();
      setCurrentDate(`${yyyy}-${mm}-${dd}`);

      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + 30);
      const emm = String(expiry.getMonth() + 1).padStart(2, '0');
      const edd = String(expiry.getDate()).padStart(2, '0');
      setExpiryDate(`${expiry.getFullYear()}-${emm}-${edd}`);
    } else {
      fetch(`/api/billing/quotations/${quotationId}`)
        .then(res => res.json())
        .then(data => {
          const q = data.data || data;
          if (q) {
            setQuotationNumber(q.number || "");
            if (q.quotationDate) {
              try { setCurrentDate(new Date(q.quotationDate).toISOString().split('T')[0]); } catch { setCurrentDate(q.quotationDate.split('T')[0]); }
            }
            if (q.expiryDate) {
              try { setExpiryDate(new Date(q.expiryDate).toISOString().split('T')[0]); } catch { setExpiryDate(q.expiryDate.split('T')[0]); }
            }
            if (q.items && Array.isArray(q.items) && q.items.length > 0) setItems(q.items);
            if (q.discountPercent !== undefined) setDiscountPercent(q.discountPercent);
            if (q.taxRate !== undefined) setTaxRate(q.taxRate);
            if (q.customerId) setSelectedClient(q.customerId);
            if (q.reference) setReference(q.reference);
            if (q.notes) setNotes(q.notes);
            if (q.termsAndConditions) setTermsAndConditions(q.termsAndConditions);
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load quotation details");
        })
        .finally(() => setLoading(false));
    }

    fetch("/api/clients").then(res => res.json()).then(data => {
      if (data.success && data.data) setClients(data.data);
    }).catch(console.error);
  }, []);

  const addNewRow = () => {
    setItems((prev) => [...prev, { id: Date.now().toString() + Math.random(), details: "", description: "", quantity: 1, rate: 0, tax: "" }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subTotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const discountAmount = subTotal * (discountPercent / 100);
  const afterDiscount = subTotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const profileRes = await fetch("/api/user/profile");
      if (!profileRes.ok) { toast.error("Failed to load profile"); setSaving(false); return; }
      const profileData = await profileRes.json();
      const oid = profileData?.data?.org?.id;
      if (!oid) { toast.error("No organization found"); setSaving(false); return; }

      const customerName = clients.find(c => c.id === selectedClient)?.name || "";
      const payload = {
        orgId: oid,
        customerId: selectedClient,
        customerName,
        number: quotationNumber,
        reference,
        quotationDate: currentDate,
        expiryDate,
        items: items.filter((i) => i.rate > 0 || i.details),
        subTotal,
        discountPercent,
        discountAmount,
        taxRate,
        taxAmount,
        total,
        notes,
        termsAndConditions,
      };

      const url = isEditing ? `/api/billing/quotations/${quotationId}` : "/api/billing/quotations";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        const savedQuotation = savedData?.data;
        const quotationClientId = savedQuotation?.customerId || selectedClient;

        if (attachments.length > 0 && quotationClientId) {
          try {
            const foldersRes = await fetch(`/api/folders?clientId=${quotationClientId}`, { credentials: "include" });
            const foldersData = await foldersRes.json();
            const folders = foldersData?.data || foldersData || [];
            const quotationsFolder = Array.isArray(folders) ? folders.find((f: any) => f.name === "Quotations") : null;
            const folderId = quotationsFolder?.id || "";

            for (const file of attachments) {
              const fd = new FormData();
              fd.append("files", file);
              fd.append("clientId", quotationClientId);
              fd.append("moduleName", "quotation");
              if (folderId) fd.append("folderId", folderId);
              await fetch("/api/files/upload", { method: "POST", body: fd }).catch(() => {});
            }
          } catch { /* silent */ }
        }

        toast.success("Quotation saved successfully.");
        router.push("/billing");
      } else {
        toast.error("Failed to save quotation.");
      }
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }, [quotationNumber, currentDate, expiryDate, items, discountPercent, taxRate, router, selectedClient, clients, quotationId, isEditing, attachments, reference, notes, termsAndConditions, subTotal, discountAmount, taxAmount, total]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-screen bg-white">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-sm font-sans flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 sm:px-4 py-3 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 sm:size-5 text-gray-700 shrink-0" />
            <h1 className="text-base sm:text-xl font-semibold text-white-800 truncate">{isEditing ? "Edit Quotation" : "New Quotation"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-gray-500" asChild>
            <Link href="/billing">
              <X className="size-4 sm:size-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full p-3 sm:p-4 md:p-6 lg:p-8 pb-20 space-y-4 sm:space-y-6">

          {/* Customer Name & Reference */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Customer Name*</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full sm:w-[300px] sm:h-9 text-gray-500 bg-white border-black">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full sm:w-[200px] sm:h-9 border-black" placeholder="Optional reference" />
            </div>
          </div>

          <div className="border-b border-gray-100" />

          {/* Quotation# */}
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-y-1.5 sm:gap-y-6 sm:gap-x-4 items-start">
            <Label className="text-xs text-muted-foreground pt-2">Quotation#*</Label>
            <Input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} className="w-full sm:max-w-xs border-black" />

            <Label className="text-xs text-muted-foreground pt-2">Quotation Date*</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-8">
              <Input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="w-full sm:w-[200px] text-gray-700 border-black" />
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Expiry Date</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="flex-1 sm:w-[160px] border-black text-gray-700" />
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="bg-[#f9fafb] px-3 sm:px-4 py-2 border-b border-gray-200">
              <span className="font-semibold text-white-800 text-sm">Item Table</span>
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="table-premium w-full text-sm text-left">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-8 px-2"></th>
                    <th className="w-10 px-2">
                      <input type="checkbox" checked={selectedItems.size === items.length && items.length > 0} onChange={toggleSelectAll} className="size-4 accent-blue-600" />
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                      <span className="text-white-800">Services &amp; Deliverable</span>
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-32">
                      <span className="text-white-800">QUANTITY</span>
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-32">
                      <span className="text-white-800">RATE</span>
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-48">
                      <div className="flex items-center gap-1 text-white-800">
                        TAX <Info className="size-3.5 text-gray-500" />
                      </div>
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-32">
                      <span className="text-white-800">AMOUNT</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const amount = item.quantity * item.rate;
                    return (
                      <tr key={item.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors group">
                        <td className="px-2 text-center text-gray-400 align-top pt-4">
                          <GripVertical className="size-4 mx-auto cursor-move opacity-50 group-hover:opacity-100" />
                        </td>
                        <td className="px-2 align-top pt-4">
                          <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="size-4 accent-blue-600" />
                        </td>
                        <td className="p-0 border-r border-gray-200 align-top pt-2 px-2 space-y-1 min-w-[250px]">
                          <SearchableSelect
                            placeholder=""
                            value={item.details}
                            onValueChange={(val) => {
                              const service = defaultServices.find(s => `${s.name} - ${s.description}` === val);
                              if (service) {
                                updateItem(item.id, 'details', val);
                                updateItem(item.id, 'rate', service.rate);
                              }
                            }}
                            options={defaultServices.filter(s => s.status === "Active").map(s => `${s.name} - ${s.description}`)}
                          />
                          <Textarea
                            placeholder=""
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="border-0 focus-visible:ring-1 focus-visible:ring-blue-400 rounded-none resize-none min-h-[60px] bg-transparent text-sm mt-1"
                          />
                        </td>
                        <td className="p-0 align-top border-r border-gray-200">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="text-right h-full border-0 focus-visible:ring-1 focus-visible:ring-blue-400 rounded-none pt-4 bg-transparent text-sm"
                          />
                        </td>
                        <td className="p-0 align-top border-r border-gray-200">
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="text-right h-full border-0 focus-visible:ring-1 focus-visible:ring-blue-400 rounded-none pt-4 bg-transparent text-sm"
                          />
                        </td>
                        <td className="p-0 align-top border-r border-gray-200">
                          <div className="pt-2 px-2">
                            <Input
                              type="number"
                              value={item.tax}
                              onChange={(e) => updateItem(item.id, 'tax', e.target.value)}
                              className="h-8 border-gray-200 text-sm bg-transparent"
                              placeholder=""
                            />
                          </div>
                        </td>
                        <td className="px-4 align-top text-right font-medium text-gray-900 pt-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {selectedItems.has(item.id) && (
                              <Trash2 onClick={() => deleteItem(item.id)} className="size-4 cursor-pointer text-red-400 hover:text-red-600 shrink-0" />
                            )}
                            <span>{amount.toFixed(2)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Row Button */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={addNewRow} className="text-blue-600 gap-1.5 px-3 hover:bg-gray-100 font-medium text-sm">
              <PlusCircle className="size-4" />
              Add New Row
            </Button>
          </div>

          {/* Bottom Section: Notes, Terms, Attachments & Summary */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
            <div className="flex-1 w-full lg:max-w-[500px]">
              {/* Notes */}
              <div className="mb-6 sm:mb-8">
                <Label className="text-xs text-muted-foreground mb-2 block">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] text-sm text-gray-700 w-full"
                  placeholder="Add any notes for the customer"
                />
              </div>

              {/* Terms & Conditions */}
              <div className="mb-6 sm:mb-8">
                <Label className="text-xs text-muted-foreground mb-2 block">Terms & Conditions</Label>
                <Textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="min-h-[100px] text-sm w-full"
                  placeholder="Add terms and conditions"
                />
              </div>

              {/* Attachments */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <PaperclipIcon className="size-3.5" />
                  Attachments
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" className="relative" disabled={attachments.length >= 5}>
                      <Upload className="size-4 mr-2" />
                      Upload File
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleAttachmentUpload}
                        disabled={attachments.length >= 5}
                        multiple
                      />
                    </Button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      {attachments.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 rounded-sm px-3 py-1.5">
                          <FileText className="size-4 shrink-0" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-xs shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                          <button onClick={() => removeAttachment(i)} className="text-destructive hover:text-destructive/80 shrink-0">
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">
                    Maximum: 5 files. Maximum size: 10 MB each. Files will appear in the Files page under Quotations folder.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="w-full lg:max-w-[450px] bg-[#f9fafb] p-4 sm:p-6 rounded-sm border border-gray-200">
              <div className="flex justify-end items-center mb-4 sm:mb-5 text-sm gap-3">
                <span className="text-gray-700 font-semibold">Sub Total</span>
                <span className="font-semibold text-gray-900">{subTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center mb-4 sm:mb-5 text-sm">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-gray-600">Discount</span>
                  <div className="flex items-center bg-white rounded-sm border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400">
                    <Input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-14 sm:w-16 h-8 text-right border-0 focus-visible:ring-0 rounded-none"
                    />
                    <span className="text-gray-500 bg-gray-50 border-l border-gray-200 h-8 px-2 sm:px-3 flex items-center font-medium">%</span>
                  </div>
                </div>
                <span className="text-gray-900">{discountAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center mb-4 sm:mb-5 text-sm">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-gray-600">Tax</span>
                  <div className="flex items-center bg-white rounded-sm border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400">
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-14 sm:w-16 h-8 text-right border-0 focus-visible:ring-0 rounded-none"
                    />
                    <span className="text-gray-500 bg-gray-50 border-l border-gray-200 h-8 px-2 sm:px-3 flex items-center font-medium">%</span>
                  </div>
                </div>
                <span className="text-gray-900">{taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-base sm:text-[17px] font-bold text-gray-900">Total ( ₹ )</span>
                <span className="text-base sm:text-[17px] font-bold text-gray-900">{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 sm:pt-8 border-t border-gray-100">
            <Button variant="outline" asChild className="touch-target">
              <Link href="/billing">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving} className="touch-target">
              {saving ? "Saving…" : "Save Quotation"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
