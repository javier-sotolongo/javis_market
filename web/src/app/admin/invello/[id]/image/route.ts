import { createLogger, getInvelloProductPreview, isDomainError } from "@javis-market/api";
import { getCurrentAdmin } from "@/lib/server/session";

/**
 * Miniatura de un producto de Invello para el panel. Invello no permite enlazar sus imágenes desde otro dominio,
 * así que el servidor la descarga (con las mismas protecciones que la importación por URL) y la reduce.
 */
export const dynamic = "force-dynamic";

const logger = createLogger("web.invello-image");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  try {
    const index = Number(new URL(request.url).searchParams.get("i") ?? 0);
    if (!Number.isSafeInteger(index) || index < 0) return new Response("Not found", { status: 404 });
    const body = await getInvelloProductPreview(admin, id, index);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (!isDomainError(error)) logger.error("preview failed", { id, error: String(error) });
    return new Response("Not found", { status: 404 });
  }
}
