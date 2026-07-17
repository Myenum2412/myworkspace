import { logger } from "../../logger/index.js";
import { domainEvents } from "../../events/index.js";

export type ProcessingStage = "virus-scan" | "thumbnail" | "metadata" | "ocr" | "preview" | "ai-analysis";

export interface FileProcessingJob {
  fileId: string;
  orgId: string;
  storagePath: string;
  mimeType: string;
  size: number;
  stages: ProcessingStage[];
}

export class FileProcessingPipeline {
  async enqueue(job: FileProcessingJob): Promise<void> {
    logger.info({ fileId: job.fileId, stages: job.stages }, "Enqueuing file processing");

    for (const stage of job.stages) {
      try {
        await this.runStage(stage, job);
      } catch (err) {
        logger.error({ err, fileId: job.fileId, stage }, `Processing stage ${stage} failed`);
        domainEvents.emit("file:processing-failed" as any, { fileId: job.fileId, stage, error: String(err) });
      }
    }

    domainEvents.emit("file:processing-complete" as any, { fileId: job.fileId });
  }

  private async runStage(stage: ProcessingStage, job: FileProcessingJob): Promise<void> {
    domainEvents.emit("file:processing-started" as any, { fileId: job.fileId, stage });

    switch (stage) {
      case "virus-scan":
        await this.virusScan(job);
        break;
      case "thumbnail":
        await this.generateThumbnail(job);
        break;
      case "metadata":
        await this.extractMetadata(job);
        break;
      case "ocr":
        await this.performOCR(job);
        break;
      case "preview":
        await this.generatePreview(job);
        break;
      case "ai-analysis":
        await this.aiAnalysis(job);
        break;
    }
  }

  private async virusScan(job: FileProcessingJob): Promise<void> {
    logger.info({ fileId: job.fileId }, "Virus scan completed (mock)");
  }

  private async generateThumbnail(job: FileProcessingJob): Promise<void> {
    if (!job.mimeType.startsWith("image/")) return;
    logger.info({ fileId: job.fileId }, "Thumbnail generated (mock)");
  }

  private async extractMetadata(job: FileProcessingJob): Promise<void> {
    logger.info({ fileId: job.fileId, mimeType: job.mimeType, size: job.size }, "Metadata extracted");
  }

  private async performOCR(job: FileProcessingJob): Promise<void> {
    if (job.mimeType !== "application/pdf" && !job.mimeType.startsWith("image/")) return;
    logger.info({ fileId: job.fileId }, "OCR queued (mock)");
  }

  private async generatePreview(job: FileProcessingJob): Promise<void> {
    logger.info({ fileId: job.fileId, mimeType: job.mimeType }, "Preview generation queued");
  }

  private async aiAnalysis(job: FileProcessingJob): Promise<void> {
    domainEvents.emit("file:ai-analysis-requested" as any, {
      fileId: job.fileId,
      orgId: job.orgId,
      storagePath: job.storagePath,
      mimeType: job.mimeType,
    });
  }
}
