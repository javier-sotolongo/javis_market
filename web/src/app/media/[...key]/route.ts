import { getFileStorage, isValidStorageKey } from "@javis-market/api";

/**
 * Imágenes públicas del almacenamiento. En producción Nginx sirve /media/ directamente desde STORAGE_PUBLIC_DIR
 * y esta ruta no se alcanza; existe para desarrollo y como respaldo. Nunca sirve el almacenamiento privado.
 */
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
  gif: "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const contentType = CONTENT_TYPES[key.split(".").pop() ?? ""];
  if (!contentType || !isValidStorageKey(key)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await getFileStorage().read({ visibility: "public", key });
  if (!body) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
