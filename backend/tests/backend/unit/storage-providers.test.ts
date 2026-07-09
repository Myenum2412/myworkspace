import fs from "fs/promises";
import path from "path";

// Replicate the LocalStorageProvider logic from providers.ts for testing
class TestLocalStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private fullPath(key: string): string {
    const clean = key.replace(/\0/g, "");
    const resolved = path.resolve(this.baseDir, clean);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`Path traversal detected: ${key}`);
    }
    return resolved;
  }

  async save(buffer: Buffer, key: string): Promise<void> {
    const fp = this.fullPath(key);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, buffer);
  }

  async get(key: string): Promise<Buffer | null> {
    const fp = this.fullPath(key);
    try {
      return await fs.readFile(fp);
    } catch (err: any) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const fp = this.fullPath(key);
    try {
      await fs.unlink(fp);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.fullPath(key));
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

const testDir = path.resolve(process.cwd(), "data", "uploads-test-unit");
const provider = new TestLocalStorage(testDir);
const testKey = "unit-test-file.txt";
const testContent = Buffer.from("Hello Storage Provider Test");

beforeAll(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

beforeEach(async () => {
  try {
    await provider.delete(testKey);
  } catch {}
});

describe("LocalStorageProvider", () => {
  it("saves and retrieves a file", async () => {
    await provider.save(testContent, testKey);
    const retrieved = await provider.get(testKey);
    expect(retrieved).toEqual(testContent);
  });

  it("returns null for non-existent file", async () => {
    const result = await provider.get("nonexistent-file-xyz.dat");
    expect(result).toBeNull();
  });

  it("deletes an existing file", async () => {
    await provider.save(testContent, testKey);
    await provider.delete(testKey);
    const result = await provider.get(testKey);
    expect(result).toBeNull();
  });

  it("does not throw on deleting non-existent file", async () => {
    await expect(provider.delete("nonexistent-file-xyz.dat")).resolves.not.toThrow();
  });

  it("checks file existence", async () => {
    expect(await provider.exists(testKey)).toBe(false);
    await provider.save(testContent, testKey);
    expect(await provider.exists(testKey)).toBe(true);
  });

  it("returns a URL for the file", () => {
    const url = provider.getUrl(testKey);
    expect(url).toBe(`/uploads/${testKey}`);
  });

  it("overwrites existing file on save", async () => {
    await provider.save(Buffer.from("old"), testKey);
    await provider.save(Buffer.from("new"), testKey);
    const retrieved = await provider.get(testKey);
    expect(retrieved!.toString()).toBe("new");
  });
});

describe("LocalStorageProvider path traversal protection", () => {
  it("rejects path with ../", async () => {
    await expect(provider.save(Buffer.from("x"), "../../etc/passwd")).rejects.toThrow(/Path traversal/);
  });

  it("rejects absolute path", async () => {
    await expect(provider.save(Buffer.from("x"), "/etc/passwd")).rejects.toThrow(/Path traversal/);
  });

  it("strips null bytes from path (not a traversal risk after sanitization)", async () => {
    await expect(provider.save(Buffer.from("x"), "safe\0file")).resolves.not.toThrow();
  });

  it("rejects deeply nested traversal", async () => {
    await expect(provider.save(Buffer.from("x"), "a/../../../../etc/passwd")).rejects.toThrow(/Path traversal/);
  });
});
