import { getAIProvider } from "../ai/ai-factory.js";
import { getFileBuffer } from "../../lib/storage/index.js";
import { LrmChunk } from "../../lib/db/models/LrmChunk.js";
import { LrmMemory } from "../../lib/db/models/LrmMemory.js";
import { LrmEntity } from "../../lib/db/models/LrmEntity.js";
import { LrmRelationship } from "../../lib/db/models/LrmRelationship.js";
import { FileAttachment } from "../../lib/db/models/FileAttachment.js";
import { logger } from "../../lib/logger/index.js";
import { v4 as uuid } from "uuid";

export class FileIntelligenceService {
  async analyzeFile(fileId: string, orgId: string): Promise<{
    summary: string;
    categories: string[];
    tags: string[];
    entities: { name: string; type: string }[];
    suggestedFolder: string;
    containsSensitive: boolean;
    language: string;
  }> {
    const file = await FileAttachment.findOne({ id: fileId, orgId }).lean();
    if (!file) throw new Error("File not found");

    const buffer = await getFileBuffer(file.storagePath);
    if (!buffer || buffer.length === 0) {
      return this.basicAnalysis(file);
    }

    const textContent = buffer.toString("utf-8").substring(0, 10000);

    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: `Analyze this file and return a JSON object with:
- summary (2-3 sentences)
- categories (array of categories this file belongs to)
- tags (array of relevant tags)
- entities (array of {name, type} for people, projects, clients, etc. found in the content)
- suggestedFolder (recommended folder name like "Contracts", "Invoices", "Reports", "Designs", etc.)
- containsSensitive (boolean - does it contain sensitive data like PII, credentials, financial info?)
- language (detected language code)`,
          },
          {
            role: "user",
            content: `File: ${file.originalName}\nType: ${file.mimeType}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\nContent:\n${textContent}`,
          },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.1,
          maxTokens: 800,
          responseLength: "medium",
          systemPrompt: "You are a file analysis AI.",
          streamingEnabled: false,
        },
      });

      return this.parseAnalysis(response.content, file);
    } catch (err) {
      logger.warn({ err, fileId }, "AI file analysis failed, using fallback");
      return this.basicAnalysis(file);
    }
  }

  async generateEmbeddings(fileId: string, orgId: string): Promise<void> {
    const file = await FileAttachment.findOne({ id: fileId, orgId }).lean();
    if (!file) return;

    const buffer = await getFileBuffer(file.storagePath);
    if (!buffer || buffer.length === 0) return;

    const text = `File: ${file.originalName}\nType: ${file.mimeType}\nContent: ${buffer.toString("utf-8").substring(0, 5000)}`;
    
    // Index in LRM RAG
    try {
      const { LRMService } = await import("./lrm.service.js");
      const lrm = new LRMService();
      await lrm.rag.indexDocument(text, `file:${fileId}`, orgId);
    } catch (err) {
      logger.warn({ err, fileId }, "Failed to index file in RAG");
    }

    // Store file as entity in knowledge graph
    try {
      await LrmEntity.findOneAndUpdate(
        { id: `file:${fileId}` },
        { $setOnInsert: { id: `file:${fileId}`, type: "file", name: file.originalName, orgId, metadata: { mimeType: file.mimeType, size: file.size, fileId }, createdAt: new Date() } },
        { upsert: true }
      );
    } catch {}
  }

  async semanticSearch(query: string, orgId: string, limit = 10): Promise<{ fileId: string; name: string; score: number; snippet: string }[]> {
    try {
      const lrmModule = await import("./lrm.service.js");
      const lrm = new lrmModule.LRMService();
      const results = await lrm.rag.search(query, orgId, limit);
      
      const fileResults: { fileId: string; name: string; score: number; snippet: string }[] = [];
      for (const r of results) {
        const sourceMatch = r.source.match(/file:(.+)/);
        if (sourceMatch) {
          const file = await FileAttachment.findOne({ id: sourceMatch[1], orgId }).lean();
          if (file) {
            fileResults.push({
              fileId: file.id, name: file.originalName,
              score: r.score, snippet: r.content.substring(0, 200),
            });
          }
        }
      }
      return fileResults;
    } catch (err) {
      logger.warn({ err }, "Semantic search failed");
      return [];
    }
  }

  async findRelatedFiles(fileId: string, orgId: string, limit = 5): Promise<{ fileId: string; name: string; reason: string; similarity: number }[]> {
    const file = await FileAttachment.findOne({ id: fileId, orgId }).lean();
    if (!file) return [];

    const related: { fileId: string; name: string; reason: string; similarity: number }[] = [];

    // By same uploader
    const sameUploader = await FileAttachment.find({
      orgId, uploaderId: file.uploaderId,
      id: { $ne: fileId }, deletedAt: null,
    }).limit(limit).lean();

    for (const f of sameUploader) {
      related.push({ fileId: f.id, name: f.originalName, reason: "Same uploader", similarity: 0.6 });
    }

    // By same project/client
    if (file.projectId) {
      const sameProject = await FileAttachment.find({
        orgId, projectId: file.projectId,
        id: { $ne: fileId }, deletedAt: null,
      }).limit(limit).lean();
      for (const f of sameProject) {
        related.push({ fileId: f.id, name: f.originalName, reason: "Same project", similarity: 0.8 });
      }
    }

    // By same category
    const sameCategory = await FileAttachment.find({
      orgId, category: file.category,
      id: { $ne: fileId }, deletedAt: null,
    }).limit(limit).lean();

    for (const f of sameCategory) {
      if (!related.some(r => r.fileId === f.id)) {
        related.push({ fileId: f.id, name: f.originalName, reason: "Same category", similarity: 0.4 });
      }
    }

    return related.slice(0, limit);
  }

  async suggestOrganization(orgId: string): Promise<{ folder: string; files: string[]; reason: string }[]> {
    const uncategorized = await FileAttachment.find({
      orgId, folderId: null, deletedAt: null,
    }).limit(50).lean();

    const suggestions: { folder: string; files: string[]; reason: string }[] = [];
    const folderMap = new Map<string, { files: string[]; mimeTypes: Set<string> }>();

    for (const file of uncategorized) {
      const ext = file.originalName.split(".").pop()?.toLowerCase() || "";
      const folder = this.suggestFolderByType(file.mimeType, ext);
      if (!folderMap.has(folder)) {
        folderMap.set(folder, { files: [], mimeTypes: new Set() });
      }
      folderMap.get(folder)!.files.push(file.id);
      folderMap.get(folder)!.mimeTypes.add(file.mimeType);
    }

    for (const [folder, data] of folderMap) {
      if (data.files.length >= 2) {
        suggestions.push({
          folder,
          files: data.files,
          reason: `${data.files.length} files of type ${Array.from(data.mimeTypes).join(", ")}`,
        });
      }
    }

    return suggestions;
  }

  private suggestFolderByType(mimeType: string, ext: string): string {
    const folderMap: Record<string, string> = {
      "application/pdf": "Documents",
      "application/msword": "Documents",
      "application/vnd.openxmlformats-officedocument.wordprocessingml": "Documents",
      "application/vnd.ms-excel": "Spreadsheets",
      "application/vnd.openxmlformats-officedocument.spreadsheetml": "Spreadsheets",
      "image/": "Images",
      "video/": "Videos",
      "audio/": "Audio",
      "application/zip": "Archives",
      "application/x-rar-compressed": "Archives",
    };

    for (const [pattern, folder] of Object.entries(folderMap)) {
      if (mimeType.startsWith(pattern)) return folder;
    }

    const extMap: Record<string, string> = {
      pdf: "Documents", doc: "Documents", docx: "Documents",
      xls: "Spreadsheets", xlsx: "Spreadsheets", csv: "Data",
      jpg: "Images", jpeg: "Images", png: "Images", gif: "Images", svg: "Images", webp: "Images",
      mp4: "Videos", mov: "Videos", avi: "Videos", mkv: "Videos",
      mp3: "Audio", wav: "Audio", flac: "Audio",
      zip: "Archives", rar: "Archives", tar: "Archives", gz: "Archives", "7z": "Archives",
    };

    return extMap[ext] || "General";
  }

  private parseAnalysis(content: string, file: any): {
    summary: string; categories: string[]; tags: string[];
    entities: { name: string; type: string }[];
    suggestedFolder: string; containsSensitive: boolean; language: string;
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}
    return this.basicAnalysis(file);
  }

  private basicAnalysis(file: any): {
    summary: string; categories: string[]; tags: string[];
    entities: { name: string; type: string }[];
    suggestedFolder: string; containsSensitive: boolean; language: string;
  } {
    const ext = file.originalName?.split(".").pop()?.toLowerCase() || "";
    return {
      summary: `${file.originalName || "File"} (${(file.size / 1024).toFixed(1)} KB)`,
      categories: [file.mimeType?.split("/")[0] || "unknown"],
      tags: [ext, file.mimeType?.split("/")[1] || ""].filter(Boolean),
      entities: [],
      suggestedFolder: file.mimeType?.startsWith("image/") ? "Images" : "General",
      containsSensitive: false,
      language: "en",
    };
  }
}
