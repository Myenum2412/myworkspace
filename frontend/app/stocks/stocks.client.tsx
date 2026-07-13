"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, Loader2, FilterIcon, CheckIcon, XIcon, SearchIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Stock } from "@/app/stocks/columns";
import { DataTable } from "@/app/stocks/data-table";
import { columns } from "@/app/stocks/columns";
import { StockForm } from "@/app/stocks/stock-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StocksPageProps = {
  initialStocks: Stock[];
};

export default function StocksPage({ initialStocks }: StocksPageProps) {
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [viewingStock, setViewingStock] = useState<Stock | null>(null);
  const [deletingStock, setDeletingStock] = useState<Stock | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  async function refreshStocks() {
    setLoading(true);
    try {
      const res = await fetch("/api/stocks", { credentials: "include" });
      const data = await res.json();
      const list = data.data || [];
      setStocks(Array.isArray(list) ? list : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStocks();
  }, []);

  async function handleSave(formData: Omit<Stock, "id">) {
    try {
      if (editingStock) {
        await fetch(`/api/stocks/${encodeURIComponent(editingStock.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/stocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
      }
      await refreshStocks();
      setShowForm(false);
      setEditingStock(null);
    } catch {
    }
  }

  async function handleDelete() {
    if (!deletingStock) return;
    try {
      await fetch(`/api/stocks/${encodeURIComponent(deletingStock.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await refreshStocks();
      setDeletingStock(null);
    } catch {
    }
  }

  const handleView = useCallback((stock: Stock) => setViewingStock(stock), []);

  if (loading && stocks.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  const totalItems = stocks.length;
  const totalStock = stocks.reduce((sum, s) => sum + (s.availableStock || 0), 0);
  const lowStock = stocks.filter((s) => s.availableStock <= s.reorderLevel).length;
  const outOfStock = stocks.filter((s) => (s.availableStock || 0) === 0).length;
  const todayStockIn = stocks.reduce((sum, s) => sum + (s.stockIn || 0), 0);
  const todayStockOut = stocks.reduce((sum, s) => sum + (s.stockOut || 0), 0);

  const statuses = [...new Set(stocks.map((s) => s.status).filter(Boolean))];
  const filteredData = statusFilter.length > 0 ? stocks.filter((s) => statusFilter.includes(s.status)) : stocks;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold shrink-0">Inventory</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-48 text-sm"
              />
            </div>
            {statuses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <FilterIcon className="size-3.5" />
                    Filter
                    {statusFilter.length > 0 && (
                      <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none px-1.5 py-0.5">
                        {statusFilter.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusFilter.length > 0 && (
                    <>
                      <DropdownMenuCheckboxItem
                        checked={false}
                        onCheckedChange={() => setStatusFilter([])}
                        className="text-xs text-muted-foreground"
                      >
                        <XIcon className="mr-2 size-3" />
                        Clear filters
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {statuses.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) => {
                        setStatusFilter((prev) =>
                          checked ? [...prev, status] : prev.filter((s) => s !== status)
                        );
                      }}
                    >
                      {statusFilter.includes(status) && <CheckIcon className="mr-2 size-3.5" />}
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button onClick={() => setShowForm(true)} className="h-9">
              <PlusIcon className="mr-1.5 size-4" />
              Add Inventory
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-6 shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStock}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStock > 0 ? "text-orange-500" : ""}`}>{lowStock}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${outOfStock > 0 ? "text-red-500" : ""}`}>{outOfStock}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Today's Stock In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{todayStockIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Today's Stock Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{todayStockOut}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <DataTable
              columns={columns}
              data={filteredData}
              onRowClick={handleView}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              hideSearchBar
            />
        </div>
      </main>

      {viewingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewingStock(null)}>
          <div className="bg-background rounded-xl shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Stock Details</h2>
            </div>
            <div className="p-6 space-y-4 text-sm">
              {viewingStock.image && (
                <div className="flex justify-center mb-4">
                  <img src={viewingStock.image} alt={viewingStock.productName} className="size-24 rounded-lg object-cover border" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium text-muted-foreground">Item Code:</span> {viewingStock.itemCode || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Product:</span> {viewingStock.productName}</div>
                <div><span className="font-medium text-muted-foreground">Category:</span> {viewingStock.category || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Brand:</span> {viewingStock.brand || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Unit:</span> {viewingStock.unit || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Supplier:</span> {viewingStock.supplier || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Warehouse:</span> {viewingStock.warehouse || "—"}</div>
                <div><span className="font-medium text-muted-foreground">Status:</span> {viewingStock.status || "—"}</div>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div><span className="font-medium text-muted-foreground">Opening Stock:</span> {viewingStock.openingStock}</div>
                <div><span className="font-medium text-muted-foreground">Stock In:</span> {viewingStock.stockIn}</div>
                <div><span className="font-medium text-muted-foreground">Stock Out:</span> {viewingStock.stockOut}</div>
                <div><span className="font-medium text-muted-foreground">Available:</span> {viewingStock.availableStock}</div>
                <div><span className="font-medium text-muted-foreground">Reorder Level:</span> {viewingStock.reorderLevel}</div>
                <div><span className="font-medium text-muted-foreground">Purchase Price:</span> ${viewingStock.purchasePrice.toFixed(2)}</div>
                <div><span className="font-medium text-muted-foreground">Selling Price:</span> ${viewingStock.sellingPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); setEditingStock(null); }}>
          <div className="bg-background rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingStock ? "Edit Stock" : "Add Stock"}</h2>
            </div>
            <div className="p-6">
              <StockForm
                stock={editingStock}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditingStock(null); }}
              />
            </div>
          </div>
        </div>
      )}

      {deletingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingStock(null)}>
          <div className="bg-background rounded-xl shadow-lg w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Delete Stock</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <strong>{deletingStock?.productName}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeletingStock(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
