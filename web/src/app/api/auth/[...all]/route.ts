import { handleAuthRequest } from "@javis-market/api";

// Rutas de Better Auth (inicio/cierre de sesión del panel). Delegan en el módulo `access`.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleAuthRequest(request);
}

export function POST(request: Request) {
  return handleAuthRequest(request);
}
