"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Info,
  GripVertical, PlusCircle, ChevronDown, Trash2,
  Upload, Sparkles, X, LayoutTemplate, Loader2Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultServices } from "@/lib/data/services";
import { queueOfflineRequest } from "@/lib/offline-sync";
import { toast } from "sonner";

export default function InvoiceFormPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const isEditing = invoiceId !== "new";

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [isSimplifiedView, setIsSimplifiedView] = useState(false);
  const [items, setItems] = useState([
    { id: "1", details: "", description: "", quantity: 1, rate: 0, tax: "" }
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [tdsTcsType, setTdsTcsType] = useState("tds");
  const [tdsTcsRate, setTdsTcsRate] = useState("");
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  const deleteSelected = () => {
    setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
    setSelectedItems(new Set());
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedItems(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [selectedClient, setSelectedClient] = useState("");

  useEffect(() => {
    if (!isEditing) {
      const last = parseInt(localStorage.getItem("lastInvoiceNum") || "0", 10);
      const next = last + 1;
      localStorage.setItem("lastInvoiceNum", String(next));
      setInvoiceNumber(`INV-${String(next).padStart(6, "0")}`);
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const yyyy = today.getFullYear();
      setCurrentDate(`${yyyy}-${mm}-${dd}`);
    } else {
      // Fetch existing invoice
      fetch(`/api/billing/invoices/${invoiceId}`)
        .then(res => res.json())
        .then(data => {
          const inv = data.data || data; // handle unwrapped or wrapped response
          if (inv) {
            setInvoiceNumber(inv.invoiceNumber || inv.number || inv.id?.slice(0,8) || "");
            const dateStr = inv.invoiceDate || inv.periodStart || inv.createdAt;
            if (dateStr) {
              try {
                setCurrentDate(new Date(dateStr).toISOString().split('T')[0]);
              } catch {
                setCurrentDate(dateStr.split('T')[0]);
              }
            }
            if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
              setItems(inv.items);
            }
            if (inv.discountPercent !== undefined) setDiscountPercent(inv.discountPercent);
            if (inv.tdsTcsType) setTdsTcsType(inv.tdsTcsType);
            if (inv.tdsTcsRate) setTdsTcsRate(inv.tdsTcsRate);
            if (inv.adjustmentValue !== undefined) setAdjustmentValue(inv.adjustmentValue);
            if (inv.clientId) setSelectedClient(inv.clientId);
            if (inv.isSimplifiedView !== undefined) setIsSimplifiedView(inv.isSimplifiedView);
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load invoice details");
        })
        .finally(() => {
          setLoading(false);
        });
    }

    fetch("/api/clients").then(res => res.json()).then(data => {
      if (data.success && data.data) setClients(data.data);
    }).catch(console.error);

    fetch("/api/employees").then(res => res.json()).then(data => {
      if (data.data) setEmployees(data.data);
      else if (Array.isArray(data)) setEmployees(data);
    }).catch(console.error);
  }, []);

  const addNewRow = () => {
    setItems((prev) => [...prev, { id: Date.now().toString() + Math.random(), details: "", description: "", quantity: 1, rate: 0, tax: "" }]);
  };

  const addBulkRows = () => {
    const newRows = Array.from({ length: 3 }).map((_, i) => ({
      id: Date.now().toString() + i + Math.random(),
      details: "",
      description: "",
      quantity: 1,
      rate: 0,
      tax: "",
    }));
    setItems((prev) => [...prev, ...newRows]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subTotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const discountAmount = subTotal * (discountPercent / 100);
  const tdsTcsAmount = subTotal * ((parseFloat(tdsTcsRate) || 0) / 100);
  const total = isSimplifiedView ? subTotal : subTotal - discountAmount - tdsTcsAmount + adjustmentValue;

  const handleSave = useCallback(async () => {
    const sub = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const discAmt = sub * (discountPercent / 100);
    const tdsAmt = sub * ((parseFloat(tdsTcsRate) || 0) / 100);
    const tot = isSimplifiedView ? sub : sub - discAmt - tdsAmt + adjustmentValue;

    setSaving(true);
    try {
      const profileRes = await fetch("/api/user/profile");
      const profileData = await profileRes.json();
      const oid = profileData?.data?.org?.id;
      if (!oid) return;

      const payload = {
        orgId: oid,
        clientId: selectedClient,
        customerName: clients.find(c => c.id === selectedClient)?.name || "",
        invoiceNumber,
        invoiceDate: currentDate,
        items: items.filter((i) => i.rate > 0),
        subTotal: sub,
        discountPercent,
        discountAmount: discAmt,
        tdsTcsType,
        tdsTcsRate,
        tdsTcsAmount: tdsAmt,
        adjustmentValue,
        total: tot,
        isSimplifiedView
      };

      const url = isEditing ? `/api/billing/invoices/${invoiceId}` : "/api/billing/invoices";
      const method = isEditing ? "PUT" : "POST";

      if (!navigator.onLine) {
        await queueOfflineRequest(url, method, payload);
        toast.success("Saved offline. Will sync automatically when internet is restored.");
        router.push("/billing");
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Invoice saved successfully.");
        router.push("/billing");
      } else {
        toast.error("Failed to save invoice.");
      }
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }, [invoiceNumber, currentDate, items, discountPercent, tdsTcsType, tdsTcsRate, adjustmentValue, isSimplifiedView, router, selectedClient, clients, invoiceId, isEditing]);

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
            <h1 className="text-base sm:text-xl font-semibold text-gray-800 truncate">{isEditing ? "Edit Invoice" : "New Invoice"}</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Label htmlFor="simplified" className="text-gray-500 text-[10px] sm:text-xs font-medium cursor-pointer whitespace-nowrap">Simplified</Label>
            <div className="scale-75 sm:scale-100 origin-right"><Switch id="simplified" checked={isSimplifiedView} onCheckedChange={setIsSimplifiedView} /></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" asChild>
            <Link href="/billing">
              <X className="size-4 sm:size-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full p-3 sm:p-4 md:p-6 lg:p-8 pb-20 space-y-4 sm:space-y-6">

          {/* Customer Name & Salesperson */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            <div>
              <Label className="text-red-500 font-medium text-xs sm:text-sm">Customer Name*</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full h-10 sm:h-9 text-gray-500 bg-white">
                  <SelectValue placeholder="Select or add a customer" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isSimplifiedView && (
              <div>
                <Label className="text-gray-700 font-medium text-xs sm:text-sm">Salesperson</Label>
                <Select>
                  <SelectTrigger className="w-full h-10 sm:h-9 text-gray-500">
                    <SelectValue placeholder="Select or Add Salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="border-b border-gray-100" />

          {/* Invoice# */}
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-y-1.5 sm:gap-y-6 sm:gap-x-4 items-start">
            <Label className="text-red-500 font-medium text-xs sm:text-sm pt-2">Invoice#*</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full sm:max-w-xs h-10 sm:h-9" />

            {/* Order Number */}
            {!isSimplifiedView && (
              <>
                <Label className="text-gray-700 font-medium text-xs sm:text-sm pt-2">Order Number</Label>
                <Input className="w-full sm:max-w-xs h-10 sm:h-9" />
              </>
            )}

            {/* Invoice Date & Due Date */}
            <Label className="text-red-500 font-medium text-xs sm:text-sm pt-2">Invoice Date*</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-8">
              <Input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="w-full sm:w-[200px] h-10 sm:h-9 text-gray-700" />
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Label className="text-gray-700 font-medium text-xs sm:text-sm whitespace-nowrap">Due Date</Label>
                <Input type="date" value={currentDate} className="flex-1 sm:w-[160px] h-10 sm:h-9 border-dashed border-gray-300 text-gray-500" readOnly />
              </div>
            </div>

            {/* Subject */}
            {!isSimplifiedView && (
              <>
                <Label className="text-gray-700 font-medium text-xs sm:text-sm pt-2 flex items-center gap-1.5">
                  Subject <Info className="size-3.5 sm:size-4 text-gray-400" />
                </Label>
                <Textarea placeholder="Let your customer know what this Invoice is for" className="w-full min-h-[40px] resize-y text-sm" />
              </>
            )}
          </div>

          {/* Table Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {!isSimplifiedView && (
              <div className="bg-[#f9fafb] px-3 sm:px-4 py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-800 text-sm">Item Table</span>
              </div>
            )}
            {/* Mobile card view for items */}
            <div className="sm:hidden space-y-3 p-3">
              {items.map((item) => {
                const amount = item.quantity * item.rate;
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="size-4 accent-blue-600 mt-0.5 shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          {item.details || "Select service"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {selectedItems.has(item.id) && (
                          <button onClick={() => deleteItem(item.id)} className="p-1 text-red-400 hover:text-red-600" aria-label="Delete item">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                        <GripVertical className="size-4 text-gray-400 cursor-move" />
                      </div>
                    </div>
                    <SearchableSelect
                      placeholder="Select a service"
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
                      placeholder="Additional notes..."
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="border focus-visible:ring-1 focus-visible:ring-blue-400 rounded-md resize-none min-h-[50px] text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Rate</Label>
                        <Input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Tax %</Label>
                        <Input type="number" value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} className="h-9 text-sm" placeholder="0" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <span className="text-sm font-semibold text-gray-900">{amount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f3f4f6] text-gray-900">
                    <th className="w-8 px-2"></th>
                    <th className="w-10 px-2">
                      <input type="checkbox" checked={selectedItems.size === items.length && items.length > 0} onChange={toggleSelectAll} className="size-4 accent-blue-600" />
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                      <span className="text-gray-800">Services &amp; Deliverable</span>
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-32">
                      <span className="text-gray-800">QUANTITY</span>
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-32">
                      <div className="flex items-center justify-end gap-1 text-gray-800">
                        RATE <LayoutTemplate className="size-3.5 text-gray-500" />
                      </div>
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-48">
                      <div className="flex items-center gap-1 text-gray-800">
                        TAX <Info className="size-3.5 text-gray-500" />
                      </div>
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-32">
                      <span className="text-gray-800">AMOUNT</span>
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
                            placeholder="Select a service"
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
                            placeholder="Additional notes..."
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
                              placeholder="Enter tax"
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

          {/* Add Row Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded overflow-hidden bg-gray-50 border border-gray-200">
              <Button variant="ghost" size="sm" onClick={addNewRow} className="h-10 sm:h-8 text-blue-600 gap-1.5 px-3 rounded-none hover:bg-gray-100 font-medium text-sm touch-target">
                <PlusCircle className="size-4" />
                Add New Row
              </Button>
              <div className="w-px h-5 bg-gray-300" />
              <Button variant="ghost" size="icon" className="h-10 sm:h-8 w-8 rounded-none text-gray-500 hover:bg-gray-100">
                <ChevronDown className="size-4" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={addBulkRows} className="h-10 sm:h-8 bg-gray-50 border border-gray-200 text-blue-600 gap-1.5 font-medium hover:bg-gray-100 touch-target">
              <PlusCircle className="size-4" />
              Add Items in Bulk
            </Button>
          </div>

          {/* Bottom Section: Notes & Totals */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
            <div className="flex-1 w-full lg:max-w-[500px]">
              {/* Customer Notes */}
              <div className="mb-6 sm:mb-8">
                <Label className="text-gray-800 font-medium mb-2 block text-sm">Customer Notes</Label>
                <Textarea defaultValue="" className="min-h-[80px] text-sm text-gray-700 w-full" />
                <p className="text-[11px] text-gray-500 mt-1.5">Will be displayed on the invoice</p>
              </div>

              {/* Terms & Conditions */}
              <div>
                <Label className="text-gray-800 font-medium mb-2 block text-sm">Terms & Conditions</Label>
                <Textarea
                  placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                  className="min-h-[100px] text-sm w-full"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="w-full lg:max-w-[450px] bg-[#f9fafb] p-4 sm:p-6 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4 sm:mb-5 text-sm">
                <span className="text-gray-700 font-semibold">Sub Total</span>
                <span className="font-semibold text-gray-900">{subTotal.toFixed(2)}</span>
              </div>

              {!isSimplifiedView && (
                <>
                  <div className="flex justify-between items-center mb-4 sm:mb-5 text-sm">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-gray-600">Discount</span>
                      <div className="flex items-center bg-white rounded border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400">
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

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-5 text-sm">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <RadioGroup value={tdsTcsType} onValueChange={setTdsTcsType} className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="tds" id="tds" className="size-3.5" />
                          <Label htmlFor="tds" className="text-xs font-medium text-gray-700">TDS</Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="tcs" id="tcs" className="size-3.5" />
                          <Label htmlFor="tcs" className="text-xs font-medium text-gray-700">TCS</Label>
                        </div>
                      </RadioGroup>
                      <Select value={tdsTcsRate} onValueChange={setTdsTcsRate}>
                        <SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-8 bg-white border-gray-200">
                          <SelectValue placeholder="Select a Tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-gray-500">- {tdsTcsAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center mb-6 text-sm">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <Input defaultValue="Adjustment" className="w-20 sm:w-24 h-8 bg-white text-gray-600 border border-dashed border-gray-300 text-xs text-center" />
                      <Input
                        type="number"
                        value={adjustmentValue}
                        onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                        className="w-20 sm:w-24 h-8 bg-white border-gray-200"
                      />
                      <Info className="size-4 text-gray-400 shrink-0" />
                    </div>
                    <span className="text-gray-900">{adjustmentValue.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-base sm:text-[17px] font-bold text-gray-900">Total ( ₹ )</span>
                <span className="text-base sm:text-[17px] font-bold text-gray-900">{total.toFixed(2)}</span>
              </div>
              
              {isSimplifiedView && (
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" className="h-6 text-blue-600 font-normal px-0 hover:bg-transparent" onClick={() => setIsSimplifiedView(false)}>
                    Show Total Summary <ChevronDown className="size-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* File Attachment & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 pt-6 sm:pt-8 border-t border-gray-100">
            <div className="w-full sm:w-auto">
              <Label className="text-gray-700 font-medium mb-3 block text-sm">Attach File(s) to Invoice</Label>
              <div className="inline-flex items-center rounded overflow-hidden border border-gray-200 bg-white w-full sm:w-auto">
                <Button variant="ghost" size="sm" className="h-10 sm:h-8 gap-2 bg-white hover:bg-gray-50 font-medium border-r border-gray-200 rounded-none px-3 sm:px-4 text-gray-700 flex-1 sm:flex-initial touch-target">
                  <Upload className="size-3.5" />
                  Upload File
                </Button>
                <Button variant="ghost" size="sm" className="h-10 sm:h-8 px-2 bg-white hover:bg-gray-50 rounded-none text-gray-500">
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">You can upload a maximum of 3 files, 10MB each</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" asChild className="flex-1 sm:flex-initial touch-target">
                <Link href="/billing">Cancel</Link>
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-initial touch-target">
                {saving ? "Saving…" : "Save Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
