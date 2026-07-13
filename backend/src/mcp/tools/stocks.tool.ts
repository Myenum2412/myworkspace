import { toolRegistry } from "./registry.js";
import { mcpMemoryManager } from "../memory/manager.js";

toolRegistry.register({
  name: "stocks.search",
  description: "Searches the product catalog/inventory for available products, services, and packages. Use to find matching products by name, category, brand, or keyword. Returns pricing, availability, and stock levels.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { query, category, brand, minPrice, maxPrice, status, limit: limitParam } = params as Record<string, string>;

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;

    const filter: Record<string, unknown> = { orgId: ctx.org.id };

    if (query?.trim()) {
      const regex = { $regex: query.trim(), $options: "i" };
      filter.$or = [
        { productName: regex },
        { itemCode: regex },
        { category: regex },
        { brand: regex },
        { supplier: regex },
      ];
    }
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (status) filter.status = status;
    if (minPrice || maxPrice) {
      filter.sellingPrice = {};
      if (minPrice) (filter.sellingPrice as Record<string, unknown>).$gte = parseFloat(minPrice);
      if (maxPrice) (filter.sellingPrice as Record<string, unknown>).$lte = parseFloat(maxPrice);
    }

    const limit = Math.min(parseInt(limitParam) || 20, 50);
    const docs = await db.collection("stocks")
      .find(filter)
      .sort({ productName: 1 })
      .limit(limit)
      .toArray();

    const results = docs.map((d) => ({
      id: d.id,
      productName: d.productName,
      itemCode: d.itemCode,
      category: d.category,
      brand: d.brand,
      unit: d.unit,
      availableStock: d.availableStock,
      sellingPrice: d.sellingPrice,
      purchasePrice: d.purchasePrice,
      supplier: d.supplier,
      warehouse: d.warehouse,
      status: d.status,
      image: d.image || null,
      inStock: (d.availableStock || 0) > 0,
      lowStock: (d.availableStock || 0) <= (d.reorderLevel || 0) && (d.availableStock || 0) > 0,
      outOfStock: (d.availableStock || 0) === 0,
    }));

    await mcpMemoryManager.addEntry({
      sessionId: ctx.user.sessionId,
      userId: ctx.user.userId,
      orgId: ctx.org.id,
      role: "system",
      content: `Searched products with query="${query || "*"}" category="${category || "*"}" — found ${results.length} results`,
      metadata: { query, category, resultCount: results.length },
    });

    return {
      results,
      total: results.length,
      query: query || null,
      category: category || null,
    };
  },
});

toolRegistry.register({
  name: "stocks.compare",
  description: "Compares multiple products side by side. Provide product IDs or names to compare pricing, availability, features, and specifications.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { productIds, productNames } = params as Record<string, string>;

    if (!productIds && !productNames) {
      throw new Error("Provide either productIds (comma-separated) or productNames (comma-separated)");
    }

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;

    let products;

    if (productIds) {
      const ids = productIds.split(",").map((s) => s.trim());
      products = await db.collection("stocks")
        .find({ id: { $in: ids }, orgId: ctx.org.id })
        .toArray();
    } else {
      const names = productNames.split(",").map((s) => s.trim());
      const regexes = names.map((n) => ({ productName: { $regex: n, $options: "i" } }));
      products = await db.collection("stocks")
        .find({ $or: regexes, orgId: ctx.org.id })
        .toArray();
    }

    if (products.length === 0) {
      return { products: [], comparison: null };
    }

    const comparison = {
      count: products.length,
      priceRange: {
        min: Math.min(...products.map((p) => p.sellingPrice || 0)),
        max: Math.max(...products.map((p) => p.sellingPrice || 0)),
      },
      inStock: products.filter((p) => (p.availableStock || 0) > 0).length,
      categories: [...new Set(products.map((p) => p.category).filter(Boolean))],
      brands: [...new Set(products.map((p) => p.brand).filter(Boolean))],
    };

    return {
      products: products.map((p) => ({
        id: p.id,
        productName: p.productName,
        category: p.category,
        brand: p.brand,
        sellingPrice: p.sellingPrice,
        purchasePrice: p.purchasePrice,
        availableStock: p.availableStock,
        unit: p.unit,
        inStock: (p.availableStock || 0) > 0,
      })),
      comparison,
    };
  },
});

toolRegistry.register({
  name: "stocks.recommend",
  description: "AI product recommendation engine. Analyzes customer requirements (budget, category, needs) and recommends the best matching products with cross-selling and upselling suggestions.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { budget, category, needs, excludeIds } = params as Record<string, string>;

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;

    const filter: Record<string, unknown> = { orgId: ctx.org.id };

    if (category) filter.category = category;
    if (budget) {
      const maxBudget = parseFloat(budget);
      if (!isNaN(maxBudget)) {
        filter.sellingPrice = { $lte: maxBudget };
      }
    }
    if (needs?.trim()) {
      const regex = { $regex: needs.trim(), $options: "i" };
      if (!filter.$or) {
        filter.$or = [{ productName: regex }, { category: regex }];
      }
    }
    if (excludeIds) {
      const ids = excludeIds.split(",").map((s) => s.trim());
      filter.id = { $nin: ids };
    }

    const allProducts = await db.collection("stocks")
      .find(filter)
      .sort({ availableStock: -1, sellingPrice: 1 })
      .limit(30)
      .toArray();

    const inStock = allProducts.filter((p) => (p.availableStock || 0) > 0);
    const lowStock = allProducts.filter((p) => (p.availableStock || 0) <= (p.reorderLevel || 0) && (p.availableStock || 0) > 0);
    const outOfStock = allProducts.filter((p) => (p.availableStock || 0) === 0);

    const primary = inStock.slice(0, 5).map((p) => ({
      id: p.id,
      productName: p.productName,
      category: p.category,
      brand: p.brand,
      sellingPrice: p.sellingPrice,
      availableStock: p.availableStock,
      unit: p.unit,
    }));

    const alternatives = inStock.length > 5
      ? inStock.slice(5, 10).map((p) => ({
          id: p.id,
          productName: p.productName,
          sellingPrice: p.sellingPrice,
        }))
      : outOfStock.slice(0, 5).map((p) => ({
          id: p.id,
          productName: p.productName,
          sellingPrice: p.sellingPrice,
          note: "Currently out of stock",
        }));

    const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))];
    const upsell = inStock
      .filter((p) => p.sellingPrice > (parseFloat(budget) || 0) * 1.3)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        productName: p.productName,
        sellingPrice: p.sellingPrice,
        reason: "Premium alternative with enhanced features",
      }));

    const crossSell = categories.length > 0
      ? await db.collection("stocks")
          .find({ orgId: ctx.org.id, category: { $in: categories }, id: { $nin: allProducts.map((p) => p.id) } })
          .limit(3)
          .toArray()
      : [];

    return {
      primary,
      alternatives,
      upsell,
      crossSell: crossSell.map((p) => ({ id: p.id, productName: p.productName, sellingPrice: p.sellingPrice })),
      summary: {
        totalFound: allProducts.length,
        inStock: inStock.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        budgetRange: budget ? `≤ ${budget}` : "No budget limit",
        category: category || "All categories",
      },
    };
  },
});

toolRegistry.register({
  name: "stocks.get",
  description: "Retrieves detailed information about a single product by its ID or item code.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { productId, itemCode } = params as Record<string, string>;

    if (!productId && !itemCode) {
      throw new Error("Provide either productId or itemCode");
    }

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;

    let product;
    if (productId) {
      product = await db.collection("stocks").findOne({ id: productId, orgId: ctx.org.id });
    } else {
      product = await db.collection("stocks").findOne({ itemCode, orgId: ctx.org.id });
    }

    if (!product) {
      throw new Error("Product not found");
    }

    return {
      id: product.id,
      itemCode: product.itemCode,
      productName: product.productName,
      category: product.category,
      brand: product.brand,
      unit: product.unit,
      availableStock: product.availableStock,
      openingStock: product.openingStock,
      stockIn: product.stockIn,
      stockOut: product.stockOut,
      reorderLevel: product.reorderLevel,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      supplier: product.supplier,
      warehouse: product.warehouse,
      status: product.status,
      image: product.image || null,
      inStock: (product.availableStock || 0) > 0,
      lastUpdated: product.updatedAt || product.createdAt,
    };
  },
});
