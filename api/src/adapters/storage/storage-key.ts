/**
 * Claves de almacenamiento: siempre generadas por el servidor, relativas y sin `..`.
 * Ejemplo: `products/0192f…/0192f….webp`.
 */
const STORAGE_KEY = /^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)*\.[a-z0-9]{2,5}$/;

export function isValidStorageKey(key: string): boolean {
  return key.length <= 200 && STORAGE_KEY.test(key);
}

export function assertValidStorageKey(key: string): void {
  if (!isValidStorageKey(key)) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}
