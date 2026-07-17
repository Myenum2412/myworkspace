import { ChunkedDocument } from "../types.js";
import { v4 as uuid } from "uuid";

interface ChunkOptions {
  maxChunkSize: number;
  overlap: number;
  chunkBy: "paragraph" | "sentence" | "token" | "fixed";
}

export class DocumentChunker {
  private defaultOptions: ChunkOptions = {
    maxChunkSize: 1000,
    overlap: 100,
    chunkBy: "paragraph",
  };

  chunk(content: string, source: string, orgId: string, options?: Partial<ChunkOptions>): Omit<ChunkedDocument, "embedding" | "createdAt">[] {
    const opts = { ...this.defaultOptions, ...options };
    const chunks: Omit<ChunkedDocument, "embedding" | "createdAt">[] = [];
    const documentId = uuid();
    const segments = this.splitContent(content, opts);

    for (let i = 0; i < segments.length; i++) {
      chunks.push({
        id: uuid(),
        documentId,
        orgId,
        content: segments[i],
        metadata: {
          source,
          chunkIndex: i,
          totalChunks: segments.length,
          tokens: this.countTokens(segments[i]),
        },
      });
    }

    return chunks;
  }

  private splitContent(content: string, opts: ChunkOptions): string[] {
    switch (opts.chunkBy) {
      case "paragraph":
        return this.splitByParagraph(content, opts);
      case "sentence":
        return this.splitBySentence(content, opts);
      case "token":
        return this.splitByToken(content, opts);
      default:
        return this.splitByFixed(content, opts);
    }
  }

  private splitByParagraph(content: string, opts: ChunkOptions): string[] {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return this.mergeChunks(paragraphs, opts);
  }

  private splitBySentence(content: string, opts: ChunkOptions): string[] {
    const sentences = content.match(/[^.!?\n]+[.!?]+/g) || [content];
    return this.mergeChunks(sentences, opts);
  }

  private splitByToken(content: string, opts: ChunkOptions): string[] {
    const tokens = content.split(/\s+/);
    const chunks: string[] = [];
    let current: string[] = [];
    let currentLength = 0;

    for (const token of tokens) {
      current.push(token);
      currentLength++;
      if (currentLength >= opts.maxChunkSize) {
        chunks.push(current.join(" "));
        const overlapTokens = current.slice(-Math.floor(opts.overlap / 5));
        current = [...overlapTokens];
        currentLength = overlapTokens.length;
      }
    }

    if (current.length > 0) {
      chunks.push(current.join(" "));
    }

    return chunks;
  }

  private splitByFixed(content: string, opts: ChunkOptions): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + opts.maxChunkSize, content.length);
      chunks.push(content.slice(start, end));
      start = end - opts.overlap;
    }
    return chunks;
  }

  private mergeChunks(segments: string[], opts: ChunkOptions): string[] {
    const chunks: string[] = [];
    let current: string[] = [];
    let currentLength = 0;

    for (const segment of segments) {
      const segTokens = this.countTokens(segment);
      if (currentLength + segTokens > opts.maxChunkSize && current.length > 0) {
        chunks.push(current.join("\n\n"));
        const overlapSegments = this.getOverlap(current, Math.floor(opts.overlap / 20));
        current = [...overlapSegments];
        currentLength = overlapSegments.reduce((s, seg) => s + this.countTokens(seg), 0);
      }
      current.push(segment);
      currentLength += segTokens;
    }

    if (current.length > 0) {
      chunks.push(current.join("\n\n"));
    }

    return chunks;
  }

  private getOverlap(segments: string[], overlapCount: number): string[] {
    return segments.slice(-overlapCount);
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
