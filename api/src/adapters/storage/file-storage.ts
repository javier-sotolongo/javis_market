/**
 * Contrato del almacenamiento de archivos.
 *
 * - `public`: imágenes de producto servidas por Nginx (STORAGE_PUBLIC_DIR) en `/media/`.
 * - `private`: documentos que nunca se publican; solo se entregan a través de la aplicación
 *   tras comprobar permisos (STORAGE_PRIVATE_DIR).
 *
 * Ver docs/security.md.
 */
export type StorageVisibility = "public" | "private";

export interface FileStorage {
  /** Guarda el contenido bajo una clave generada por el servidor (nunca el nombre original del usuario). */
  put(input: {
    readonly visibility: StorageVisibility;
    readonly key: string;
    readonly contentType: string;
    readonly body: Uint8Array;
  }): Promise<void>;

  /** Devuelve el contenido o `null` si no existe. */
  read(input: { readonly visibility: StorageVisibility; readonly key: string }): Promise<Uint8Array | null>;

  /** Borra el archivo; no falla si ya no existe. */
  delete(input: { readonly visibility: StorageVisibility; readonly key: string }): Promise<void>;

  /** URL pública; solo existe para archivos `public`. */
  publicUrl(key: string): string;
}
