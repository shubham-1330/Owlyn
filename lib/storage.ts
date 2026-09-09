import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage behind one interface. The local driver writes under
 * STORAGE_DIR (default ./storage, gitignored). An S3-compatible driver for
 * Cloudflare R2 slots in here when credentials exist; callers never see
 * the difference.
 */

export type StoredFile = { key: string; contentType: string; size: number };

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  exists(key: string): Promise<boolean>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/i;

function assertKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Unsafe storage key: ${key}`);
}

function contentTypeFor(key: string): string {
  if (key.endsWith(".pdf")) return "application/pdf";
  if (key.endsWith(".json")) return "application/json";
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

class LocalStorage implements StorageDriver {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    assertKey(key);
    return path.join(this.root, key);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return { key, contentType, size: body.byteLength };
  }

  async get(key: string) {
    const full = this.resolve(key);
    try {
      const body = await readFile(full);
      return { body, contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  driver ??= new LocalStorage(path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage"));
  return driver;
}
