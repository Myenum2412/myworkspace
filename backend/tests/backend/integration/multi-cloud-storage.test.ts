import fs from "fs/promises";
import path from "path";
import { LocalStorageProvider } from "../../../src/lib/storage/providers.js";

interface IStorageProvider {
  save(buffer: Buffer, key: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

const testDir = path.resolve(process.cwd(), "data", "uploads-test-cloud");

class GcsMockProvider implements IStorageProvider {
  private store = new Map<string, Buffer>();

  async save(buffer: Buffer, key: string): Promise<void> {
    this.store.set(key, buffer);
  }
  async get(key: string): Promise<Buffer | null> {
    return this.store.get(key) ?? null;
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
  getUrl(key: string): string {
    return `https://storage.googleapis.com/test-bucket/${key}`;
  }
}

class AzureBlobMockProvider implements IStorageProvider {
  private store = new Map<string, Buffer>();

  async save(buffer: Buffer, key: string): Promise<void> {
    this.store.set(key, buffer);
  }
  async get(key: string): Promise<Buffer | null> {
    return this.store.get(key) ?? null;
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
  getUrl(key: string): string {
    return `https://test.blob.core.windows.net/test-container/${key}`;
  }
}

const testBuffer = Buffer.from("Test multi-cloud content");
const testKey = `test-file-${Date.now()}.txt`;

function runProviderTests(providerName: string, provider: IStorageProvider) {
  describe(`${providerName} storage provider`, () => {
    afterEach(async () => {
      try {
        await provider.delete(testKey);
      } catch {}
    });

    it("saves and retrieves a file", async () => {
      await provider.save(testBuffer, testKey);
      const retrieved = await provider.get(testKey);
      expect(retrieved).toEqual(testBuffer);
    });

    it("returns null for non-existent file", async () => {
      const result = await provider.get("nonexistent-key");
      expect(result).toBeNull();
    });

    it("deletes an existing file", async () => {
      await provider.save(testBuffer, testKey);
      await provider.delete(testKey);
      expect(await provider.get(testKey)).toBeNull();
    });

    it("does not throw on deleting non-existent file", async () => {
      await expect(provider.delete("nonexistent-key")).resolves.not.toThrow();
    });

    it("checks file existence", async () => {
      expect(await provider.exists(testKey)).toBe(false);
      await provider.save(testBuffer, testKey);
      expect(await provider.exists(testKey)).toBe(true);
    });

    it("returns a URL", () => {
      const url = provider.getUrl(testKey);
      expect(url).toContain(testKey);
    });

    it("handles empty buffer", async () => {
      await provider.save(Buffer.from([]), "empty-file");
      const retrieved = await provider.get("empty-file");
      expect(retrieved).toEqual(Buffer.from([]));
      await provider.delete("empty-file");
    });

    it("handles large buffer", async () => {
      const large = Buffer.alloc(5 * 1024 * 1024, "A");
      await provider.save(large, "large-file");
      const retrieved = await provider.get("large-file");
      expect(retrieved).toEqual(large);
      expect(retrieved!.length).toBe(5 * 1024 * 1024);
      await provider.delete("large-file");
    });

    it("overwrites existing key", async () => {
      await provider.save(Buffer.from("old"), testKey);
      await provider.save(Buffer.from("new"), testKey);
      const retrieved = await provider.get(testKey);
      expect(retrieved!.toString()).toBe("new");
    });

    it("handles multiple concurrent saves", async () => {
      const buffers = [Buffer.from("a"), Buffer.from("b"), Buffer.from("c")];
      await Promise.all(buffers.map((b, i) => provider.save(b, `concurrent-${i}`)));
      for (let i = 0; i < buffers.length; i++) {
        const retrieved = await provider.get(`concurrent-${i}`);
        expect(retrieved).toEqual(buffers[i]);
      }
      await Promise.all(buffers.map((_, i) => provider.delete(`concurrent-${i}`)));
    });
  });
}

runProviderTests("Local FS", new LocalStorageProvider());
runProviderTests("GCS mock", new GcsMockProvider());
runProviderTests("Azure Blob mock", new AzureBlobMockProvider());
