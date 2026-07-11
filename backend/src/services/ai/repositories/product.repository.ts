import mongoose from "mongoose";
import { collections } from "../../../lib/db/collections.js";

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  specifications: Record<string, string>;
  images: string[];
  tags: string[];
  status: "active" | "inactive" | "out_of_stock";
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  relevanceScores: Map<string, number>;
}

export class ProductRepository {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private getCollection() {
    return mongoose.connection.db!.collection(collections.products);
  }

  async searchProducts(
    query: string,
    options: {
      limit?: number;
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      inStockOnly?: boolean;
      sortBy?: "relevance" | "price_asc" | "price_desc" | "newest";
    } = {}
  ): Promise<ProductSearchResult> {
    const { limit = 5, category, brand, minPrice, maxPrice, inStockOnly = true, sortBy = "relevance" } = options;

    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const searchQuery: any = {
      status: "active",
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } },
        { sku: { $regex: query, $options: "i" } },
      ],
    };

    if (category) searchQuery.category = { $regex: category, $options: "i" };
    if (brand) searchQuery.brand = { $regex: brand, $options: "i" };
    if (minPrice !== undefined) searchQuery.price = { ...searchQuery.price, $gte: minPrice };
    if (maxPrice !== undefined) searchQuery.price = { ...searchQuery.price, $lte: maxPrice };
    if (inStockOnly) searchQuery.stock = { $gt: 0 };

    let sort: any = {};
    switch (sortBy) {
      case "price_asc": sort = { price: 1 }; break;
      case "price_desc": sort = { price: -1 }; break;
      case "newest": sort = { createdAt: -1 }; break;
      default: sort = { stock: -1, price: 1 };
    }

    const collection = this.getCollection();
    const [products, total] = await Promise.all([
      collection.find(searchQuery).sort(sort).limit(limit).toArray(),
      collection.countDocuments(searchQuery),
    ]);

    const result: ProductSearchResult = {
      products: products as unknown as Product[],
      total,
      relevanceScores: new Map(),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getProductById(productId: string): Promise<Product | null> {
    const cacheKey = `product:${productId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const product = await this.getCollection().findOne({ id: productId });
    if (product) {
      this.setCache(cacheKey, product);
    }
    return product as unknown as Product | null;
  }

  async checkStock(productId: string, quantity: number): Promise<{ available: boolean; currentStock: number }> {
    const product = await this.getProductById(productId);
    if (!product) {
      return { available: false, currentStock: 0 };
    }
    return {
      available: product.stock >= quantity,
      currentStock: product.stock,
    };
  }

  async getProductsByCategory(category: string, limit: number = 10): Promise<Product[]> {
    const cacheKey = `category:${category}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const products = await this.getCollection()
      .find({ category: { $regex: category, $options: "i" }, status: "active", stock: { $gt: 0 } })
      .limit(limit)
      .toArray();

    this.setCache(cacheKey, products);
    return products as unknown as Product[];
  }

  async getAlternatives(productId: string, limit: number = 3): Promise<Product[]> {
    const product = await this.getProductById(productId);
    if (!product) return [];

    const alternatives = await this.getCollection()
      .find({
        category: product.category,
        status: "active",
        stock: { $gt: 0 },
      })
      .sort({ price: 1 })
      .limit(limit)
      .toArray();

    return alternatives as unknown as Product[];
  }

  async getRecommendations(
    criteria: { category?: string; maxPrice?: number; features?: string[] },
    limit: number = 5
  ): Promise<Product[]> {
    const query: any = { status: "active", stock: { $gt: 0 } };

    if (criteria.category) query.category = { $regex: criteria.category, $options: "i" };
    if (criteria.maxPrice) query.price = { $lte: criteria.maxPrice };
    if (criteria.features && criteria.features.length > 0) {
      query.tags = { $in: criteria.features.map((f) => new RegExp(f, "i")) };
    }

    const products = await this.getCollection()
      .find(query)
      .sort({ stock: -1, price: 1 })
      .limit(limit)
      .toArray();

    return products as unknown as Product[];
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, expiry: Date.now() + this.cacheTTL });
  }

  clearCache(): void {
    this.cache.clear();
  }
}
