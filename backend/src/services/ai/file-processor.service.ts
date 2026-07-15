import * as fs from "fs";
import * as path from "path";
import { AppError } from "../../middleware/error.js";

export interface ProcessedFile {
  name: string;
  type: string;
  content: string;
  size: number;
}

export class FileProcessor {
  private supportedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];

  private supportedExtensions = ["pdf", "docx", "xlsx", "csv", "txt", "png", "jpg", "jpeg", "gif", "webp"];

  async processFiles(files: Array<{ name: string; type: string; size: number; url?: string }>): Promise<string[]> {
    const contents: string[] = [];

    for (const file of files) {
      this.validateFile(file);

      if (file.url) {
        const content = await this.processFileByUrl(file);
        contents.push(`**File: ${file.name}**\n\n${content}`);
      }
    }

    return contents;
  }

  private validateFile(file: { name: string; type: string; size: number; url?: string }): void {
    const ext = path.extname(file.name).toLowerCase().replace(".", "");
    if (!this.supportedExtensions.includes(ext)) {
      throw new AppError(400, `Unsupported file type: ${ext}. Supported: ${this.supportedExtensions.join(", ")}`);
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new AppError(400, `File too large: ${file.name}. Maximum size is 50MB.`);
    }
  }

  private async processFileByUrl(file: { name: string; type: string; url?: string }): Promise<string> {
    const ext = path.extname(file.name).toLowerCase().replace(".", "");
    if (!file.url) return `[File: ${file.name} - No URL provided]`;

    try {
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      switch (ext) {
        case "txt":
          return buffer.toString("utf-8");
        case "csv":
          return this.parseCSV(buffer.toString("utf-8"));
        case "pdf":
          return `[PDF Document: ${file.name} - PDF parsing requires pdf-parse package. File size: ${buffer.length} bytes]`;
        case "docx":
          return `[DOCX Document: ${file.name} - DOCX parsing requires mammoth package. File size: ${buffer.length} bytes]`;
        case "xlsx":
          return `[Excel Document: ${file.name} - XLSX parsing requires xlsx package. File size: ${buffer.length} bytes]`;
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "webp":
          return `[Image: ${file.name} - Image analysis available via Gemini Vision. Dimensions and content can be analyzed.]`;
        default:
          return `[File: ${file.name} - Content not directly readable. File size: ${buffer.length} bytes]`;
      }
    } catch (err: any) {
      return `[Error reading ${file.name}: ${err.message}]`;
    }
  }

  private parseCSV(content: string): string {
    const lines = content.split("\n").filter(l => l.trim());
    if (lines.length === 0) return "[Empty CSV]";

    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1, 21).map(line => {
      const values = line.split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });

    let result = `**CSV Data**\n- Rows: ${lines.length - 1}\n- Columns: ${headers.join(", ")}\n\n`;

    if (rows.length > 0) {
      result += "**Sample Data (first 20 rows):**\n";
      for (const row of rows) {
        result += `- ${Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
      }
    }

    return result;
  }

  isFileSupported(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().replace(".", "");
    return this.supportedExtensions.includes(ext);
  }

  getSupportedTypes(): string[] {
    return [...this.supportedExtensions];
  }
}
