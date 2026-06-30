import { EventEmitter } from "events";
import { logger } from "../logger/index.js";

export type DomainEventType =
  | "upload:started"
  | "upload:chunk-received"
  | "upload:paused"
  | "upload:resumed"
  | "upload:completed"
  | "upload:failed"
  | "file:metadata-saved"
  | "file:thumbnail-generated"
  | "file:access-granted"
  | "file:access-revoked"
  | "file:deleted"
  | "file:restored"
  | "file:processing-completed"
  | "permission:changed"
  | "notification:sent";

export interface DomainEventPayload {
  "upload:started": { uploadId: string; orgId: string; userId: string; fileName: string; fileSize: number; mimeType: string };
  "upload:chunk-received": { uploadId: string; orgId: string; chunkIndex: number; bytesReceived: number; totalBytes: number };
  "upload:paused": { uploadId: string; orgId: string; userId: string; bytesReceived: number };
  "upload:resumed": { uploadId: string; orgId: string; userId: string; bytesReceived: number };
  "upload:completed": { uploadId: string; fileId: string; orgId: string; userId: string; fileName: string; fileSize: number; storagePath: string };
  "upload:failed": { uploadId: string; orgId: string; userId: string; error: string; retryCount: number };
  "file:metadata-saved": { fileId: string; orgId: string; uploadId: string };
  "file:thumbnail-generated": { fileId: string; orgId: string; thumbnailPath: string };
  "file:access-granted": { fileId: string; orgId: string; userId: string; permission: string };
  "file:access-revoked": { fileId: string; orgId: string; userId: string; permission: string };
  "file:deleted": { fileId: string; orgId: string; userId: string };
  "file:restored": { fileId: string; orgId: string; userId: string };
  "file:processing-completed": { fileId: string; orgId: string; processingType: string };
  "permission:changed": { fileId: string; orgId: string; userId: string; role: string; permission: string; granted: boolean };
  "notification:sent": { userId: string; orgId: string; type: string; title: string; message: string };
}

type DomainEventCallback<T extends DomainEventType> = (payload: DomainEventPayload[T]) => void;

class DomainEventBus extends EventEmitter {
  private static instance: DomainEventBus;

  static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
      DomainEventBus.instance.setMaxListeners(100);
    }
    return DomainEventBus.instance;
  }

  emit<T extends DomainEventType>(type: T, payload: DomainEventPayload[T]): boolean {
    logger.debug({ eventType: type, payload }, "Domain event emitted");
    return super.emit(type, payload);
  }

  on<T extends DomainEventType>(type: T, callback: DomainEventCallback<T>): this {
    return super.on(type, callback as (...args: unknown[]) => void);
  }

  off<T extends DomainEventType>(type: T, callback: DomainEventCallback<T>): this {
    return super.off(type, callback as (...args: unknown[]) => void);
  }

  once<T extends DomainEventType>(type: T, callback: DomainEventCallback<T>): this {
    return super.once(type, callback as (...args: unknown[]) => void);
  }
}

export const domainEvents = DomainEventBus.getInstance();
