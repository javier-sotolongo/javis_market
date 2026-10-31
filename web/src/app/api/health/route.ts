import { getHealthStatus } from "@javis-market/api";

// Ruta HTTP delgada: delega en el paquete `api`. Se evalúa en cada petición.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getHealthStatus(), { headers: { "Cache-Control": "no-store" } });
}
