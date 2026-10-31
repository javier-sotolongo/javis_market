import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorage, StorageVisibility } from "./file-storage";
import { assertValidStorageKey } from "./storage-key";

/** Almacenamiento en el disco del VPS (directorios persistentes fuera del repositorio). */
export class LocalFileStorage implements FileStorage {
  constructor(
    private readonly roots: Readonly<Record<StorageVisibility, string>>,
    private readonly publicBaseUrl: string,
  ) {}

  private resolve(visibility: StorageVisibility, key: string): string {
    assertValidStorageKey(key);
    const root = path.resolve(this.roots[visibility]);
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) {
      throw new Error("Storage key escapes the storage root");
    }
    return target;
  }

  async put({ visibility, key, body }: Parameters<FileStorage["put"]>[0]): Promise<void> {
    const target = this.resolve(visibility, key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o750 });
    // Escritura atómica: un lector nunca ve un archivo a medio escribir.
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, body, { mode: 0o640, flag: "wx" });
    await rename(temporary, target);
  }

  async read({ visibility, key }: Parameters<FileStorage["read"]>[0]): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(visibility, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete({ visibility, key }: Parameters<FileStorage["delete"]>[0]): Promise<void> {
    await rm(this.resolve(visibility, key), { force: true });
  }

  publicUrl(key: string): string {
    assertValidStorageKey(key);
    return `${this.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }
}
