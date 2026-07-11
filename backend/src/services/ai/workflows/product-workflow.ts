import { ProductRepository, type Product } from "../repositories/product.repository.js";
import type { ExtractedEntities } from "../entities/entity-extractor.js";
import { AIProviderFactory } from "../providers/ai-provider.factory.js";
import type { AIMessage } from "../providers/ai-provider.interface.js";

export class ProductWorkflow {
  private productRepo: ProductRepository;

  constructor() {
    this.productRepo = new ProductRepository();
  }

  async handleProductInquiry(
    message: string,
    entities: ExtractedEntities,
    language: string
  ): Promise<string> {
    const searchQuery = this.buildSearchQuery(entities);

    const results = await this.productRepo.searchProducts(searchQuery, {
      limit: 5,
      category: entities.categories[0],
      brand: entities.brands[0],
      maxPrice: entities.prices[0],
      inStockOnly: true,
    });

    if (results.products.length === 0) {
      // Try to find alternatives
      const alternatives = await this.findAlternatives(entities);
      if (alternatives.length > 0) {
        return this.formatAlternatives(alternatives, language);
      }
      return this.getNoResultsMessage(language);
    }

    return this.formatProductResults(results.products, language);
  }

  async handlePriceCheck(
    entities: ExtractedEntities,
    language: string
  ): Promise<string> {
    if (entities.productNames.length === 0) {
      return "Please specify which product you'd like to check the price for.";
    }

    const searchQuery = entities.productNames.join(" ");
    const results = await this.productRepo.searchProducts(searchQuery, {
      limit: 3,
      inStockOnly: false,
    });

    if (results.products.length === 0) {
      return "I couldn't find that product in our catalog. Could you provide more details?";
    }

    return this.formatPriceInfo(results.products, language);
  }

  async handleStockCheck(
    entities: ExtractedEntities,
    language: string
  ): Promise<string> {
    if (entities.productNames.length === 0) {
      return "Please specify which product you'd like to check availability for.";
    }

    const searchQuery = entities.productNames.join(" ");
    const results = await this.productRepo.searchProducts(searchQuery, {
      limit: 3,
      inStockOnly: false,
    });

    if (results.products.length === 0) {
      return "I couldn't find that product. Could you provide more details?";
    }

    return this.formatStockInfo(results.products, entities.quantities[0] || 1, language);
  }

  async handleRecommendation(
    message: string,
    entities: ExtractedEntities,
    language: string
  ): Promise<string> {
    const recommendations = await this.productRepo.getRecommendations({
      category: entities.categories[0],
      maxPrice: entities.prices[0],
      features: entities.specifications ? Object.values(entities.specifications) : [],
    });

    if (recommendations.length === 0) {
      return "I don't have any specific recommendations at the moment. Could you tell me more about what you're looking for?";
    }

    return this.formatRecommendations(recommendations, language);
  }

  private buildSearchQuery(entities: ExtractedEntities): string {
    const parts: string[] = [];
    if (entities.productNames.length > 0) parts.push(entities.productNames[0]);
    if (entities.categories.length > 0) parts.push(entities.categories[0]);
    if (entities.brands.length > 0) parts.push(entities.brands[0]);
    return parts.join(" ") || "products";
  }

  private async findAlternatives(entities: ExtractedEntities): Promise<Product[]> {
    // Try to find products in the same category
    if (entities.categories.length > 0) {
      return this.productRepo.getProductsByCategory(entities.categories[0], 3);
    }
    return [];
  }

  private formatProductResults(products: Product[], language: string): string {
    if (products.length === 1) {
      const p = products[0];
      return [
        `*${p.name}*`,
        ``,
        `${p.description}`,
        ``,
        `💰 Price: ₹${p.price.toLocaleString()}`,
        `📦 Stock: ${p.stock > 0 ? `${p.stock} units available` : "Out of stock"}`,
        `🏷️ Category: ${p.category}`,
        p.brand ? `🏢 Brand: ${p.brand}` : "",
        ``,
        `Would you like to know more about this product or check availability?`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    let response = `*Found ${products.length} products:*\n\n`;
    products.forEach((p, i) => {
      response += `${i + 1}. *${p.name}* - ₹${p.price.toLocaleString()}\n`;
      response += `   ${p.stock > 0 ? `✅ In Stock (${p.stock})` : "❌ Out of Stock"}\n\n`;
    });
    response += `Would you like details on any of these products?`;
    return response;
  }

  private formatPriceInfo(products: Product[], language: string): string {
    let response = "*Price Information:*\n\n";
    products.forEach((p) => {
      response += `*${p.name}*\n`;
      response += `💰 Price: ₹${p.price.toLocaleString()}\n`;
      if (p.compareAtPrice && p.compareAtPrice > p.price) {
        response += `📉 ~~₹${p.compareAtPrice.toLocaleString()}~~ (Save ${Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)}%)\n`;
      }
      response += `\n`;
    });
    return response;
  }

  private formatStockInfo(products: Product[], requestedQty: number, language: string): string {
    let response = "*Stock Availability:*\n\n";
    products.forEach((p) => {
      response += `*${p.name}*\n`;
      if (p.stock === 0) {
        response += `❌ Out of Stock\n`;
      } else if (p.stock < requestedQty) {
        response += `⚠️ Only ${p.stock} units available (you requested ${requestedQty})\n`;
      } else {
        response += `✅ ${p.stock} units available\n`;
      }
      response += `\n`;
    });
    return response;
  }

  private formatRecommendations(products: Product[], language: string): string {
    let response = "*Here are some recommendations:*\n\n";
    products.forEach((p, i) => {
      response += `${i + 1}. *${p.name}*\n`;
      response += `   💰 ₹${p.price.toLocaleString()} | 📦 ${p.stock > 0 ? "In Stock" : "Out of Stock"}\n\n`;
    });
    response += `Would you like more details on any of these?`;
    return response;
  }

  private formatAlternatives(products: Product[], language: string): string {
    let response = `The specific product you're looking for isn't available, but here are some alternatives:\n\n`;
    products.forEach((p, i) => {
      response += `${i + 1}. *${p.name}* - ₹${p.price.toLocaleString()}\n`;
      response += `   ${p.stock > 0 ? "✅ In Stock" : "❌ Out of Stock"}\n\n`;
    });
    response += `Would you like details on any of these?`;
    return response;
  }

  private getNoResultsMessage(language: string): string {
    return "I couldn't find any products matching your request. Could you provide more details or try a different search term?";
  }
}
