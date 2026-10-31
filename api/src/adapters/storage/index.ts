import { optionalEnv, resolveConfiguredPath } from "../../config/env";
import type { FileStorage } from "./file-storage";
import { LocalFileStorage } from "./local-file-storage";

export type { FileStorage, StorageVisibility } from "./file-storage";
export { isValidStorageKey } from "./storage-key";

let storage: FileStorage | undefined;

/**
 * Almacenamiento configurado por entorno. En desarrollo, rutas relativas a la raíz del repositorio
 * (`./storage/...`, ignorado en git); en producción, rutas absolutas fuera del repositorio.
 */
export function getFileStorage(): FileStorage {
  storage ??= new LocalFileStorage(
    {
      public: resolveConfiguredPath(optionalEnv("STORAGE_PUBLIC_DIR") ?? "./storage/public"),
      private: resolveConfiguredPath(optionalEnv("STORAGE_PRIVATE_DIR") ?? "./storage/private"),
    },
    optionalEnv("PUBLIC_MEDIA_BASE_URL") ?? "/media",
  );
  return storage;
}
