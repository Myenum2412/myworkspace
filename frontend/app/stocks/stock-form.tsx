"use client"
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";

const CATEGORIES = ["Saree", "Cotton Saree", "Silk Saree", "Ready Made", "Accessories", "Other"];
const UNITS = ["Pcs", "Kg", "Gram", "Liter", "Meter", "Box", "Pack", "Dozen", "Set"];
const BRANDS = ["ABC", "XYZ", "PQR", "DEF", "Other"];

type Stock = {
  id: string;
  itemCode: string;
  productName: string;
  category: string;
  brand: string;
  unit: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  availableStock: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  warehouse: string;
  status: string;
  lastUpdated: string;
  image?: string;
  projectId?: string;
  projectName?: string;
};

type StockFormProps = {
  stock?: Stock | null;
  onSave: (data: Omit<Stock, "id">) => void;
  onCancel: () => void;
};

export function StockForm({ stock, onSave, onCancel }: StockFormProps) {
  const [itemCode, setItemCode] = useState(stock?.itemCode || "");
  const [productName, setProductName] = useState(stock?.productName || "");
  const [category, setCategory] = useState(stock?.category || "");
  const [brand, setBrand] = useState(stock?.brand || "");
  const [unit, setUnit] = useState(stock?.unit || "");
  const [openingStock, setOpeningStock] = useState(String(stock?.openingStock ?? ""));
  const [stockIn, setStockIn] = useState(String(stock?.stockIn ?? ""));
  const [stockOut, setStockOut] = useState(String(stock?.stockOut ?? ""));
  const [reorderLevel, setReorderLevel] = useState(String(stock?.reorderLevel ?? ""));
  const [purchasePrice, setPurchasePrice] = useState(String(stock?.purchasePrice ?? ""));
  const [sellingPrice, setSellingPrice] = useState(String(stock?.sellingPrice ?? ""));
  const [supplier, setSupplier] = useState(stock?.supplier || "");
  const [warehouse, setWarehouse] = useState(stock?.warehouse || "");
  const [image, setImage] = useState(stock?.image || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(stock?.image || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState(stock?.projectId || "");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects-list", { credentials: "include" });
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setProjects(json.data.map((p: any) => ({ id: p.id, name: p.name })));
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    }
    fetchProjects();
  }, []);

  const opening = Number(openingStock) || 0;
  const stockInNum = Number(stockIn) || 0;
  const stockOutNum = Number(stockOut) || 0;
  const autoAvailable = opening + stockInNum - stockOutNum;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      setImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setPreview("");
    setImage("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) return;
    setSaving(true);
    try {
      onSave({
        itemCode: itemCode.trim(),
        productName: productName.trim(),
        category,
        brand,
        unit,
        openingStock: opening,
        stockIn: stockInNum,
        stockOut: stockOutNum,
        availableStock: autoAvailable,
        reorderLevel: Number(reorderLevel) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        supplier: supplier.trim(),
        warehouse: warehouse.trim(),
        status: "",
        lastUpdated: "",
        image,
        projectId,
        projectName: projects.find((p) => p.id === projectId)?.name || "",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="rounded-xl border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Product Details</legend>
        <div className="flex gap-6">
          <div className="shrink-0">
            <div
              className="size-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted/30"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="size-full object-cover" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {preview && (
              <Button type="button" variant="ghost" size="sm" className="mt-1 h-6 w-full text-xs" onClick={clearImage}>
                <X className="mr-1 size-3" /> Remove
              </Button>
            )}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Item Code (Auto)</Label>
              <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="e.g. STK0001" />
              <p className="text-xs text-muted-foreground">Auto-generated if left blank</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Product Name *</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Brand</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Supplier</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Warehouse / Location</Label>
              <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Warehouse or location" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Stock & Pricing</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Opening Stock</Label>
            <Input type="number" min="0" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Stock In (Auto)</Label>
            <Input type="number" min="0" value={stockIn} onChange={(e) => setStockIn(e.target.value)} className="bg-muted/30" />
            <p className="text-xs text-muted-foreground">Updated from Purchase GRN</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Stock Out (Auto)</Label>
            <Input type="number" min="0" value={stockOut} onChange={(e) => setStockOut(e.target.value)} className="bg-muted/30" />
            <p className="text-xs text-muted-foreground">Updated from Sales/Damage</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Available Stock (Auto)</Label>
            <Input type="number" value={autoAvailable} disabled className="bg-muted/30 font-semibold" />
            <p className="text-xs text-muted-foreground">Opening + Stock In - Stock Out</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reorder Level</Label>
            <Input type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Purchase Price (₹)</Label>
            <Input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Selling Price (₹)</Label>
            <Input type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-5">Cancel</Button>
        <Button type="submit" disabled={saving || !productName.trim()} className="h-10 px-5">
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {stock ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
}
