"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircleIcon, Search, X, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { type Service, defaultServices } from "@/lib/data/services";

export default function BillingServicesPage() {
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filtered.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filtered.map(s => s.id)));
    }
  };

  const deleteSelected = () => {
    setServices(prev => prev.filter(s => !selectedItems.has(s.id)));
    setSelectedItems(new Set());
  };

  const deleteItem = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    setSelectedItems(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <div className="flex items-center gap-3">
          {selectedItems.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="size-4 mr-1.5" />
              Delete ({selectedItems.size})
            </Button>
          )}
          <Button asChild>
            <Link href="/billing/services/new">
              <PlusCircleIcon className="mr-2 h-4 w-4" />
              New Service
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <X className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" onClick={() => setSearch("")} />
          )}
        </div>
      </div>

      <div className="border border-gray-200 bg-white overflow-hidden flex flex-col rounded-lg">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-10 px-2">
                  <input type="checkbox" checked={selectedItems.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="size-4 accent-blue-600" />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Name</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Category</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Description</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Rate</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Unit</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Status</span>
                </th>
                <th className="text-center font-semibold px-4 py-3.5 whitespace-nowrap w-24">
                  <span className="text-gray-800">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 bg-white">
                    <p className="text-sm text-gray-500">No services found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((service) => (
                  <tr key={service.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-2 align-middle">
                      <input type="checkbox" checked={selectedItems.has(service.id)} onChange={() => toggleSelectItem(service.id)} className="size-4 accent-blue-600" />
                    </td>
                    <td className="px-4 py-3 align-middle font-medium text-gray-900">{service.name}</td>
                    <td className="px-4 py-3 align-middle text-gray-500">{service.category}</td>
                    <td className="px-4 py-3 align-middle text-gray-500 max-w-[200px] truncate">{service.description}</td>
                    <td className="px-4 py-3 align-middle text-right text-gray-700">${service.rate.toFixed(2)}</td>
                    <td className="px-4 py-3 align-middle text-gray-700">{service.unit}</td>
                    <td className="px-4 py-3 align-middle">
                      {service.status === "Active" ? (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/billing/services/${service.id}/edit`}>
                          <Pencil className="size-4 text-blue-500 hover:text-blue-700 cursor-pointer" />
                        </Link>
                        <Trash2 onClick={() => deleteItem(service.id)} className="size-4 text-red-400 hover:text-red-600 cursor-pointer" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
