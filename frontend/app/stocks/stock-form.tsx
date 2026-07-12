"use client"
import { useState, useRef } from "react";
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
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <Label htmlFor="itemCode" className="text-sm font-medium">Item Code (Auto)</Label>
            <Input id="itemCode" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="e.g. STK0001" className="h-10 bg-muted/30" />
            <p className="text-[10px] text-muted-foreground">Auto-generated if left blank</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="productName" className="text-sm font-medium">Product Name *</Label>
            <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="h-10">
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
            <Label htmlFor="brand" className="text-sm font-medium">Brand</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger id="brand" className="h-10">
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
            <Label htmlFor="unit" className="text-sm font-medium">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="unit" className="h-10">
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
            <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
            <Input id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warehouse" className="text-sm font-medium">Warehouse / Location</Label>
            <Input id="warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Warehouse or location" className="h-10" />
          </div>
        </div>
      </div>

      <div className="border-t pt-5">
        <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Stock & Pricing</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="openingStock" className="text-sm font-medium">Opening Stock</Label>
            <Input id="openingStock" type="number" min="0" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stockIn" className="text-sm font-medium">Stock In (Auto)</Label>
            <Input id="stockIn" type="number" min="0" value={stockIn} onChange={(e) => setStockIn(e.target.value)} className="h-10 bg-muted/30" />
            <p className="text-[10px] text-muted-foreground">Updated from Purchase GRN</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stockOut" className="text-sm font-medium">Stock Out (Auto)</Label>
            <Input id="stockOut" type="number" min="0" value={stockOut} onChange={(e) => setStockOut(e.target.value)} className="h-10 bg-muted/30" />
            <p className="text-[10px] text-muted-foreground">Updated from Sales/Damage</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availableStock" className="text-sm font-medium">Available Stock (Auto)</Label>
            <Input id="availableStock" type="number" value={autoAvailable} disabled className="h-10 bg-muted/30 font-semibold" />
            <p className="text-[10px] text-muted-foreground">Opening + Stock In - Stock Out</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reorderLevel" className="text-sm font-medium">Reorder Level</Label>
            <Input id="reorderLevel" type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purchasePrice" className="text-sm font-medium">Purchase Price (₹)</Label>
            <Input id="purchasePrice" type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sellingPrice" className="text-sm font-medium">Selling Price (₹)</Label>
            <Input id="sellingPrice" type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-10" />
          </div>
        </div>
      </div>

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
