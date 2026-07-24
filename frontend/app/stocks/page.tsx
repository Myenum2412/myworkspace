import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import StocksPage from "./stocks.client";
import type { Stock } from "./columns";

export const dynamic = "force-dynamic";

export default async function StocksServerPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user?.id) redirect("/login");

  let orgId;
  try {
    orgId = await getUserOrgId(session.user.id, session.user.email);
  } catch {
    orgId = null;
  }
  if (!orgId) redirect("/login");

  let rawStocks: Record<string, unknown>[] = [];
  try {
    rawStocks = (await db
      .collection(collections.stocks)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()) as Record<string, unknown>[];
  } catch {
    rawStocks = [];
  }

  const stocks: Stock[] = rawStocks.map((s) => {
    let id = "";
    if (s.id) {
      id = String(s.id);
    } else if (s._id) {
      try {
        id = typeof s._id === "string" ? s._id : String(s._id);
      } catch {
        id = "";
      }
    }
    let lastUpdated = "";
    if (s.updatedAt) {
      try {
        const d = new Date(s.updatedAt as string | number | Date);
        if (!isNaN(d.getTime())) {
          lastUpdated = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
      } catch {}
    }
    return {
      id,
      itemCode: String(s.itemCode ?? ""),
      productName: String(s.productName ?? ""),
      category: String(s.category ?? ""),
      brand: String(s.brand ?? ""),
      unit: String(s.unit ?? ""),
      openingStock: Number(s.openingStock) || 0,
      stockIn: Number(s.stockIn) || 0,
      stockOut: Number(s.stockOut) || 0,
      availableStock: Number(s.availableStock) || 0,
      reorderLevel: Number(s.reorderLevel) || 0,
      purchasePrice: Number(s.purchasePrice) || 0,
      sellingPrice: Number(s.sellingPrice) || 0,
      supplier: String(s.supplier ?? ""),
      warehouse: String(s.warehouse ?? ""),
      status: String(s.status ?? "Active"),
      lastUpdated,
      image: String(s.image ?? ""),
    };
  });

  return <StocksPage initialStocks={stocks} />;
}
